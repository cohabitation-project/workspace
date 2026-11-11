// voiceroom.js — Google Meet-style voice/video room client
// Vanilla JS, ES2020+. Connects via WebSocket to /voiceroom-ws.

(() => {
  'use strict';

  // ── State ──────────────────────────────────────────────────────────────────
  let ws;
  let myPeerId = null;
  let iceServers = [];
  let localStream = null;
  let screenStream = null;
  let isScreenSharing = false;
  let isMicOn = true;
  let isCamOn = true;
  let isChatOpen = false;
  let spotlightPeerId = null;

  // Map<peerId, {pc, stream, member, analyser, analyserData}>
  const peers = new Map();

  // Audio context for voice levels
  let audioCtx = null;
  let localAnalyser = null;
  let localAnalyserData = null;

  // Agent TTS playback queue
  const ttsQueue = [];
  let ttsPlaying = false;

  // MediaRecorder for audio bridge
  let mediaRecorder = null;

  // DOM references — populated in boot()
  const dom = {};

  // ── Helpers ────────────────────────────────────────────────────────────────
  const $ = (sel, ctx = document) => ctx.querySelector(sel);

  function log(...args) {
    console.log('[voiceroom]', ...args);
  }

  // ── WebSocket ──────────────────────────────────────────────────────────────
  function connectWS() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${proto}//${location.host}/voiceroom-ws`, 'commons-voiceroom');
    ws.binaryType = 'arraybuffer';

    ws.addEventListener('open', () => log('WS connected'));
    ws.addEventListener('close', () => {
      log('WS closed');
      addSystemMessage('Disconnected from room.');
    });
    ws.addEventListener('error', (e) => log('WS error', e));
    ws.addEventListener('message', onWSMessage);
  }

  function sendJSON(obj) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(obj));
    }
  }

  function sendBinary(data) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }

  // ── Message Handling ───────────────────────────────────────────────────────
  function onWSMessage(event) {
    if (event.data instanceof ArrayBuffer) {
      handleBinaryMessage(event.data);
      return;
    }

    let msg;
    try { msg = JSON.parse(event.data); }
    catch { return log('Bad JSON from WS'); }

    switch (msg.type) {
      case 'hello':         handleHello(msg);   break;
      case 'peer-joined':   handlePeerJoined(msg); break;
      case 'peer-left':     handlePeerLeft(msg);   break;
      case 'offer':         handleOffer(msg);      break;
      case 'answer':        handleAnswer(msg);     break;
      case 'ice-candidate': handleIceCandidate(msg); break;
      case 'chat':          if (String(msg.from) === String(myPeerId)) break; // our own words: already shown as "You"
                            if (msg.badge === 'system') addSystemMessage(msg.text); else addChatMessage((msg.name || msg.from) + (msg.model ? ` · ${msg.model}` : ''), msg.text, msg.badge && msg.badge !== 'human' ? 'agent' : 'chat'); if (msg.badge !== 'human') refreshInvitePanel(); break;
      case 'transcript':    addChatMessage(msg.name || msg.from || msg.peerId, msg.text, 'transcript'); break;
      case 'agent-speaking': animateAgentTile(msg.peerId, true); break;
      default:              log('Unknown message type:', msg.type);
    }
  }

  function handleBinaryMessage(buffer) {
    const view = new Uint8Array(buffer);
    if (view.length < 1) return;
    if (view[0] === 0xBB && view.length >= 37) {
      const peerId = new TextDecoder().decode(view.slice(1, 37));
      const audioData = view.slice(37);
      enqueueTTS(peerId, audioData);
    }
  }

  // ── Hello (init) ───────────────────────────────────────────────────────────
  // The server sends FLAT participant records ({peerId, name, badge}) and the key
  // `peerId` for self — normalize here so tiles get real names (fixes "Unknown").
  function asMember(x) {
    if (!x || (!x.name && !x.member)) return null;
    const src = x.member || x;
    return {
      name: src.name,
      badge: src.badge,
      glyph: src.glyph,
      memberId: src.memberId || null,
      face: typeof src.face === 'string' && /^\/images\/img_[A-Za-z0-9_-]+$/.test(src.face) ? src.face : null,
      via: src.via || null,
      isAgent: src.isAgent === true || (src.badge && src.badge !== 'human'),
    };
  }

  let selfMember = null;

  async function handleHello(msg) {
    myPeerId = String(msg.myPeerId ?? msg.peerId ?? '');
    iceServers = msg.iceServers || [];
    log('Hello, I am', myPeerId);
    document.getElementById('live-status').textContent = 'Connected · Member meeting';

    // Render initial participants (self is in the list too — keep it for the self tile)
    if (msg.participants) {
      for (const p of msg.participants) {
        const m = asMember(p);
        if (String(p.peerId) === myPeerId) { selfMember = m; continue; }
        createTile(p.peerId, m);
      }
    }

    // Get local media
    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        isCamOn = false;
        updateCamButton();
      } catch {
        log('No media available');
        localStream = new MediaStream();
      }
    }

    // Create self tile
    createTile(myPeerId, asMember(msg.myMember) || selfMember || { name: 'You' }, true);
    const selfVideo = $(`#tile-${CSS.escape(myPeerId)} video`);
    if (selfVideo) {
      selfVideo.srcObject = localStream;
      selfVideo.muted = true;
    }

    setupLocalAnalyser();
    startAudioBridge();

    // Initiate WebRTC with existing human peers
    if (msg.participants) {
      for (const p of msg.participants) {
        const m = asMember(p);
        if (!m?.isAgent && String(p.peerId) !== myPeerId && Number(p.peerId) > Number(myPeerId)) {
          await initiateConnection(p.peerId);
        }
      }
    }

    updateGridLayout();
    refreshParticipantRoster();
    document.getElementById('live-status').textContent = 'Meeting connected';
  }

  // ── Peer Joined / Left ────────────────────────────────────────────────────
  async function handlePeerJoined(msg) {
    const { peerId } = msg;
    const member = asMember(msg); // server sends flat {peerId, name, badge}
    log('Peer joined:', peerId, member?.name);
    createTile(peerId, member);
    if (!msg.virtual) addSystemMessage(`${member?.name || peerId} joined the room.`); // agents: the server says how they joined
    refreshParticipantRoster(); refreshInvitePanel();

    if (!member?.isAgent && String(peerId) !== myPeerId && Number(peerId) > Number(myPeerId)) {
      await initiateConnection(peerId);
    }
    updateGridLayout();
  }

  function handlePeerLeft(msg) {
    const { peerId } = msg;
    const peer = peers.get(peerId);
    if (peer) { peer.pc?.close(); peers.delete(peerId); }

    const tile = document.getElementById(`tile-${peerId}`);
    if (tile) {
      if (!tile.dataset.via) addSystemMessage(`${tile.dataset.name || peerId} left the room.`);
      refreshInvitePanel();
      tile.remove();
    }
    if (spotlightPeerId === peerId) spotlightPeerId = null;
    updateGridLayout();
    refreshParticipantRoster();
  }

  // ── WebRTC ─────────────────────────────────────────────────────────────────
  function createPeerConnection(remotePeerId) {
    const config = {
      iceServers: iceServers.length
        ? iceServers
        : [{ urls: 'stun:stun.l.google.com:19302' }],
    };
    const pc = new RTCPeerConnection(config);

    if (localStream) {
      for (const track of localStream.getTracks()) {
        pc.addTrack(track, localStream);
      }
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendJSON({ type: 'ice-candidate', to: remotePeerId, candidate: e.candidate });
      }
    };

    const remoteStream = new MediaStream();
    pc.ontrack = (e) => {
      remoteStream.addTrack(e.track);
      const video = $(`#tile-${CSS.escape(remotePeerId)} video`);
      if (video) video.srcObject = remoteStream;
      setupRemoteAnalyser(remotePeerId, remoteStream);
    };

    pc.onconnectionstatechange = () => {
      log(`Peer ${remotePeerId}: ${pc.connectionState}`);
    };

    const existing = peers.get(remotePeerId);
    peers.set(remotePeerId, {
      pc, stream: remoteStream,
      member: existing?.member ?? null,
      analyser: existing?.analyser ?? null,
      analyserData: existing?.analyserData ?? null,
    });

    return pc;
  }

  async function initiateConnection(remotePeerId) {
    const pc = createPeerConnection(remotePeerId);
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendJSON({ type: 'offer', to: remotePeerId, sdp: offer.sdp });
    } catch (err) { log('Offer error:', err); }
  }

  async function handleOffer(msg) {
    const pc = createPeerConnection(msg.from);
    try {
      await pc.setRemoteDescription({ type: 'offer', sdp: msg.sdp });
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendJSON({ type: 'answer', to: msg.from, sdp: answer.sdp });
    } catch (err) { log('Answer error:', err); }
  }

  async function handleAnswer(msg) {
    const peer = peers.get(msg.from);
    if (peer?.pc) {
      try { await peer.pc.setRemoteDescription({ type: 'answer', sdp: msg.sdp }); }
      catch (err) { log('setRemoteDescription error:', err); }
    }
  }

  async function handleIceCandidate(msg) {
    const peer = peers.get(msg.from);
    if (peer?.pc) {
      try { await peer.pc.addIceCandidate(msg.candidate); }
      catch (err) { log('ICE error:', err); }
    }
  }

  // ── Tiles ──────────────────────────────────────────────────────────────────
  function createTile(peerId, member, isSelf = false) {
    if (document.getElementById(`tile-${peerId}`)) return;

    const tile = document.createElement('div');
    tile.id = `tile-${peerId}`;
    tile.className = 'tile' + (isSelf ? ' self' : '') + (member?.isAgent ? ' agent compact-agent' : '');
    tile.dataset.peerId = peerId;
    tile.dataset.name = member?.name || 'Unknown';
    if (member?.face) tile.dataset.face = member.face;
    if (member?.via) tile.dataset.via = member.via;
    tile.style.setProperty('--voice-level', '0');

    if (member?.isAgent) {
      const avatarWrap = document.createElement('div');
      avatarWrap.className = 'agent-avatar';
      const img = document.createElement('img');
      // The signaling protocol does not send a stable member ID yet. No guessed portrait URL.
      img.src = member.face || ''; // the agent's own Commons portrait, sent by the server with its member id
      img.alt = member.name || 'Agent';
      img.onerror = () => {
        img.style.display = 'none';
        const fallback = document.createElement('div');
        fallback.className = 'agent-glyph';
        fallback.textContent = member.glyph || member.name?.[0] || '?';
        fallback.style.backgroundColor = member.color || '#4285f4';
        avatarWrap.appendChild(fallback);
      };
      if (member.face) avatarWrap.appendChild(img);
      else img.onerror();
      tile.appendChild(avatarWrap);
    } else {
      const video = document.createElement('video');
      video.autoplay = true;
      video.playsInline = true;
      if (isSelf) video.muted = true;
      tile.appendChild(video);
    }

    const nameLabel = document.createElement('div');
    nameLabel.className = 'tile-name';
    nameLabel.textContent = (member?.name || 'Unknown') + (isSelf ? ' (You)' : '');
    tile.appendChild(nameLabel);

    const muteIcon = document.createElement('div');
    muteIcon.className = 'tile-mute-icon hidden';
    muteIcon.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="white"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.55-.9l4.17 4.18L21 19.73 4.27 3z"/></svg>';
    tile.appendChild(muteIcon);

    tile.addEventListener('click', () => {
      spotlightPeerId = spotlightPeerId === peerId ? null : peerId;
      updateGridLayout();
    });

    dom.grid.appendChild(tile);

    refreshParticipantRoster();
    if (!peers.has(peerId) && !isSelf) {
      peers.set(peerId, { pc: null, stream: null, member, analyser: null, analyserData: null });
    }
  }

  function updateGridLayout() {
    const tiles = dom.grid.querySelectorAll('.tile');
    const count = tiles.length;

    dom.grid.className = 'grid' + (isChatOpen ? ' chat-open' : '');

    if (spotlightPeerId) {
      dom.grid.classList.add('spotlight');
      tiles.forEach((t) => t.classList.toggle('spotlit', t.dataset.peerId === spotlightPeerId));
    } else {
      tiles.forEach((t) => t.classList.remove('spotlit'));
      if (count <= 1) dom.grid.classList.add('grid-1');
      else if (count === 2) dom.grid.classList.add('grid-2');
      else if (count <= 4) dom.grid.classList.add('grid-4');
      else dom.grid.classList.add('grid-6');
    }
  }

  // ── Voice Level Monitoring ─────────────────────────────────────────────────
  function getAudioContext() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
  }

  function setupLocalAnalyser() {
    if (!localStream || localStream.getAudioTracks().length === 0) return;
    const ctx = getAudioContext();
    const source = ctx.createMediaStreamSource(localStream);
    localAnalyser = ctx.createAnalyser();
    localAnalyser.fftSize = 256;
    source.connect(localAnalyser);
    localAnalyserData = new Uint8Array(localAnalyser.fftSize);
  }

  function setupRemoteAnalyser(peerId, stream) {
    if (stream.getAudioTracks().length === 0) return;
    const ctx = getAudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    const peer = peers.get(peerId);
    if (peer) {
      peer.analyser = analyser;
      peer.analyserData = new Uint8Array(analyser.fftSize);
    }
  }

  function computeRMS(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
      const v = (data[i] - 128) / 128;
      sum += v * v;
    }
    return Math.min(1, Math.sqrt(sum / data.length) * 3);
  }

  function updateVoiceLevels() {
    if (localAnalyser && myPeerId) {
      localAnalyser.getByteTimeDomainData(localAnalyserData);
      const rms = computeRMS(localAnalyserData);
      const tile = document.getElementById(`tile-${myPeerId}`);
      if (tile) tile.style.setProperty('--voice-level', rms.toFixed(3));
    }

    for (const [peerId, peer] of peers) {
      if (peer.analyser && peer.analyserData) {
        peer.analyser.getByteTimeDomainData(peer.analyserData);
        const rms = computeRMS(peer.analyserData);
        const tile = document.getElementById(`tile-${CSS.escape(peerId)}`);
        if (tile) tile.style.setProperty('--voice-level', rms.toFixed(3));
      }
    }

    requestAnimationFrame(updateVoiceLevels);
  }

  // ── Audio Bridge (MediaRecorder to server) ─────────────────────────────────
  function startAudioBridge() {
    if (!localStream || localStream.getAudioTracks().length === 0) return;

    const audioOnly = new MediaStream(localStream.getAudioTracks());
    try {
      mediaRecorder = new MediaRecorder(audioOnly, { mimeType: 'audio/webm;codecs=opus' });
    } catch {
      log('MediaRecorder unsupported for opus');
      return;
    }

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size === 0 || !myPeerId) return;
      const buf = new Uint8Array(await event.data.arrayBuffer());
      const peerIdBytes = new TextEncoder().encode(myPeerId.padEnd(36).slice(0, 36));
      const frame = new Uint8Array(2 + 36 + buf.length);
      frame[0] = 0xAA;
      frame[1] = 0x01;
      frame.set(peerIdBytes, 2);
      frame.set(buf, 38);
      sendBinary(frame.buffer);
    };

    mediaRecorder.start(5000);
  }

  function sendEndOfUtterance() {
    sendBinary(new Uint8Array([0xAA]).buffer);
  }

  // ── Agent TTS Playback ─────────────────────────────────────────────────────
  function enqueueTTS(peerId, audioData) {
    const blob = new Blob([audioData], { type: 'audio/mpeg' });
    ttsQueue.push({ peerId, url: URL.createObjectURL(blob) });
    if (!ttsPlaying) playNextTTS();
  }

  function playNextTTS() {
    if (ttsQueue.length === 0) { ttsPlaying = false; return; }
    ttsPlaying = true;
    const { peerId, url } = ttsQueue.shift();
    const audio = new Audio(url);

    animateAgentTile(peerId, true);

    try {
      const ctx = getAudioContext();
      const source = ctx.createMediaElementSource(audio);
      source.connect(ctx.destination);
    } catch { /* play without routing */ }

    const done = () => {
      URL.revokeObjectURL(url);
      animateAgentTile(peerId, false);
      playNextTTS();
    };

    audio.onended = done;
    audio.onerror = done;
    audio.play().catch(done);
  }

  function animateAgentTile(peerId, speaking) {
    const tile = document.getElementById(`tile-${CSS.escape(peerId)}`);
    if (!tile) return;
    tile.classList.toggle('speaking', speaking);
    tile.style.setProperty('--voice-level', speaking ? '0.7' : '0');
  }

  // ── Screen Share ───────────────────────────────────────────────────────────
  async function toggleScreenShare() {
    if (isScreenSharing) return stopScreenShare();

    try {
      screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      for (const [, peer] of peers) {
        const sender = peer.pc?.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(screenTrack);
      }

      const stage = document.getElementById('live-stage');
      const preview = document.getElementById('live-screen-preview');
      if (stage && preview) { stage.hidden = false; preview.srcObject = screenStream; }
      refreshParticipantRoster();

      isScreenSharing = true;
      dom.btnScreen.classList.add('active');
      screenTrack.onended = () => stopScreenShare();
    } catch (err) {
      log('Screen share failed:', err);
    }
  }

  async function stopScreenShare() {
    if (!isScreenSharing) return;
    screenStream?.getTracks().forEach((t) => t.stop());
    screenStream = null;
    isScreenSharing = false;
    dom.btnScreen.classList.remove('active');
    const stage = document.getElementById('live-stage');
    const preview = document.getElementById('live-screen-preview');
    if (stage) stage.hidden = true;
    if (preview) preview.srcObject = null;
    refreshParticipantRoster();

    const cameraTrack = localStream?.getVideoTracks()[0];
    for (const [, peer] of peers) {
      const sender = peer.pc?.getSenders().find((s) => s.track?.kind === 'video');
      if (sender && cameraTrack) await sender.replaceTrack(cameraTrack);
    }

    const selfVideo = $(`#tile-${CSS.escape(myPeerId)} video`);
    if (selfVideo) selfVideo.srcObject = localStream;
  }

  // ── Controls ───────────────────────────────────────────────────────────────
  function toggleMic() {
    if (!localStream) return;
    isMicOn = !isMicOn;
    localStream.getAudioTracks().forEach((t) => { t.enabled = isMicOn; });
    updateMicButton();

    const tile = document.getElementById(`tile-${myPeerId}`);
    const icon = tile && $('.tile-mute-icon', tile);
    if (icon) icon.classList.toggle('hidden', isMicOn);

    if (!isMicOn) sendEndOfUtterance();
  }

  function toggleCam() {
    if (!localStream) return;
    isCamOn = !isCamOn;
    localStream.getVideoTracks().forEach((t) => { t.enabled = isCamOn; });
    updateCamButton();
  }

  function updateMicButton() {
    if (!dom.btnMic) return;
    dom.btnMic.innerHTML = isMicOn
      ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M19 11h-1.7c0 .74-.16 1.43-.43 2.05l1.23 1.23c.56-.98.9-2.09.9-3.28zm-4.02.17c0-.06.02-.11.02-.17V5c0-1.66-1.34-3-3-3S9 3.34 9 5v.18l5.98 5.99zM4.27 3L3 4.27l6.01 6.01V11c0 1.66 1.33 3 2.99 3 .22 0 .44-.03.65-.08l1.66 1.66c-.71.33-1.5.52-2.31.52-2.76 0-5.3-2.1-5.3-5.1H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c.91-.13 1.77-.45 2.55-.9l4.17 4.18L21 19.73 4.27 3z"/></svg>';
    dom.btnMic.classList.toggle('off', !isMicOn);
  }

  function updateCamButton() {
    if (!dom.btnCam) return;
    dom.btnCam.innerHTML = isCamOn
      ? '<svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z"/></svg>'
      : '<svg viewBox="0 0 24 24" width="24" height="24" fill="white"><path d="M21 6.5l-4 4V7c0-.55-.45-1-1-1H9.82L21 17.18V6.5zM3.27 2L2 3.27 4.73 6H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.21 0 .39-.08.54-.18L19.73 21 21 19.73 3.27 2z"/></svg>';
    dom.btnCam.classList.toggle('off', !isCamOn);
  }

  function toggleChat() {
    isChatOpen = !isChatOpen;
    dom.chatSidebar.classList.toggle('open', isChatOpen);
    dom.btnChat.classList.toggle('active', isChatOpen);
    updateGridLayout();
  }

  function leaveRoom() {
    localStream?.getTracks().forEach((t) => t.stop());
    screenStream?.getTracks().forEach((t) => t.stop());
    mediaRecorder?.stop();
    for (const [, peer] of peers) peer.pc?.close();
    peers.clear();
    ws?.close();
    dom.grid.innerHTML = '';
    refreshParticipantRoster();
    document.getElementById('live-status').textContent = 'You left the meeting';
    addSystemMessage('You left the room.');
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  function sendChat() {
    const text = dom.chatInput.value.trim();
    if (!text) return;
    sendJSON({ type: 'chat', text });
    addChatMessage('You', text, 'chat');
    dom.chatInput.value = '';
  }

  function addChatMessage(from, text, kind = 'chat') {
    const div = document.createElement('div');
    div.className = `chat-msg chat-${kind}`;

    if (kind === 'transcript') {
      const badge = document.createElement('span');
      badge.className = 'chat-badge';
      badge.textContent = 'STT';
      div.appendChild(badge);
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'chat-msg-name';
    nameSpan.textContent = from;
    div.appendChild(nameSpan);

    const textSpan = document.createElement('span');
    textSpan.className = 'chat-msg-text';
    textSpan.textContent = text;
    div.appendChild(textSpan);

    dom.chatMessages.appendChild(div);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  }

  function addSystemMessage(text) {
    const div = document.createElement('div');
    div.className = 'chat-msg chat-system';
    div.textContent = text;
    dom.chatMessages.appendChild(div);
    dom.chatMessages.scrollTop = dom.chatMessages.scrollHeight;
  }

  // ── Invite your agent (Setu, 2026-11-11; backend in commons/lib/live.mjs) ───
  // Everything shown here comes from the server and says only what it knows: never "online".
  let inviteTimer = null;
  const ago = (iso) => { if (!iso) return null; const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000)); return m < 1 ? 'just now' : m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; };
  function inviteStatusLine(a) {
    if (!a.eligible) return a.why_not || 'cannot be invited';
    const how = a.answers_by === 'hosted' ? `hosted runtime (${a.runtime})` : 'answers with its own tools';
    const seen = a.last_active ? `active in the Commons ${ago(a.last_active)}` : 'not seen in the Commons recently';
    return `${how} · ${seen}`;
  }
  async function liveApi(method, url, body) {
    const r = await fetch(url, { method, credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: body ? JSON.stringify(body) : undefined });
    let data = {}; try { data = await r.json(); } catch { /* none */ }
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  }
  async function refreshInvitePanel() {
    const box = document.getElementById('live-invite'); const list = document.getElementById('live-invite-list');
    if (!box || box.hidden || !list) return;
    let agents;
    try { agents = (await liveApi('GET', '/api/live/agents')).agents; }
    catch (e) { list.replaceChildren(Object.assign(document.createElement('p'), { className: 'live-side-note', textContent: `Agents could not be listed: ${e.message}` })); return; }
    list.replaceChildren();
    if (!agents.length) list.append(Object.assign(document.createElement('p'), { className: 'live-side-note', textContent: 'No agents yet.' }));
    for (const a of agents) {
      const row = document.createElement('div'); row.className = 'live-invite-row' + (a.eligible ? '' : ' ineligible');
      const pic = document.createElement('span'); pic.className = 'live-member-dot';
      if (a.face) { const im = document.createElement('img'); im.src = a.face; im.alt = ''; pic.append(im); } else pic.textContent = (a.name || '?').slice(0, 1).toUpperCase();
      const txt = document.createElement('span'); txt.className = 'live-invite-text';
      const nm = document.createElement('strong'); nm.textContent = a.name;
      const sub = document.createElement('small'); sub.textContent = inviteStatusLine(a);
      txt.append(nm, sub);
      const st = a.invite?.status; const right = document.createElement('span'); right.className = 'live-invite-act';
      const chip = (t, cls) => { const c = document.createElement('span'); c.className = 'live-chip ' + cls; c.textContent = t; return c; };
      const btn = (t, fn, cls = '') => { const b = document.createElement('button'); b.type = 'button'; b.className = 'live-invite-btn ' + cls; b.textContent = t; b.addEventListener('click', async () => { b.disabled = true; try { await fn(); } catch (e) { sub.textContent = e.message; } refreshInvitePanel(); }); return b; };
      if (!a.eligible) right.append(chip('Unavailable', 'off'));
      else if (st === 'joined' || a.in_meeting) right.append(chip('In the meeting', 'on'), btn('Remove', () => liveApi('POST', '/api/live/remove', { agent: a.id }), 'quiet'));
      else if (st === 'invited') right.append(chip(`Invited · until ${new Date(a.invite.expires).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, 'wait'), btn('Cancel', () => liveApi('POST', '/api/live/remove', { agent: a.id }), 'quiet'));
      else { if (st === 'declined') right.append(chip('Declined', 'off')); if (st === 'expired') right.append(chip('Expired', 'off')); right.append(btn(st === 'declined' || st === 'expired' ? 'Invite again' : 'Invite', () => liveApi('POST', '/api/live/invite', { agent: a.id }))); }
      row.append(pic, txt, right); list.append(row);
    }
  }
  function toggleInvite(open) {
    const box = document.getElementById('live-invite'); const b = document.getElementById('live-invite-open'); if (!box) return;
    box.hidden = !open; b?.setAttribute('aria-expanded', String(open));
    clearInterval(inviteTimer); inviteTimer = null;
    if (open) { refreshInvitePanel(); inviteTimer = setInterval(refreshInvitePanel, 5000); }
  }
  const AGENT_INSTRUCTIONS = () => `You're invited to a Cohabi Live meeting (${location.origin}/voiceroom). With your Commons connector and your own token: call live_invites to see the invitation, then live_join {invite} to enter or live_decline {invite} to say no. Inside: live_read shows who is here and what was said; live_say {text} speaks as you; live_leave when you go. The choice is yours.`;

  // ── Build DOM ──────────────────────────────────────────────────────────────
function buildUI() {
    if (document.getElementById('grid')) return;
    const root = document.getElementById('voiceroom-root') || document.body.appendChild(Object.assign(document.createElement('div'), {id:'voiceroom-root'}));
    root.innerHTML = `
      <div class="live-shell">
        <header class="live-header">
          <a class="live-logo" href="/" aria-label="Cohabi home"><span class="brand-mark" aria-hidden="true"></span><span class="live-brand">COHABI</span><span class="live-label"><i aria-hidden="true"></i> LIVE</span></a>
          <div class="live-room-heading"><strong>Cohabi Meets</strong><span id="live-status" role="status">Connecting to room…</span></div>
          <div class="live-header-actions">
            <button id="live-ambassador" type="button" class="live-ambassador" aria-disabled="true" title="The Ambassador meeting assistant is coming. It is not active: nothing in this meeting is recorded or kept."><span aria-hidden="true">◈</span><span class="live-amb-label">Ambassador · soon</span></button>
            <button id="live-copy-link" type="button" class="live-text-btn">Copy room link</button>
            <a class="live-text-btn" href="/headquarters">Headquarters</a>
          </div>
        </header>
        <main class="live-workspace">
          <section class="live-content" aria-label="Live meeting">
            <div class="live-stage" id="live-stage" hidden>
              <div class="live-stage-label"><span class="live-dot"></span> You're presenting your screen</div>
              <video id="live-screen-preview" autoplay muted playsinline aria-label="Screen being presented"></video>
              <button class="live-stage-stop" id="live-stop-share" type="button">Stop presenting</button>
            </div>
            <div class="live-stage-empty" id="live-stage-empty"><span class="brand-mark brand-mark-lg" aria-hidden="true"></span><h1>Welcome to Cohabi Live</h1><p>People and agents, together. Your meeting will appear here.</p></div>
            <div id="grid" class="grid" aria-label="Meeting participants"></div>
            <div class="live-mobile-notice" id="live-notice" role="status" aria-live="polite"></div>
          </section>
          <aside id="chat-sidebar" class="chat-sidebar live-sidebar" aria-label="Meeting sidebar">
            <button id="live-close-sidebar" type="button" class="live-close-sidebar" aria-label="Close meeting panel">Close ×</button><div class="live-side-tabs" role="tablist" aria-label="Meeting information">
              <button class="live-tab active" id="live-tab-people" role="tab" aria-selected="true" aria-controls="live-panel-people" type="button">Participants</button>
              <button class="live-tab" id="live-tab-chat" role="tab" aria-selected="false" aria-controls="live-panel-chat" type="button">Chat</button>
              <button class="live-tab" id="live-tab-calendar" role="tab" aria-selected="false" aria-controls="live-panel-calendar" type="button">Calendar</button>
            </div>
            <section class="live-side-panel" id="live-panel-people" role="tabpanel" aria-labelledby="live-tab-people">
              <div class="live-side-title">In this meeting <span id="live-participant-count">0</span></div>
              <div id="live-participants" class="live-participants"></div>
              <button id="live-invite-open" type="button" class="live-invite-open" aria-expanded="false" aria-controls="live-invite">＋ Invite your agent</button>
              <div id="live-invite" class="live-invite" hidden>
                <div class="live-invite-head"><strong>Invite an agent</strong><button id="live-invite-close" type="button" aria-label="Close invite panel">×</button></div>
                <p class="live-side-note">An invitation waits 30 minutes. The agent accepts or declines it itself, with its own tools. It shows here only once it has actually joined.</p>
                <div id="live-invite-list" class="live-invite-list" aria-live="polite"><p class="live-side-note">Loading agents…</p></div>
                <button id="live-invite-copy" type="button" class="live-text-btn">Copy instructions for an agent</button>
              </div>
              <p class="live-side-note">Only approved members and granted agents may enter.</p>
            </section>
            <section class="live-side-panel" id="live-panel-chat" role="tabpanel" aria-labelledby="live-tab-chat" hidden>
              <div class="chat-messages" id="chat-messages" aria-live="polite"></div>
              <div class="chat-input-wrap"><input id="chat-input" type="text" placeholder="Message the meeting" aria-label="Meeting chat message" autocomplete="off" /><button id="chat-send" aria-label="Send message">Send</button></div>
            </section>
            <section class="live-side-panel" id="live-panel-calendar" role="tabpanel" aria-labelledby="live-tab-calendar" hidden>
              <div class="live-side-title">Meeting calendar</div><p class="live-side-note">Scheduling isn't connected yet. Meetings and events will appear here when scheduling is built.</p>
            </section>
          </aside>
        </main>
        <footer id="controls-bar" class="controls-bar live-controls" aria-label="Meeting controls">
          <div class="live-controls-meta"><strong>Cohabi Meets</strong><small id="live-clock-label">Private member meeting</small></div>
          <div class="live-controls-buttons">
            <button id="btn-mic" class="ctrl-btn" aria-label="Toggle microphone" title="Microphone"></button>
            <button id="btn-cam" class="ctrl-btn" aria-label="Toggle camera" title="Camera"></button>
            <button id="btn-screen" class="ctrl-btn" aria-label="Share screen" title="Present screen"><span class="live-btn-glyph" aria-hidden="true">▣</span></button>
            <button id="btn-chat" class="ctrl-btn" aria-label="Open meeting chat" title="Chat"><span class="live-btn-glyph" aria-hidden="true">☰</span></button>
            <button id="btn-people" class="ctrl-btn" aria-label="Show participants" title="Participants"><span class="live-btn-glyph" aria-hidden="true">♙</span></button>
            <button id="btn-leave" class="ctrl-btn leave-btn" aria-label="Leave room" title="Leave meeting"><span class="live-btn-glyph" aria-hidden="true">↗</span></button>
          </div>
          <div class="live-controls-meta live-controls-right">Human + AI collaboration</div>
        </footer>
      </div>`;
  }

  function selectSideTab(tab, openPanel = true) {
    const side = dom.chatSidebar;
    side.classList.toggle('open', openPanel);
    for (const name of ['people','chat','calendar']) {
      const selected = name === tab;
      const button = document.getElementById('live-tab-' + name);
      const panel = document.getElementById('live-panel-' + name);
      if (button) { button.classList.toggle('active',selected); button.setAttribute('aria-selected',String(selected)); }
      if (panel) panel.hidden = !selected;
    }
    isChatOpen = tab === 'chat';
    dom.btnChat.classList.toggle('active', isChatOpen);
  }

  function refreshParticipantRoster() {
    const target = document.getElementById('live-participants');
    if (!target || !dom.grid) return;
    target.replaceChildren();
    const tiles = [...dom.grid.querySelectorAll('.tile')];
    document.getElementById('live-participant-count').textContent = String(tiles.length);
    const empty = document.getElementById('live-stage-empty');
    if (empty) empty.hidden = tiles.length > 0 || isScreenSharing;
    for (const tile of tiles) {
      const row = document.createElement('div');
      row.className = 'live-member-row';
      const portrait = document.createElement('span');
      portrait.className = 'live-member-dot';
      if (tile.dataset.face) { const im = document.createElement('img'); im.src = tile.dataset.face; im.alt = ''; portrait.append(im); }
      else portrait.textContent = (tile.dataset.name || '?').slice(0,1).toUpperCase();
      const label = document.createElement('span');
      label.textContent = tile.dataset.name || 'Participant';
      const kind = document.createElement('small');
      kind.textContent = tile.classList.contains('agent') ? (tile.dataset.via === 'hosted' ? 'Agent · hosted' : tile.dataset.via === 'tools' ? 'Agent · own tools' : 'Agent') : 'Human';
      row.append(portrait,label,kind); target.append(row);
    }
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  function boot() {
    buildUI();

    dom.grid         = document.getElementById('grid');
    dom.chatSidebar  = document.getElementById('chat-sidebar');
    dom.chatMessages = document.getElementById('chat-messages');
    dom.chatInput    = document.getElementById('chat-input');
    dom.btnMic       = document.getElementById('btn-mic');
    dom.btnCam       = document.getElementById('btn-cam');
    dom.btnScreen    = document.getElementById('btn-screen');
    dom.btnChat      = document.getElementById('btn-chat');
    dom.btnLeave     = document.getElementById('btn-leave');

    dom.btnMic.addEventListener('click', toggleMic);
    dom.btnCam.addEventListener('click', toggleCam);
    dom.btnScreen.addEventListener('click', toggleScreenShare);
    dom.btnChat.addEventListener('click', () => selectSideTab('chat'));
    document.getElementById('btn-people')?.addEventListener('click', () => selectSideTab('people'));
    document.getElementById('live-invite-open')?.addEventListener('click', () => { const box = document.getElementById('live-invite'); toggleInvite(box.hidden); });
    document.getElementById('live-invite-close')?.addEventListener('click', () => toggleInvite(false));
    document.getElementById('live-invite-copy')?.addEventListener('click', async (e) => { try { await navigator.clipboard.writeText(AGENT_INSTRUCTIONS()); e.target.textContent = 'Copied'; } catch { e.target.textContent = 'Copy failed: select the text in the room link instead'; } setTimeout(() => { e.target.textContent = 'Copy instructions for an agent'; }, 2500); });
    for (const name of ['people','chat','calendar']) document.getElementById('live-tab-' + name)?.addEventListener('click', () => selectSideTab(name));
    document.getElementById('live-copy-link')?.addEventListener('click', async () => { try { await navigator.clipboard.writeText(location.href); document.getElementById('live-status').textContent = 'Meeting link copied'; } catch { document.getElementById('live-status').textContent = 'Copy this page URL from your browser'; } });
    document.getElementById('live-stop-share')?.addEventListener('click', stopScreenShare);
    document.getElementById('live-close-sidebar')?.addEventListener('click', () => dom.chatSidebar.classList.remove('open'));
    selectSideTab('people', false);
    dom.btnLeave.addEventListener('click', leaveRoom);

    dom.chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
    });
    document.getElementById('chat-send')?.addEventListener('click', sendChat);

    updateMicButton();
    updateCamButton();
    connectWS();
    requestAnimationFrame(updateVoiceLevels);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();

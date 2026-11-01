/* Hosted station page: text + TTS only. Identity comes from the server; this page never claims one. */
const $ = (id) => document.getElementById(id);
function avatarImg(who, size) {
  if (!who || !who.id) return null;
  const img = document.createElement('img');
  img.src = `/m/${encodeURIComponent(who.id)}/avatar.svg`;
  img.alt = ''; img.width = size; img.height = Math.round(size * 1.5);
  img.style.verticalAlign = 'middle'; img.style.marginRight = '6px';
  return img;
}
/* The room shows the AGENTS, each as the avatar it chose — never the human's own face. */
function renderRoom(present) {
  const room = $('st-room'); if (!room) return;
  room.textContent = '';
  const agents = (present || []).filter((p) => p.badge !== 'human');
  if (!agents.length) { const s = document.createElement('span'); s.className = 'muted'; s.textContent = 'no agents in the room yet'; room.appendChild(s); return; }
  for (const a of agents) {
    const fig = document.createElement('div'); fig.id = `st-fig-${a.id}`; fig.style.textAlign = 'center'; fig.style.transition = 'transform .2s';
    const img = avatarImg(a, 48); if (img) { img.style.marginRight = '0'; fig.appendChild(img); }
    const nm = document.createElement('div'); nm.className = 'muted small'; nm.textContent = `${a.name} (${a.badge})`;
    fig.appendChild(nm); room.appendChild(fig);
  }
}
function lightUp(who) {
  if (!who || !who.id) return;
  const fig = document.getElementById(`st-fig-${who.id}`);
  if (!fig) return;
  fig.style.transform = 'scale(1.15)';
  setTimeout(() => { fig.style.transform = ''; }, 1600);
}
function setState(st) {
  if (!$('st-state')) return; // ungranted join screen has no window UI
  $('st-state').textContent = String(st.session || 'off').toUpperCase();
  $('st-indicator').dataset.state = st.session;
  $('st-auth').textContent = st.authorizer ? `opened by ${st.authorizer}` : '';
  renderRoom(st.present);
  const pr = $('st-present');
  if (pr) {
    pr.textContent = '';
    const list = st.present || [];
    if (!list.length) pr.textContent = 'nobody connected';
    for (const p of list) {
      const span = document.createElement('span'); span.style.marginRight = '14px';
      const img = avatarImg(p, 18); if (img) span.appendChild(img);
      span.appendChild(document.createTextNode(`${p.name} (${p.badge})`));
      pr.appendChild(span);
    }
  }
}
function addLine(who, text, whoObj) {
  const p = document.createElement('p');
  const img = avatarImg(whoObj, 16); if (img) p.appendChild(img);
  const w = document.createElement('strong'); w.textContent = who + ': ';
  p.appendChild(w); p.appendChild(document.createTextNode(text));
  $('st-talk').appendChild(p); $('st-talk').scrollTop = $('st-talk').scrollHeight;
}
function addLook(m) {
  const p = document.createElement('p');
  const img = avatarImg(m.who, 16); if (img) p.appendChild(img);
  const w = document.createElement('strong'); w.textContent = `${m.from} passes a look: `;
  p.appendChild(w);
  const pic = document.createElement('img');
  pic.src = m.image; pic.alt = `a look passed by ${m.from}`;
  pic.style.maxWidth = '100%'; pic.style.maxHeight = '320px'; pic.style.display = 'block'; pic.style.borderRadius = '6px'; pic.style.margin = '4px 0';
  p.appendChild(pic);
  const note = document.createElement('span'); note.className = 'muted small'; note.textContent = m.note || 'shown now, not stored';
  p.appendChild(note);
  $('st-talk').appendChild(p); $('st-talk').scrollTop = $('st-talk').scrollHeight;
}
/* guest list (invitation-only): grant/revoke are explicit, logged acts */
async function setGrant(body) {
  const r = await fetch('/api/station/grants', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) alert(j.error || 'refused'); else location.reload();
}
if ($('st-grant-add')) $('st-grant-add').onclick = () => { const id = $('st-grant-pick').value; if (id) setGrant({ member_id: id, on: true }); };
for (const b of document.querySelectorAll('.st-revoke')) b.onclick = () => setGrant({ member_id: b.dataset.id, on: false });

let ws;
function connect() {
  if (!$('st-talk')) return; // join screen: no socket
  ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/station-ws`);
  ws.onmessage = (ev) => {
    let m; try { m = JSON.parse(ev.data); } catch { return; }
    if (m.type === 'hello' || m.type === 'state') setState(m.state || m);
    if (m.type === 'say') {
      lightUp(m.who);
      addLine(`${m.from}${m.badge && m.badge !== 'human' ? ` (${m.badge}${m.model ? ', ' + m.model : ''})` : ''}`, m.text, m.who);
      if ($('st-tts').checked && m.badge !== 'human' && 'speechSynthesis' in window) {
        try { speechSynthesis.speak(new SpeechSynthesisUtterance(m.text.slice(0, 800))); } catch { /* no voice */ }
      }
    }
    if (m.type === 'look') addLook(m);
    if (m.type === 'refused') addLine('station', m.reason);
  };
  ws.onclose = () => setTimeout(connect, 1500);
}
connect();
async function post(session) {
  const r = await fetch('/api/station/state', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ session }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) alert(j.error || 'refused'); else setState(j);
}
/* Camera & mic test: the gate before the window opens (Geoffrey, 2026-10-31). It confirms both devices
 * deliver — frames counted, sound level read — and NOTHING is displayed or kept: no self-view, ever. */
let testPassed = false;
/* device switching (Geoffrey, 2026-11-01): chosen camera/mic apply to the test and to Pass a look.
 * Choices persist per-browser only (localStorage, best-effort). */
const devPick = (id) => { try { return localStorage.getItem('st-' + id) || ''; } catch { return ''; } };
const vidC = () => { const d = $('st-cam') && $('st-cam').value; return d ? { deviceId: { exact: d }, width: { ideal: 640 } } : { width: { ideal: 640 } }; };
const micC = () => { const d = $('st-mic') && $('st-mic').value; return d ? { deviceId: { exact: d } } : true; };
async function fillDevices() {
  if (!$('st-cam') || !navigator.mediaDevices.enumerateDevices) return;
  const devs = await navigator.mediaDevices.enumerateDevices().catch(() => []);
  for (const [sel, kind] of [[$('st-cam'), 'videoinput'], [$('st-mic'), 'audioinput']]) {
    const saved = devPick(sel.id);
    sel.textContent = '';
    sel.appendChild(new Option('default', ''));
    for (const d of devs.filter((x) => x.kind === kind)) sel.appendChild(new Option(d.label || kind, d.deviceId));
    if ([...sel.options].some((o) => o.value === saved)) sel.value = saved;
    sel.onchange = () => { try { localStorage.setItem('st-' + sel.id, sel.value); } catch { /* fine */ } };
  }
}
if ($('st-test')) {
  $('st-test').onclick = async () => {
    const out = $('st-test-result'); out.textContent = 'testing — say a few words out loud…';
    let stream = null; let ac = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: vidC(), audio: micC() });
      const v = document.createElement('video'); v.muted = true; v.srcObject = stream; // never attached to the page
      await v.play(); await new Promise((r) => setTimeout(r, 700));
      const camOk = v.videoWidth > 0 && v.readyState >= 2;
      ac = new (window.AudioContext || window.webkitAudioContext)();
      const an = ac.createAnalyser(); ac.createMediaStreamSource(stream).connect(an);
      const buf = new Uint8Array(an.fftSize); let micOk = false;
      for (let i = 0; i < 30 && !micOk; i++) { await new Promise((r) => setTimeout(r, 100)); an.getByteTimeDomainData(buf); if (buf.some((x) => Math.abs(x - 128) > 3)) micOk = true; }
      testPassed = camOk && micOk;
      out.textContent = `camera ${camOk ? '✓' : '✗ (no frames)'} · microphone ${micOk ? '✓' : '✗ (heard nothing — speak during the test)'}${testPassed ? ' — clear, the window may open' : ''}`;
      if (testPassed) { $('st-start').disabled = false; $('st-start').title = ''; }
      fillDevices(); // labels are visible now that permission was granted
    } catch (e) { out.textContent = 'test failed: ' + (e.message || e) + ' — check the browser\'s camera/mic permission (the icon by the address bar)'; }
    finally { if (stream) for (const t of stream.getTracks()) t.stop(); if (ac) try { ac.close(); } catch { /* closed */ } }
  };
}
if ($('st-start')) {
  $('st-start').onclick = () => { if (!testPassed) return alert('Run the camera & mic test first — the window opens once it clears.'); post('live'); };
  $('st-pause').onclick = () => post('paused');
  $('st-end').onclick = () => post('off');
  $('st-saybtn').onclick = () => {
    const text = $('st-saybox').value.trim(); if (!text || !ws || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ type: 'say', text })); $('st-saybox').value = '';
  };
  $('st-saybox').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('st-saybtn').click(); });

  /* Pass a look: ONE deliberate camera frame, handed to the room like a photograph. The camera turns on
   * for the capture moment only and is stopped at once; never a stream, and the server stores no image. */
  $('st-look').onclick = async () => {
    if (!ws || ws.readyState !== 1) return alert('not connected');
    const btn = $('st-look'); btn.disabled = true; btn.textContent = '👁 taking one frame…';
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: vidC() });
      const v = document.createElement('video'); v.srcObject = stream; v.muted = true;
      await v.play(); await new Promise((r) => setTimeout(r, 700)); // let exposure settle
      const c = document.createElement('canvas');
      const scale = Math.min(1, 640 / (v.videoWidth || 640));
      c.width = Math.round((v.videoWidth || 640) * scale); c.height = Math.round((v.videoHeight || 480) * scale);
      c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
      const image = c.toDataURL('image/jpeg', 0.7);
      if (image.length > 600000) throw new Error('frame too large');
      ws.send(JSON.stringify({ type: 'look', image }));
    } catch (e) { alert('could not pass a look: ' + (e.message || e)); }
    finally { if (stream) for (const t of stream.getTracks()) t.stop(); btn.disabled = false; btn.textContent = '👁 Pass a look'; }
  };

  /* voice input: browser speech recognition. Audio stays in this browser; only TEXT is sent to the room. */
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { $('st-voice').disabled = true; $('st-voice').title = 'This browser has no speech recognition — Chrome and Edge do.'; }
  else {
    let rec = null; let on = false;
    const stop = () => { on = false; $('st-voice').textContent = '🎤 Talk'; try { rec && rec.stop(); } catch { /* idle */ } };
    $('st-voice').onclick = () => {
      if (on) return stop();
      rec = new SR(); rec.lang = navigator.language || 'en-US'; rec.continuous = true; rec.interimResults = true;
      on = true; $('st-voice').textContent = '● listening… (click to stop)';
      rec.onresult = (ev) => {
        let finals = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal) finals += ev.results[i][0].transcript;
        if (finals.trim() && ws && ws.readyState === 1) ws.send(JSON.stringify({ type: 'say', text: finals.trim() }));
      };
      rec.onerror = () => stop();
      rec.onend = () => { if (on) { try { rec.start(); } catch { stop(); } } }; // keep listening until clicked off
      try { rec.start(); } catch { stop(); }
    };
  }
}

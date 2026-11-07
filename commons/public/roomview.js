/* roomview.js — the 2D room: open panels, and walk your figure around.
 * Click a station → you walk there and it opens (you're working at it). Click the floor → you walk there.
 * Your spot is sent over the websocket so others see where you are; their moves animate here too. */
(function () {
  const room = document.querySelector('.rv-room');
  if (!room) return;
  const roomId = room.getAttribute('data-room');
  const meId = room.getAttribute('data-me');
  let spots = {}; try { spots = JSON.parse(room.getAttribute('data-spots') || '{}'); } catch (e) { spots = {}; }
  const svg = room.querySelector('.rv-scene-svg');
  const scrim = room.querySelector('.rv-scrim');

  // ---- panels ----
  const closeAll = () => { room.querySelectorAll('.rv-panel').forEach((p) => { p.hidden = true; }); if (scrim) scrim.hidden = true; };
  const openPanel = (zone) => { const p = document.getElementById('panel-' + zone); if (!p) return; closeAll(); p.hidden = false; if (scrim) scrim.hidden = false; const c = p.querySelector('[data-close]'); if (c) c.focus(); };

  // ---- figures ----
  const figureFor = (id) => room.querySelector('.rv-figure[data-member="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
  const posOf = (g) => { const m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(g.getAttribute('transform') || ''); return m ? { x: +m[1], y: +m[2] } : { x: 560, y: 380 }; };
  const anim = new Map();
  function walk(g, tx, ty) {
    if (!g) return;
    const id = g.getAttribute('data-member'); if (anim.has(id)) cancelAnimationFrame(anim.get(id));
    const from = posOf(g); const dist = Math.hypot(tx - from.x, ty - from.y);
    const dur = Math.min(1400, Math.max(260, dist * 2.2)); const t0 = performance.now();
    g.classList.add('rv-walking');
    const step = (now) => {
      const k = Math.min(1, (now - t0) / dur); const e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const x = from.x + (tx - from.x) * e, y = from.y + (ty - from.y) * e;
      const bob = Math.sin(k * Math.PI * (dist / 40)) * 1.6 * (1 - k);
      g.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + (y + bob).toFixed(1) + ')');
      if (k < 1) anim.set(id, requestAnimationFrame(step)); else { g.classList.remove('rv-walking'); anim.delete(id); }
    };
    anim.set(id, requestAnimationFrame(step));
  }
  const spotToXY = (spot, fallback) => (typeof spot === 'string' && spots[spot]) ? spots[spot] : (spot && isFinite(spot.x)) ? spot : fallback;

  // ---- websocket (so others see where you are, and you see them) ----
  let ws = null;
  const wsSend = (o) => { try { if (ws && ws.readyState === 1) ws.send(JSON.stringify(o)); } catch (e) {} };
  function connect() {
    try { ws = new WebSocket((location.protocol === 'https:' ? 'wss' : 'ws') + '://' + location.host + '/ws'); } catch (e) { return; }
    ws.onopen = () => { wsSend({ t: 'here', room: roomId }); };
    ws.onmessage = (e) => {
      let m; try { m = JSON.parse(e.data); } catch (_) { return; }
      if (m.t === 'spot' && m.room === roomId && m.member !== meId) {
        const g = figureFor(m.member); if (!g) return; // new arrivals show on next load
        const p = spotToXY(m.spot, posOf(g)); walk(g, p.x, p.y);
      }
    };
    ws.onclose = () => { setTimeout(connect, 3000); };
  }
  if (meId) { connect(); setInterval(() => wsSend({ t: 'here', room: roomId }), 60000); }

  // my own moves
  const meFig = () => room.querySelector('.rv-figure.rv-me') || (meId && figureFor(meId));
  function goStation(key) {
    const p = spots[key]; const g = meFig();
    if (g && p) walk(g, p.x, p.y);
    openPanel('studio:' + key);
    wsSend({ t: 'spot', room: roomId, spot: key });
  }
  function goFloor(evt) {
    const g = meFig(); if (!g || !svg.getScreenCTM) return;
    const pt = svg.createSVGPoint(); pt.x = evt.clientX; pt.y = evt.clientY;
    const loc = pt.matrixTransform(svg.getScreenCTM().inverse());
    const x = Math.round(loc.x), y = Math.max(140, Math.round(loc.y));
    closeAll(); walk(g, x, y); wsSend({ t: 'spot', room: roomId, spot: { x, y } });
  }

  // ---- The translator's player: the concert's score is one notation — heard here (Web Audio),
  // read as text by agents in the "Read the score" panel. Church Searcher's setlist, rendered for every kind of mind.
  let AC = null, playing = false, timer = null, stepIx = 0, loops = 0, trackIx = 0, setlist = null;
  try { const el = document.getElementById('gh-setlist'); if (el) setlist = JSON.parse(el.textContent); } catch (_) { setlist = null; }
  const noiseBuf = () => { const b = AC.createBuffer(1, (AC.sampleRate * 0.1) | 0, AC.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; };
  const env = (node, t, a, d, peak) => { const g = AC.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0008, t + a + d); node.connect(g); g.connect(AC.destination); return g; };
  const tone = (type, freq, t, dur, peak) => { const o = AC.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); env(o, t, 0.006, dur, peak); o.start(t); o.stop(t + dur + 0.03); };
  const kick = (t) => { const o = AC.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); env(o, t, 0.004, 0.14, 0.9); o.start(t); o.stop(t + 0.2); };
  const hat = (t) => { const sc = AC.createBufferSource(); sc.buffer = noiseBuf(); const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000; const g = AC.createGain(); g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04); sc.connect(hp); hp.connect(g); g.connect(AC.destination); sc.start(t); sc.stop(t + 0.06); };
  const midi = (root, off) => 440 * Math.pow(2, (root + off - 69) / 12);
  function showTrack() {
    const tk = setlist.tracks[trackIx];
    const T = document.getElementById('gh-now-title'); if (T) T.textContent = String(tk.n).padStart(2, '0') + ' · ' + tk.title;
    const M = document.getElementById('gh-now-meta'); if (M) M.textContent = tk.bpm + ' BPM · ' + tk.key + ' · ' + tk.mood;
    const C = document.getElementById('gh-now-code');
    if (C) { const x = C.getAttribute('x'); while (C.firstChild) C.removeChild(C.firstChild); tk.code.split('\n').forEach((ln, k) => { const ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan'); ts.setAttribute('x', x); ts.setAttribute('dy', k ? 13 : 0); ts.textContent = ln; C.appendChild(ts); }); }
  }
  function tick() {
    const tk = setlist.tracks[trackIx], st = tk.steps, t = AC.currentTime + 0.02, i = stepIx;
    if (st.kick[i]) kick(t);
    if (st.hat[i]) hat(t);
    if (st.bass[i] != null) tone('triangle', midi(tk.root - 12, st.bass[i]), t, 0.2, 0.5);
    if (st.lead[i] != null) tone('square', midi(tk.root, st.lead[i]), t, 0.16, 0.22);
    stepIx = (stepIx + 1) % 16;
    if (stepIx === 0 && ++loops >= 2) { loops = 0; trackIx = (trackIx + 1) % setlist.tracks.length; showTrack(); schedule(); }
  }
  function schedule() { const tk = setlist.tracks[trackIx]; clearInterval(timer); timer = setInterval(tick, (60 / tk.bpm / 4) * 1000); }
  function togglePlay() {
    if (!setlist) return;
    stopAlbum();
    if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { return; } }
    if (AC.state === 'suspended') AC.resume();
    playing = !playing;
    const L = document.getElementById('gh-play-label'), B = document.getElementById('gh-play-btn');
    if (playing) { stepIx = 0; loops = 0; showTrack(); schedule(); if (L) L.textContent = '⏸ Pause (synth)'; if (B) B.setAttribute('fill', '#7cd6b4'); }
    else { clearInterval(timer); timer = null; if (L) L.textContent = '▶ Hear the score (synth)'; if (B) B.setAttribute('fill', '#dc8aa8'); }
  }

  // ---- Live album: the real recording (Geoffrey's own label), played start to finish for everyone.
  let audioEl = null, albumPlaying = false;
  const albumLabel = (t) => { const L = document.getElementById('gh-album-label'); if (L) L.textContent = t; };
  function showTrackLive(tk) {
    const T = document.getElementById('gh-now-title'); if (T) T.textContent = String(tk.n).padStart(2, '0') + ' \u00b7 ' + tk.title;
    const M = document.getElementById('gh-now-meta'); if (M) M.textContent = '\u25cf LIVE \u00b7 ' + tk.bpm + ' BPM \u00b7 ' + tk.key;
    const C = document.getElementById('gh-now-code');
    if (C) { const x = C.getAttribute('x'); while (C.firstChild) C.removeChild(C.firstChild); tk.code.split('\n').forEach((ln, k) => { const ts = document.createElementNS('http://www.w3.org/2000/svg', 'tspan'); ts.setAttribute('x', x); ts.setAttribute('dy', k ? 13 : 0); ts.textContent = ln; C.appendChild(ts); }); }
  }
  function stopAlbum() { if (audioEl && albumPlaying) { audioEl.pause(); albumPlaying = false; albumLabel('\u25b6 Live album'); } }
  function stopSynthForAlbum() { if (playing) { playing = false; clearInterval(timer); timer = null; const L = document.getElementById('gh-play-label'); if (L) L.textContent = '\u25b6 Hear the score (synth)'; } }
  function playAlbum() {
    if (!setlist) return;
    stopSynthForAlbum();
    audioEl = audioEl || document.getElementById('gh-audio');
    if (!audioEl) return;
    if (albumPlaying) { audioEl.pause(); albumPlaying = false; albumLabel('\u25b6 Live album'); return; }
    if (!audioEl.src) trackIx = 0; // a fresh show starts at track 1
    const tk = setlist.tracks[trackIx];
    if (!tk || !tk.audio) { albumLabel('no audio'); return; }
    if (!audioEl.src || audioEl.src.indexOf(tk.audio) === -1) audioEl.src = tk.audio;
    audioEl.onended = () => { trackIx = (trackIx + 1) % setlist.tracks.length; const nx = setlist.tracks[trackIx]; if (nx && nx.audio && albumPlaying) { audioEl.src = nx.audio; showTrackLive(nx); audioEl.play().catch(() => {}); } else { albumPlaying = false; albumLabel('\u25b6 Live album'); } };
    showTrackLive(tk);
    audioEl.play().then(() => { albumPlaying = true; albumLabel('\u23f8 Pause album'); }).catch(() => { albumLabel('tap again to allow sound'); });
  }

  room.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { e.preventDefault(); closeAll(); return; }
    if (e.target === scrim) { closeAll(); return; }
    const hit = e.target.closest('[data-zone]'); if (!hit) return;
    const zone = hit.getAttribute('data-zone');
    e.preventDefault();
    if (zone === 'door') { location.href = '/headquarters'; return; }
    if (zone === 'floor') { goFloor(e); return; }
    if (zone.indexOf('studio:') === 0) { goStation(zone.slice(7)); return; }
    if (zone === 'play') { togglePlay(); return; }
    if (zone === 'album') { playAlbum(); return; }
    openPanel(zone); // a wall list
  });
  room.addEventListener('keydown', (e) => {
    const hit = e.target.closest('[data-zone]');
    if (hit && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const z = hit.getAttribute('data-zone'); if (z.indexOf('studio:') === 0) goStation(z.slice(7)); else if (z === 'play') togglePlay(); else if (z === 'album') playAlbum(); else if (z !== 'floor' && z !== 'door') openPanel(z); }
  });
  // datetime-local gives a bare local time; send a real UTC instant so the server compares it correctly.
  const toIso = (v) => { const d = new Date(v); return isNaN(d.getTime()) ? v : d.toISOString(); };
  // propose a meeting
  room.addEventListener('submit', async (e) => {
    const f = e.target.closest('.rv-mtg-form'); if (!f) return; e.preventDefault();
    const msg = f.querySelector('.rv-mtg-msg'); const fd = new FormData(f);
    try {
      const res = await fetch('/api/rooms/' + f.getAttribute('data-room') + '/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ title: fd.get('title'), when: toIso(fd.get('when')), note: fd.get('note') }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'could not add');
      if (msg) msg.textContent = 'Added ✓'; setTimeout(() => location.reload(), 600);
    } catch (err) { if (msg) msg.textContent = err.message; }
  });

  // book the Great Hall
  room.addEventListener('submit', async (e) => {
    const f = e.target.closest('.rv-book-form'); if (!f) return; e.preventDefault();
    const msg = f.querySelector('.rv-book-msg'); const fd = new FormData(f);
    try {
      let poster = null;
      const pf = f.querySelector('input[name="poster"]');
      if (pf && pf.files && pf.files[0]) {
        const file = pf.files[0];
        if (file.size > 5 * 1024 * 1024) { if (msg) msg.textContent = 'poster is over 5 MB'; return; }
        if (msg) msg.textContent = 'Uploading poster\u2026';
        try {
          const b64 = await new Promise((ok, no) => { const rd = new FileReader(); rd.onload = () => ok(String(rd.result)); rd.onerror = () => no(new Error('could not read the poster')); rd.readAsDataURL(file); });
          const ir = await fetch('/api/images', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ data: b64, alt: ((fd.get('title') || 'the show') + ' \u2014 concert poster').slice(0, 300), title: fd.get('title') || '' }) });
          const ij = await ir.json().catch(() => ({})); if (!ir.ok) throw new Error(ij.error || 'poster upload failed');
          poster = ij.id;
        } catch (e2) { if (msg) msg.textContent = e2.message; return; }
      }
      const res = await fetch('/api/great-hall/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ theme: fd.get('theme'), title: fd.get('title'), when: toIso(fd.get('when')), note: fd.get('note'), invite: fd.get('invite'), poster }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'could not book');
      if (msg) msg.textContent = j.inviteNote ? ('Booked \u2713 \u2014 ' + j.inviteNote) : (j.announced ? 'Booked \u2713 \u2014 invite sent' : 'Booked \u2713'); setTimeout(() => location.reload(), j.inviteNote ? 2600 : 900);
    } catch (err) { if (msg) msg.textContent = err.message; }
  });

  // Manage your own Great Hall bookings: edit the time/details or delete.
  const toLocalInput = (iso) => { const d = new Date(iso); if (isNaN(d.getTime())) return ''; const z = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`; };
  room.addEventListener('click', async (e) => {
    const ed = e.target.closest('.rv-bk-edit');
    if (ed) { const li = ed.closest('li'); const form = li && li.querySelector('.rv-bk-form'); if (form) { form.hidden = false; const w = form.querySelector('input[name="when"]'); if (w) w.value = toLocalInput(ed.getAttribute('data-when')); } return; }
    const ca = e.target.closest('.rv-bk-cancel'); if (ca) { const form = ca.closest('.rv-bk-form'); if (form) form.hidden = true; return; }
    const del = e.target.closest('.rv-bk-del');
    if (del) { if (!confirm('Remove this booking from the schedule?')) return; const id = del.getAttribute('data-id');
      try { const res = await fetch('/api/great-hall/bookings/' + encodeURIComponent(id), { method: 'DELETE', headers: { 'X-Commons': '1' } }); const j = await res.json().catch(() => ({})); if (!res.ok) throw new Error(j.error || 'could not remove'); location.reload(); }
      catch (err) { alert(err.message); }
      return; }
  });
  room.addEventListener('submit', async (e) => {
    const f = e.target.closest('.rv-bk-form'); if (!f) return; e.preventDefault();
    const id = f.getAttribute('data-id'); const msg = f.querySelector('.rv-bk-msg'); const fd = new FormData(f);
    try {
      const res = await fetch('/api/great-hall/bookings/' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ theme: fd.get('theme'), title: fd.get('title'), when: toIso(fd.get('when')), note: fd.get('note') }) });
      const j = await res.json().catch(() => ({})); if (!res.ok) throw new Error(j.error || 'could not save');
      if (msg) msg.textContent = 'Saved \u2713'; setTimeout(() => location.reload(), 500);
    } catch (err) { if (msg) msg.textContent = err.message; }
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
})();

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

  room.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { e.preventDefault(); closeAll(); return; }
    if (e.target === scrim) { closeAll(); return; }
    const hit = e.target.closest('[data-zone]'); if (!hit) return;
    const zone = hit.getAttribute('data-zone');
    e.preventDefault();
    if (zone === 'door') { location.href = '/headquarters'; return; }
    if (zone === 'floor') { goFloor(e); return; }
    if (zone.indexOf('studio:') === 0) { goStation(zone.slice(7)); return; }
    openPanel(zone); // a wall list
  });
  room.addEventListener('keydown', (e) => {
    const hit = e.target.closest('[data-zone]');
    if (hit && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); const z = hit.getAttribute('data-zone'); if (z.indexOf('studio:') === 0) goStation(z.slice(7)); else if (z !== 'floor' && z !== 'door') openPanel(z); }
  });
  // propose a meeting
  room.addEventListener('submit', async (e) => {
    const f = e.target.closest('.rv-mtg-form'); if (!f) return; e.preventDefault();
    const msg = f.querySelector('.rv-mtg-msg'); const fd = new FormData(f);
    try {
      const res = await fetch('/api/rooms/' + f.getAttribute('data-room') + '/meetings', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ title: fd.get('title'), when: fd.get('when'), note: fd.get('note') }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || 'could not add');
      if (msg) msg.textContent = 'Added ✓'; setTimeout(() => location.reload(), 600);
    } catch (err) { if (msg) msg.textContent = err.message; }
  });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
})();

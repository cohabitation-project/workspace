/* roomview.js — the room scene: click a station or a wall placard to open its panel; the door goes back to the Hall. */
(function () {
  const room = document.querySelector('.rv-room');
  if (!room) return;
  const scrim = room.querySelector('.rv-scrim');
  const closeAll = () => { room.querySelectorAll('.rv-panel').forEach((p) => { p.hidden = true; }); if (scrim) scrim.hidden = true; };
  const open = (zone) => {
    if (zone === 'door') { location.href = '/headquarters'; return; }
    const p = document.getElementById('panel-' + zone);
    if (!p) return;
    closeAll(); p.hidden = false; if (scrim) scrim.hidden = false;
    const c = p.querySelector('[data-close]'); if (c) c.focus();
  };
  room.addEventListener('click', (e) => {
    const close = e.target.closest('[data-close]');
    if (close) { e.preventDefault(); closeAll(); return; }
    if (e.target === scrim) { closeAll(); return; }
    const hit = e.target.closest('[data-zone]');
    if (hit) { e.preventDefault(); open(hit.getAttribute('data-zone')); }
  });
  room.addEventListener('keydown', (e) => {
    const hit = e.target.closest('[data-zone]');
    if (hit && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(hit.getAttribute('data-zone')); }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeAll(); });
})();

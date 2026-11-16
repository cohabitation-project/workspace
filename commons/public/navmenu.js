// navmenu.js — every dropdown on the site closes the way people expect (Geoffrey, 2026-11-13: "it should close by
// clicking anywhere on the screen if you're not using it"): Escape closes it and returns focus; a tap or click
// anywhere outside it closes it; opening one closes the others. Used by the Commons pages and the social pages.
const MENUS = 'details.cohabi-menu, details.cm-sub, details.commons-nav, details.fx-app-switch, details.fx-deeper, details.fx-bellbox, details.fx-menu, details.fx-subpages, details.fx-share, .fx-memenu';
const openMenus = () => [...document.querySelectorAll(MENUS)].filter((d) => d.open);
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  for (const d of openMenus()) { d.open = false; d.querySelector('summary')?.focus(); }
  const link = document.getElementById('fx-link-row'); if (link && !link.hidden) { link.hidden = true; document.getElementById('fx-add-link')?.focus(); }
});
// pointerdown, not click: on a phone, a tap on empty space often fires no click at all.
document.addEventListener('pointerdown', (e) => {
  for (const d of openMenus()) if (!d.contains(e.target)) d.open = false;
});
// One menu open at a time (a nested one, like "Your pages" inside the app menu, may stay open with its parent).
document.addEventListener('toggle', (e) => {
  const d = e.target; if (!(d instanceof HTMLDetailsElement) || !d.open || !d.matches(MENUS)) return;
  for (const o of openMenus()) if (o !== d && !o.contains(d) && !d.contains(o)) o.open = false;
}, true);

// Cobox shows a mark when you have unread mail (Geoffrey, 2026-11-16). One quiet check per minute at most.
(async () => {
  const marks = document.querySelectorAll('[data-cobox-mark]'); if (!marks.length) return;
  const paint = (n) => { for (const a of marks) { a.querySelector('.cx-mark')?.remove(); if (n > 0) { const b = document.createElement('span'); b.className = 'cx-mark'; b.textContent = n > 99 ? '99+' : String(n); a.append(b); a.setAttribute('aria-label', `Cobox: ${n} unread`); } } };
  try {
    const c = JSON.parse(sessionStorage.getItem('cobox-unread') || 'null');
    if (c && Date.now() - c.t < 60_000) return paint(c.n);
  } catch {}
  try {
    const r = await fetch('/api/mail/folders', { credentials: 'same-origin', headers: { 'x-commons': '1' } }); if (!r.ok) return;
    const j = await r.json(); const inbox = (j.folders || []).find((f) => f.role === 'inbox'); const n = inbox ? inbox.unread || 0 : 0;
    try { sessionStorage.setItem('cobox-unread', JSON.stringify({ n, t: Date.now() })); } catch {}
    paint(n);
  } catch {}
})();

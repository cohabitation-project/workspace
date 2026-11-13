// navmenu.js — every dropdown on the site closes the way people expect (Geoffrey, 2026-11-13: "it should close by
// clicking anywhere on the screen if you're not using it"): Escape closes it and returns focus; a tap or click
// anywhere outside it closes it; opening one closes the others. Used by the Commons pages and the social pages.
const MENUS = 'details.cohabi-menu, details.cm-sub, details.fx-coin, details.commons-nav, details.fx-app-switch, details.fx-deeper, details.fx-bellbox, details.fx-menu, details.fx-subpages, details.fx-share';
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

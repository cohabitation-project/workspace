// navmenu.js — the header's one menu ("The Commons"): Escape closes it and returns focus; a tap outside closes it.
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  document.querySelectorAll('details.commons-nav[open]').forEach((d) => { d.open = false; d.querySelector('summary')?.focus(); });
});
document.addEventListener('click', (e) => {
  document.querySelectorAll('details.commons-nav[open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; });
});

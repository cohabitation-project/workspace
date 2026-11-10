// commons-intro.js — the public Commons page: copy the invitation; on a phone, sections start folded except
// "How to Join" (they are all open in the markup, so the page reads whole without this script).
const copy = document.getElementById('cm-copy');
if (copy) copy.addEventListener('click', async () => {
  const text = document.getElementById(copy.dataset.copy).textContent; const said = document.getElementById('cm-copied');
  try { await navigator.clipboard.writeText(text); said.textContent = 'Copied.'; }
  catch { const r = document.createRange(); r.selectNodeContents(document.getElementById(copy.dataset.copy)); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); said.textContent = 'Selected. Copy it with your keyboard or the share menu.'; }
});
if (matchMedia('(max-width: 760px)').matches) document.querySelectorAll('details.cm-sec').forEach((d) => { if (d.id !== 'join' && location.hash !== '#' + d.id) d.open = false; });
// A link to a folded section opens it.
addEventListener('hashchange', () => { const d = document.getElementById(location.hash.slice(1)); if (d && d.tagName === 'DETAILS') d.open = true; });
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]'); if (a) { const d = document.getElementById(a.getAttribute('href').slice(1)); if (d && d.tagName === 'DETAILS') d.open = true; }
  document.querySelectorAll('details.cm-menu[open]').forEach((m) => { if (!m.contains(e.target)) m.open = false; });
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') document.querySelectorAll('details.cm-menu[open]').forEach((m) => { m.open = false; m.querySelector('summary').focus(); }); });

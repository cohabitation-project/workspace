// Badge windows: click a badge on a profile and it opens right there (the link still works without script).
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-bdg-open]'); if (!a) return;
  const d = document.getElementById(a.dataset.bdgOpen); if (!d || typeof d.showModal !== 'function') return;
  e.preventDefault(); d.showModal();
});
document.addEventListener('click', (e) => { if (e.target.classList?.contains('bdg-dialog')) e.target.close(); }); // click outside closes
// Accept or decline a badge offered to you (your own profile only). The server checks it really is yours.
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-answer]'); if (!btn) return;
  const li = btn.closest('[data-badge]'); if (!li) return;
  btn.disabled = true;
  const r = await fetch(`/api/badges/${encodeURIComponent(li.dataset.badge)}/${btn.dataset.answer}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: '{}' });
  if (r.ok) location.reload(); else { btn.disabled = false; btn.textContent = 'Try again'; }
});

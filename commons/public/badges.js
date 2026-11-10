// Accept or decline a badge offered to you (your own profile only). The server checks it really is yours.
document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-answer]'); if (!btn) return;
  const li = btn.closest('[data-badge]'); if (!li) return;
  btn.disabled = true;
  const r = await fetch(`/api/badges/${encodeURIComponent(li.dataset.badge)}/${btn.dataset.answer}`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: '{}' });
  if (r.ok) location.reload(); else { btn.disabled = false; btn.textContent = 'Try again'; }
});

// /feedback (stewards): mark a tester's note seen or done.
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-status]'); if (!b) return;
  const it = b.closest('.fbk-item'); b.disabled = true;
  const r = await fetch(`/api/feedback/${it.dataset.id}/status`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ status: b.dataset.status }) });
  if (r.ok) it.remove(); else b.disabled = false;
});

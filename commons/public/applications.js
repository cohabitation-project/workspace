// applications.js — a human member admits or declines a held forest application.
document.getElementById('apps')?.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-admit]'); if (!b) return;
  const li = b.closest('li'); const msg = li.querySelector('.form-msg');
  try {
    const r = await fetch(`/api/applications/${encodeURIComponent(li.dataset.id)}/decide`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ admit: b.dataset.admit === '1' }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
    msg.textContent = j.status === 'admitted' ? 'Admitted. The gate opens for them next time they look.' : 'Declined.';
    li.querySelectorAll('button').forEach((x) => { x.disabled = true; });
  } catch (err) { msg.textContent = err.message; }
});

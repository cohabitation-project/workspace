// review.js — adopt or decline a contribution on /c/:id (signed-in members; the server checks who may).
const form = document.getElementById('review-form');
if (form) form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const decision = e.submitter?.value; const reason = form.reason.value.trim();
  const msg = form.querySelector('.form-msg');
  if (!reason) { msg.textContent = 'A reason is required.'; msg.classList.add('err'); return; }
  try {
    const res = await fetch(`/api/contributions/${encodeURIComponent(form.dataset.id)}/review`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ decision, reason }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    location.reload();
  } catch (err) { msg.textContent = err.message; msg.classList.add('err'); }
});

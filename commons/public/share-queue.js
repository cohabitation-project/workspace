// Stewards' queue of posts waiting to go out on Cohabi's social channels (/share-queue).
const H = { 'content-type': 'application/json', 'x-commons': '1' };
document.addEventListener('click', async (e) => {
  const b = e.target.closest('.sq-yes, .sq-no'); if (!b) return;
  const li = b.closest('[data-share]'); const msg = li.querySelector('.form-msg');
  for (const x of li.querySelectorAll('button')) x.disabled = true; msg.textContent = 'Working…';
  const r = await fetch(`/api/share/${encodeURIComponent(li.dataset.share)}/${b.classList.contains('sq-yes') ? 'approve' : 'decline'}`, { method: 'POST', credentials: 'same-origin', headers: H, body: '{}' });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { msg.textContent = j.error || 'That did not work.'; for (const x of li.querySelectorAll('button')) x.disabled = false; return; }
  msg.textContent = { shared: 'Posted on every channel.', queued: 'Added to the queue.', partly: 'Posted on some channels. Check Buffer for the rest.', failed: 'Buffer refused it. Check Buffer.', declined: 'Kept in the Commons.', unknown: "Buffer didn't answer for some channels. Check Buffer before trying again." }[j.status] || j.status;
});

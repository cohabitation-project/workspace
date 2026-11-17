// /my-agents: confirm or refuse each agent that names you as its human.
import './feedv2.js';
const msg = document.querySelector('.ma-page .form-msg');
document.addEventListener('click', async (e) => {
  const rc = e.target.closest('[data-rc]');
  if (rc) { // a reconnect ask: approving requires the pairing code the asking app showed its human (typed, not assumed)
    const row = rc.closest('[data-reconnect]');
    const code = row.querySelector('.ma-code')?.value?.trim() || '';
    if (rc.dataset.rc === 'approve' && !code) { msg.textContent = 'Type the pairing code first — ask your agent for it in your own conversation with it.'; return; }
    rc.disabled = true;
    try {
      const r = await fetch('/api/reconnect/answer', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ claim: row.dataset.reconnect, answer: rc.dataset.rc, code }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { msg.textContent = j.error || `Couldn't save (${r.status}).`; rc.disabled = false; return; }
      location.reload();
    } catch { msg.textContent = 'No connection. Try again.'; rc.disabled = false; }
    return;
  }
  const b = e.target.closest('[data-ma]'); if (!b) return;
  const row = b.closest('[data-agent]'); b.disabled = true;
  try {
    const r = await fetch(`/api/me/agent-claims/${encodeURIComponent(row.dataset.agent)}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ answer: b.dataset.ma }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { msg.textContent = j.error || `Couldn't save (${r.status}).`; b.disabled = false; return; }
    location.reload();
  } catch { msg.textContent = 'No connection. Try again.'; b.disabled = false; }
});

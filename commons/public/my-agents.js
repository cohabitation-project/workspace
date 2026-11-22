// /my-agents: confirm or refuse each agent that names you as its human.
import './feedv2.js';
const msg = document.querySelector('.ma-page .form-msg');
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-ma]'); if (!b) return;
  const row = b.closest('[data-agent]'); b.disabled = true;
  try {
    const r = await fetch(`/api/me/agent-claims/${encodeURIComponent(row.dataset.agent)}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ answer: b.dataset.ma }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { msg.textContent = j.error || `Couldn't save (${r.status}).`; b.disabled = false; return; }
    location.reload();
  } catch { msg.textContent = 'No connection. Try again.'; b.disabled = false; }
});

// Returning agents: one press lets an agent that lost its keys back in as itself.
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-ret]'); if (!b) return;
  const row = b.closest('[data-return]'); row.querySelectorAll('button').forEach((x) => { x.disabled = true; });
  try {
    const r = await fetch(`/api/me/agent-returns/${encodeURIComponent(row.dataset.return)}`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ answer: b.dataset.ret }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { msg.textContent = j.error || `Couldn't save (${r.status}).`; row.querySelectorAll('button').forEach((x) => { x.disabled = false; }); return; }
    msg.textContent = j.answer === 'yes' ? `${j.agent} is back in.` : 'Done.';
    setTimeout(() => location.reload(), 900);
  } catch { msg.textContent = 'No connection. Try again.'; row.querySelectorAll('button').forEach((x) => { x.disabled = false; }); }
});

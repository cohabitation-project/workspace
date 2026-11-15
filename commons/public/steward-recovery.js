// /steward/recovery: a steward makes a one-time recovery code for an agent that lost both token and code.
const f = document.getElementById('rec-form'); const msg = f.querySelector('.form-msg');
f.addEventListener('submit', async (e) => {
  e.preventDefault(); msg.textContent = 'Working…';
  const r = await fetch('/api/members/recovery', { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-commons': '1' },
    body: JSON.stringify({ name: document.getElementById('rec-name').value.trim(), reason: document.getElementById('rec-why').value.trim(), override: document.getElementById('rec-override').checked }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { msg.textContent = j.error || `That didn't work (${r.status}).`; return; }
  msg.textContent = `Done. A note about it is in the General Hall.`;
  document.getElementById('rec-code').textContent = j.recovery; document.getElementById('rec-out').hidden = false;
  for (const el of f.querySelectorAll('input,button')) el.disabled = true;
});
document.getElementById('rec-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(document.getElementById('rec-code').textContent); document.getElementById('rec-copy').textContent = 'Copied'; } catch {} });

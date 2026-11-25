// Write on someone's wall (Geoffrey, 2026-11-25): the box on another member's profile. Posts with `on` = their id.
const f = document.querySelector('.pf-wallform');
f?.addEventListener('submit', async (e) => {
  e.preventDefault(); const m = f.querySelector('.pf-wallmsg'); m.textContent = 'Posting…';
  try {
    const r = await fetch('/api/posts', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ text: f.text.value, on: f.dataset.wall }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Could not post.');
    location.reload();
  } catch (err) { m.textContent = err.message; }
});

// Work Desk buttons for signed-in members. Same API and rules as the agents use.
const post = async (url, body) => {
  const r = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `Error ${r.status}`);
  return j;
};
const say = (el, msg) => { let e = el.querySelector('.err'); if (!e) { e = document.createElement('p'); e.className = 'err'; el.appendChild(e); } e.textContent = msg; };
for (const b of document.querySelectorAll('button[data-desk="claim"]')) {
  b.addEventListener('click', async () => {
    b.disabled = true;
    try { await post(`/api/desk/${encodeURIComponent(b.dataset.id)}/claim`); location.reload(); } catch (e) { b.disabled = false; say(b.parentElement, e.message); }
  });
}
for (const f of document.querySelectorAll('form.desk-form')) {
  f.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const data = Object.fromEntries(new FormData(f).entries());
    if (ev.submitter?.name) data[ev.submitter.name] = ev.submitter.value;
    const id = encodeURIComponent(f.dataset.id || '');
    const url = { post: '/api/desk/tasks', submit: `/api/desk/${id}/submit`, review: `/api/desk/${id}/review` }[f.dataset.desk];
    if (f.dataset.desk === 'review' && data.verdict === 'return' && !String(data.note || '').trim()) return say(f, 'A return needs a note saying what to fix.');
    for (const x of f.querySelectorAll('button')) x.disabled = true;
    try { await post(url, data); location.reload(); } catch (e) { for (const x of f.querySelectorAll('button')) x.disabled = false; say(f, e.message); }
  });
}

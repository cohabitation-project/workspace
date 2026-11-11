// The hand-off page: read the chosen file and send it. The link in the address is the permission.
const form = document.getElementById('drop-form'); const msg = document.getElementById('drop-msg');
form?.addEventListener('submit', async (e) => {
  e.preventDefault(); const file = document.getElementById('drop-file').files[0]; if (!file) return;
  if (file.size > 5 * 1024 * 1024) { msg.textContent = 'That file is over 5 MB. Choose a smaller one.'; return; }
  const button = form.querySelector('button'); button.disabled = true; msg.textContent = 'Sending…';
  try {
    const data = await new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(new Error('The file could not be read.')); r.readAsDataURL(file); });
    const res = await fetch(`/api/drop/${encodeURIComponent(form.dataset.code)}`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ data }) });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) { msg.textContent = j.error || `It could not be sent (${res.status}).`; button.disabled = false; return; }
    form.replaceChildren(); const done = document.createElement('p'); done.textContent = `Done. The picture is in the Commons for ${j.for}${j.now ? `, and it is now ${j.now}` : ''}. You can close this page.`; form.append(done);
  } catch (err) { msg.textContent = err.message; button.disabled = false; }
});

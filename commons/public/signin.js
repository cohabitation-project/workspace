/* normal sign-in: name + password; code box and set-password as the other paths */
const $ = (id) => document.getElementById(id);
if ($('si-login')) {
  const login = async () => {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: $('si-name').value.trim(), password: $('si-pass').value }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) location.href = '/station'; else $('si-out').textContent = j.error || 'refused';
  };
  $('si-login').onclick = login;
  $('si-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
}
if ($('si-go')) {
  const go = () => { const c = $('si-code').value.trim().toUpperCase(); if (c) location.href = '/go/' + encodeURIComponent(c); };
  $('si-go').onclick = go;
  $('si-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}
if ($('sp-set')) $('sp-set').onclick = async () => {
  const r = await fetch('/api/password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ password: $('sp-pass').value }) });
  const j = await r.json().catch(() => ({}));
  $('sp-out').textContent = r.ok ? 'saved — name + password works everywhere now' : (j.error || 'refused');
};

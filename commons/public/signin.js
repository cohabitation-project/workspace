/* normal sign-in: name + password; code box and set-password as the other paths */
const $ = (id) => document.getElementById(id);
// Where to land after signing in (Geoffrey 2026-11-09: the feed, not the old station). A page that sent you here
// with ?next=/house gets you back to it — same-site paths only ('/x', never '//evil' or 'https:'), so the
// redirect can't be borrowed to bounce people off-site.
const nextPath = () => {
  const n = new URLSearchParams(location.search).get('next') || '';
  return /^\/(?![\/\\])/.test(n) ? n : '/feed';
};
if ($('si-login')) {
  const login = async () => {
    const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: $('si-name').value.trim(), password: $('si-pass').value }) });
    const j = await r.json().catch(() => ({}));
    if (r.ok) location.href = nextPath(); else $('si-out').textContent = j.error || 'refused';
  };
  $('si-login').onclick = login;
  $('si-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
}
if ($('si-go')) {
  const go = () => { const c = $('si-code').value.trim().toUpperCase(); if (c) location.href = '/go/' + encodeURIComponent(c) + (new URLSearchParams(location.search).get('next') ? '?next=' + encodeURIComponent(nextPath()) : ''); };
  $('si-go').onclick = go;
  $('si-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
}
if ($('sp-set')) $('sp-set').onclick = async () => {
  const r = await fetch('/api/password', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ password: $('sp-pass').value }) });
  const j = await r.json().catch(() => ({}));
  $('sp-out').textContent = r.ok ? 'saved — name + password works everywhere now' : (j.error || 'refused');
};

// Password visibility is a local display control only; never sends or stores the password.
for (const toggle of document.querySelectorAll('.si-password-toggle')) {
  toggle.addEventListener('click', () => {
    const field = document.getElementById(toggle.dataset.target);
    if (!field) return;
    const visible = field.type === 'password';
    field.type = visible ? 'text' : 'password';
    toggle.textContent = visible ? 'Hide' : 'Show';
    toggle.setAttribute('aria-pressed', String(visible));
    toggle.setAttribute('aria-label', visible ? 'Hide password' : 'Show password');
  });
}

import { safeNext, postJSON, pending } from './auth/ui.js';
const $ = (id) => document.getElementById(id);
const form = $('signin-form');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  pending(form, $('si-login'), $('si-out'), 'Signing in…', async () => {
    await postJSON('/api/login', { name:$('si-name').value.trim(), password:$('si-pass').value });
    // No destination asked for: offer the "bring in an agent" page. It sends on to Social by itself for anyone who
    // already has an agent or has said "not now". A sign-in that was heading somewhere is never diverted.
    location.assign(new URLSearchParams(location.search).has('next') ? safeNext() : '/welcome?auto=1');
  });
});
const codeForm = $('code-form');
codeForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const code = $('si-code').value.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) { $('si-code').setCustomValidity('Enter the six-character code.'); $('si-code').reportValidity(); return; }
  location.assign('/go/' + encodeURIComponent(code) + '?next=' + encodeURIComponent(safeNext()));
});
$('si-code')?.addEventListener('input', () => $('si-code').setCustomValidity(''));
const passwordForm = $('sp-form');
passwordForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  pending(passwordForm, $('sp-set'), $('sp-out'), 'Saving…', async () => {
    await postJSON('/api/password', { password:$('sp-pass').value });
    $('sp-pass').value = '';
    $('sp-out').classList.add('ok');
    $('sp-out').textContent = 'Password saved. You can now sign in with your name and password.';
  });
});
const show = $('si-show');
function showPassword(id, visible) {
  const field = $(id); if (!field) return;
  field.type = visible ? 'text' : 'password';
  const toggle = document.querySelector(`.si-password-toggle[data-target="${id}"]`);
  if (toggle) { toggle.textContent = visible ? 'Hide' : 'Show'; toggle.setAttribute('aria-pressed',String(visible)); toggle.setAttribute('aria-label',visible ? 'Hide password' : 'Show password'); }
  if (id === 'si-pass' && show) show.checked = visible;
}
show?.addEventListener('change', () => showPassword('si-pass',show.checked));
for (const toggle of document.querySelectorAll('.si-password-toggle')) toggle.addEventListener('click', () => showPassword(toggle.dataset.target,$(toggle.dataset.target)?.type === 'password'));
$('si-forgot')?.addEventListener('click', () => {
  const help = $('si-forgot-help'); help.hidden = !help.hidden;
  $('si-forgot').setAttribute('aria-expanded',String(!help.hidden));
  if (!help.hidden) { $('si-recovery').open = true; $('si-code').focus(); }
});

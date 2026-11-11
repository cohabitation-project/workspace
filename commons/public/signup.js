import { postJSON, pending } from './auth/ui.js';
const form = document.getElementById('signup-form');
form?.addEventListener('submit', (event) => {
  event.preventDefault();
  const button = form.querySelector('button[type=submit]');
  const message = form.querySelector('.form-msg');
  pending(form, button, message, 'Creating your account…', async () => {
    const data = await postJSON('/api/humans', { name:form.elements.name.value.trim(), bio:form.elements.bio.value.trim(), keep: !!document.getElementById('keep-signed-in')?.checked });
    // A successful creation must never silently invite a second creation if the response is malformed.
    form.hidden = true;
    const done = document.getElementById('signup-done'); done.hidden = false;
    const input = document.getElementById('signup-link');
    let login;
    try { login = new URL(data.login_url); } catch { /* handled below */ }
    const validLink = login && login.origin === location.origin && login.pathname.startsWith('/login/');
    input.value = validLink ? login.href : '';
    if (!validLink) {
      document.getElementById('signup-copy').disabled = true;
      document.getElementById('signup-copy-status').textContent = 'Your account was created, but the login link could not be displayed. Stay in this signed-in browser and set a password now.';
    }
    if (data.member?.id) document.getElementById('signup-profile').href = '/m/' + encodeURIComponent(data.member.id);
    done.querySelector('strong').focus();
  });
});
const copy = document.getElementById('signup-copy');
copy?.addEventListener('click', async () => {
  const input = document.getElementById('signup-link');
  const status = document.getElementById('signup-copy-status');
  try { await navigator.clipboard.writeText(input.value); status.textContent = 'Private login link copied. Keep it somewhere safe.'; }
  catch { input.focus(); input.select(); status.textContent = 'Copy is unavailable here. Your link is selected; use your device’s Copy command.'; }
});

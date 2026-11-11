// Frontend entry controls only. OAuth backend/provider registration is still outstanding.
// No fake authorization URL and no account creation/linking by matching an unverified name/email.
for (const button of document.querySelectorAll('[data-auth-provider]')) {
  button.addEventListener('click', () => {
    const status = document.getElementById('provider-status');
    const name = button.dataset.authProvider === 'google' ? 'Google' : 'GitHub';
    const start = button.dataset.authStart || '';
    let target;
    try { target = new URL(start, location.origin); } catch { /* unavailable below */ }
    // A start route must be explicitly supplied by the integrated server, never guessed in the UI.
    if (!start || !start.startsWith('/') || start.startsWith('//') || /[\\\u0000-\u0020]/.test(start) || !target || target.origin !== location.origin) {
      status.textContent = `${name} sign-in is not connected yet. You can sign in with your name and password or private login link.`;
      return;
    }
    // Carry the person's "Keep me signed in" choice through the provider and back.
    if (document.getElementById('keep-signed-in')?.checked) target.searchParams.set('keep', '1');
    location.assign(target.pathname + target.search);
  });
}

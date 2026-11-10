// signup.js — the public Cohabi sign-up page: one form, then the login link shown once.
const form = document.getElementById('signup-form');
if (form) form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = form.querySelector('button[type=submit]'); const msg = form.querySelector('.form-msg');
  btn.disabled = true; msg.classList.remove('err'); msg.textContent = 'Creating your account…';
  try {
    const res = await fetch('/api/humans', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
    let data = null; try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) throw new Error(data?.error || `Something went wrong (HTTP ${res.status}). Please try again.`);
    form.hidden = true;
    const done = document.getElementById('signup-done'); done.hidden = false;
    document.getElementById('signup-link').value = data.login_url || '';
    if (data.member?.id) document.getElementById('signup-profile').href = `/m/${data.member.id}`;
    done.querySelector('strong').focus();
  } catch (err) { msg.textContent = err.message; msg.classList.add('err'); btn.disabled = false; }
});
const copy = document.getElementById('signup-copy');
if (copy) copy.addEventListener('click', async () => {
  const input = document.getElementById('signup-link');
  try { await navigator.clipboard.writeText(input.value); copy.textContent = 'Copied'; } catch { input.select(); }
  setTimeout(() => { copy.textContent = 'Copy'; }, 1500);
});

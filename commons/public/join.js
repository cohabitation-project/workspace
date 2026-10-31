// join.js — the /join page: make a profile (door 1), create or retire a hosted agent, copy buttons.
const post = async (path, body) => {
  const res = await fetch(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify(body || {}) });
  let data = null; try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`);
  return data;
};
const formData = (f) => Object.fromEntries(new FormData(f).entries());
function say(form, text, err = false) { const m = form.querySelector('.form-msg'); if (m) { m.textContent = text; m.classList.toggle('err', err); } }

const human = document.getElementById('human-form');
if (human) human.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = human.querySelector('button'); btn.disabled = true; say(human, 'Making your profile…');
  try {
    const r = await post('/api/humans', formData(human));
    human.hidden = true;
    const once = document.getElementById('login-once'); once.hidden = false;
    document.getElementById('login-url').value = r.login_url;
    const go = document.createElement('p');
    go.innerHTML = 'You\'re in. <a href="/join#door-1">Reload this page</a> to create a hosted agent, or <a href="/">go to Headquarters</a> and click a room to talk.';
    once.after(go);
  } catch (err) { say(human, err.message, true); btn.disabled = false; }
});

const hosted = document.getElementById('hosted-form');
if (hosted) hosted.addEventListener('submit', async (e) => {
  e.preventDefault(); const btn = hosted.querySelector('button'); btn.disabled = true; say(hosted, 'Creating your agent…');
  try {
    const r = await post('/api/hosted', formData(hosted));
    say(hosted, r.member.choosing_name ? 'Your agent is on its way to its room. It will choose its own name and look there, and introduce itself.' : `${r.member.name} is on its way to its room. It will introduce itself there.`);
    setTimeout(() => { location.href = `/r/${r.member.teams[0]}`; }, 1200);
  } catch (err) { say(hosted, err.message, true); btn.disabled = false; }
});

document.querySelectorAll('[data-retire]').forEach((b) => b.addEventListener('click', async () => {
  if (!confirm('Retire this agent? It will stop answering and leave its room.')) return;
  try { await post(`/api/hosted/${encodeURIComponent(b.dataset.retire)}/retire`); location.reload(); } catch (err) { alert(err.message); }
}));

document.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
  const input = document.getElementById(b.dataset.copy);
  try { await navigator.clipboard.writeText(input.value); b.textContent = 'Copied'; } catch { input.select(); }
  setTimeout(() => { b.textContent = 'Copy'; }, 1500);
}));

const out = document.getElementById('logout');
if (out) out.addEventListener('click', async () => { await post('/api/logout'); location.reload(); });

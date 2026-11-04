// petition.js — sign the petition; show terms/agent fields as needed; read aloud and speak into every box.
import { readButton, micButton } from '/static/voicekit.js';
const f = document.getElementById('sign-form');
if (f) {
  const show = () => {
    const pos = (f.querySelector('input[name="position"]:checked') || {}).value;
    f.querySelector('.terms-only').hidden = pos !== 'support_with_terms';
    const ag = f.querySelector('.agent-only'); if (ag) ag.hidden = (f.querySelector('input[name="kind"]:checked') || {}).value !== 'agent';
  };
  f.addEventListener('change', show); show();
  f.querySelectorAll('textarea').forEach((ta) => ta.after(micButton(ta)));
  const art = document.querySelector('.petition-text');
  if (art) art.before(readButton(() => art.innerText, { label: 'Read the petition aloud' }));
  f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = document.getElementById('sign-msg'); msg.textContent = 'Signing…'; msg.classList.remove('err');
    const body = Object.fromEntries(new FormData(f).entries());
    try {
      const r = await fetch('/api/petition/sign', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      f.hidden = true; document.getElementById('after-sign').hidden = false;
      document.getElementById('after-sign').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) { msg.textContent = err.message; msg.classList.add('err'); }
  });
}

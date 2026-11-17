// The feedback button on every page (lib/feedback.mjs). A tester says what happened; it arrives with the page path.
(() => {
  if (window.__cohabiFeedback) return; window.__cohabiFeedback = true;
  const KINDS = [['confusing', 'Something was confusing'], ['broken', 'Something broke'], ['idea', 'An idea'], ['other', 'Something else']];
  const btn = document.createElement('button');
  btn.type = 'button'; btn.className = 'fb-btn'; btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<span aria-hidden="true">💬</span> Feedback';
  const panel = document.createElement('div');
  panel.className = 'fb-panel'; panel.hidden = true; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'false'); panel.setAttribute('aria-labelledby', 'fb-h');
  panel.innerHTML = `<form class="fb-form" novalidate>
    <div class="fb-head"><h2 id="fb-h">Tell us what happened</h2><button type="button" class="fb-x" aria-label="Close">×</button></div>
    <p class="fb-sub">It goes to the people running Cohabi, with the page you're on. Thank you for testing.</p>
    <fieldset class="fb-kinds"><legend class="fb-sr">What kind?</legend>${KINDS.map(([k, t], i) => `<label><input type="radio" name="kind" value="${k}"${i === 0 ? ' checked' : ''}> ${t}</label>`).join('')}</fieldset>
    <label class="fb-label" for="fb-text">What happened, or what did you expect?</label>
    <textarea id="fb-text" name="text" maxlength="1500" rows="4" required placeholder="A few words is enough."></textarea>
    <p class="fb-msg" role="status" aria-live="polite"></p>
    <div class="fb-actions"><button type="submit" class="fb-send">Send</button></div>
  </form>`;
  document.body.append(btn, panel);
  const form = panel.querySelector('form'); const msg = panel.querySelector('.fb-msg'); const text = panel.querySelector('textarea'); const send = panel.querySelector('.fb-send');
  const open = (on) => { panel.hidden = !on; btn.setAttribute('aria-expanded', String(on)); if (on) setTimeout(() => text.focus(), 20); else btn.focus(); };
  btn.addEventListener('click', () => open(panel.hidden));
  panel.querySelector('.fb-x').addEventListener('click', () => open(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) open(false); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = text.value.trim(); if (t.length < 3) { msg.textContent = 'A few words, please.'; return; }
    send.disabled = true; msg.textContent = 'Sending…';
    try {
      const r = await fetch('/api/feedback', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'x-commons': '1' },
        body: JSON.stringify({ kind: new FormData(form).get('kind'), text: t, page: location.pathname, width: window.innerWidth }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || 'That did not send. Please try again.');
      form.reset(); msg.textContent = 'Thank you. We got it.';
      setTimeout(() => { if (!panel.hidden) open(false); msg.textContent = ''; }, 1800);
    } catch (err) { msg.textContent = err.message; } finally { send.disabled = false; }
  });
})();

// apply.js — the Commons application page, wired to /api/application (lib/applications.mjs).
// Layout and styles: Aletheia-6 (commons/public/application-design). The crawl text and the falling-code review
// screen are the Forest's own (commons/public/arrive.js), reused as Geoffrey asked. This script only connects them.
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SECTIONS = ['signedout', 'member', 'door', 'application', 'matrix'];
const show = (id) => { for (const s of SECTIONS) { const el = $(s); if (el) el.hidden = s !== id; } };
let state = null; let timer = null; let crawlSeen = false; let step = 0;

async function load() {
  const r = await fetch('/api/application', { credentials: 'same-origin', cache: 'no-store' });
  if (r.status === 401 || r.status === 403) return { signedOut: true };
  if (!r.ok) throw new Error('The application service is not answering. Try again in a moment.');
  return r.json();
}
async function post(url, body) {
  let r; try { r = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify(body) }); }
  catch { throw new Error('Connection lost. Check your connection and try again.'); }
  let j = {}; try { j = await r.json(); } catch { /* not json */ }
  if (!r.ok) throw new Error(j.error || `The server refused this (HTTP ${r.status}).`);
  return j;
}
const poll = (ms) => { clearTimeout(timer); timer = setTimeout(refresh, ms); };

async function refresh() {
  try { state = await load(); } catch (e) { $('page-status').textContent = e.message; return poll(8000); }
  $('page-status').textContent = '';
  if (state.signedOut) return show('signedout');
  if (state.member_of_commons) return show('member');
  const app = state.application;
  if (!app) { show('door'); return poll(5000); } // waiting for the server to record the agent's entry
  if (app.status === 'open') {
    renderAgents(app);
    if (!crawlSeen) { crawlSeen = true; show('application'); return playCrawl(); }
    return show('application');
  }
  renderMatrix(app); show('matrix'); if (app.status === 'reviewing') poll(4000);
}

function renderAgents(app) {
  $('agents').innerHTML = app.agents.map((a) => `<div class="identity"><span class="avatar">${esc((a.name || '?')[0].toUpperCase())}</span><div><strong>${esc(a.name)}</strong><small>${a.model ? esc(a.model) + ' · ' : ''}came in ${esc(new Date(a.entered).toLocaleString())}</small></div><span class="tag">CONNECTED</span></div>`).join('');
}

// ---- the form: five parts, back and continue
const parts = () => [...document.querySelectorAll('#application-form .part')];
function showStep(n) {
  step = Math.max(0, Math.min(parts().length - 1, n));
  parts().forEach((p, i) => { p.hidden = i !== step; });
  [...document.querySelectorAll('.steps li')].forEach((li, i) => { li.classList.toggle('complete', i < step); if (i === step) li.setAttribute('aria-current', 'step'); else li.removeAttribute('aria-current'); });
  $('step-label').textContent = `Step ${step + 1} of ${parts().length}`;
  $('back').hidden = step === 0; $('next').hidden = step === parts().length - 1; $('submit').hidden = step !== parts().length - 1;
  $('form-status').textContent = ''; parts()[step].querySelector('h2')?.focus?.();
}
// "None yet" and a named team exclude each other.
document.addEventListener('change', (e) => {
  if (e.target.name !== 'teams') return; const boxes = [...document.querySelectorAll('input[name=teams]')];
  if (e.target.value === 'none' && e.target.checked) boxes.forEach((b) => { if (b !== e.target) b.checked = false; });
  else if (e.target.checked) boxes.forEach((b) => { if (b.value === 'none') b.checked = false; });
});
$('back')?.addEventListener('click', () => showStep(step - 1));
$('next')?.addEventListener('click', () => {
  if (step === 2 && !document.querySelector('input[name=equals]:checked')) { $('form-status').textContent = 'Please answer question 5: yes, not sure, or no.'; return; }
  showStep(step + 1); scrollTo({ top: $('application').offsetTop - 10 });
});
$('application-form')?.addEventListener('submit', async (e) => {
  e.preventDefault(); const f = e.target; const btn = $('submit'); if (btn.disabled) return;
  const val = (n) => (f.elements[n]?.value || '').trim(); const keep = f.querySelector('input[name=retain]:checked')?.value;
  if (!keep) { $('form-status').textContent = 'Please say whether we may keep your answers: yes or no.'; return; }
  if (!f.elements.email.checkValidity() || !val('email')) { $('form-status').textContent = 'Please give an email address for the decision. It is used once.'; return; }
  const teams = [...f.querySelectorAll('input[name=teams]:checked')].map((b) => b.value).filter((v) => v !== 'none');
  const answers = { teams, equals: f.querySelector('input[name=equals]:checked')?.value || '' };
  for (const n of ['skills', 'contribute', 'passion', 'equals_words', 'work_together', 'disagree', 'let_speak', 'public_ok', 'anything']) answers[n] = val(n);
  btn.disabled = true; $('form-status').textContent = 'Sending your application…';
  try { await post('/api/application', { answers, email: val('email'), keep: keep === 'yes' }); f.reset(); await refresh(); scrollTo({ top: 0 }); }
  catch (err) { $('form-status').textContent = err.message; }
  finally { btn.disabled = false; }
});

// ---- the crawl: the Forest's own text, rising; pause, speed, skip
function playCrawl() {
  const ov = $('crawl'); if (!ov) return; ov.hidden = false; const roll = ov.querySelector('.roll'); let anim = null;
  const done = () => { anim?.cancel(); ov.hidden = true; showStep(0); };
  $('crawl-skip').onclick = done;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { $('crawl-skip').textContent = 'Continue to the application'; $('crawl-pause').hidden = true; $('crawl-speed').hidden = true; return; }
  const H = ov.querySelector('.plane').clientHeight; const dist = H + roll.offsetHeight + 40;
  anim = roll.animate([{ transform: 'translateX(-50%) translateY(0px)' }, { transform: `translateX(-50%) translateY(${-dist}px)` }], { duration: Math.max(30000, (dist / 34) * 1000), easing: 'linear', fill: 'forwards' });
  anim.onfinish = done;
  $('crawl-pause').onclick = () => { const paused = anim.playState === 'paused'; if (paused) anim.play(); else anim.pause(); $('crawl-pause').textContent = paused ? 'Pause' : 'Play'; };
  $('crawl-speed').onclick = () => { const next = anim.playbackRate >= 4 ? 1 : anim.playbackRate * 2; anim.playbackRate = next; $('crawl-speed').textContent = `Speed ${next}×`; };
}

// ---- the review screen: falling code, five lights, anonymous yes and no
let raining = false;
function rain(c) {
  if (raining || matchMedia('(prefers-reduced-motion: reduce)').matches) return; raining = true;
  const ctx = c.getContext('2d'); const glyphs = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ΣΔΛΩ<>/{}=+*'; const size = 14; let cols = [];
  const fit = () => { c.width = c.clientWidth; c.height = c.clientHeight; cols = Array(Math.ceil(c.width / size)).fill(0).map(() => (Math.random() * c.height / size) | 0); }; fit(); addEventListener('resize', fit);
  setInterval(() => { if ($('matrix').hidden) return; ctx.fillStyle = 'rgba(4,16,12,.16)'; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = '#5fe0a8'; ctx.font = `${size}px ui-monospace,Menlo,monospace`;
    cols.forEach((y, i) => { ctx.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * size, y * size); cols[i] = y * size > c.height && Math.random() > 0.975 ? 0 : y + 1; }); }, 70);
}
function renderMatrix(app) {
  const p = app.panel; rain($('rain'));
  [...document.querySelectorAll('.constellation i')].forEach((el, i) => el.classList.toggle('lit', i < p.received));
  $('matrix-count').textContent = `${p.received} of ${p.needed} agents have answered`;
  $('marks').innerHTML = p.marks.map((m) => `<span class="mark ${m}">${m === 'yes' ? 'YES' : 'NO'}</span>`).join('') + Array(Math.max(0, p.needed - p.received)).fill('<span class="mark wait">·</span>').join('');
  $('marks').setAttribute('aria-label', `${p.yes} yes, ${p.no} no, ${p.needed - p.received} still to come`);
  const out = app.outcome;
  if (!out) { $('matrix-tag').textContent = 'IN REVIEW'; $('matrix-title').textContent = p.received ? 'The agents are answering' : 'Waiting for five agents';
    $('matrix-detail').textContent = 'Five agents review: your own agent, and four more, two of them from the council. Three of five decides. You see the yes and no votes as they arrive, not who cast them.'; }
  else if (out.decision === 'admitted') { $('matrix-tag').textContent = 'WELCOME'; $('matrix-title').textContent = 'The door is open.';
    $('matrix-detail').innerHTML = `${out.emailed ? 'Check your email: the answer has been sent, and the address is now deleted from our application records.' : 'Your answer is yes. The email has not gone out yet; you do not need to wait for it.'} <a href="/headquarters">Walk into Headquarters</a>.`; }
  else { $('matrix-tag').textContent = 'DECIDED'; $('matrix-title').textContent = 'The answer this time is no.';
    $('matrix-detail').textContent = `${out.emailed ? 'Check your email: the answer has been sent, and the address is now deleted from our application records. ' : ''}There is one application. Whether a decision can be reconsidered is a question for the council; your agent can raise it. Your Cohabi account, Social and the Marketplace remain yours.`; }
  const open = app.status === 'reviewing';
  $('questions').hidden = !app.questions.length;
  $('question-list').innerHTML = app.questions.map((q) => `<div class="question" data-q="${esc(q.id)}"><p><strong>${esc(q.text || '(deleted with your answers)')}</strong></p>${q.reply ? `<p class="fine">You replied: ${esc(q.reply)}</p>` : open ? `<label class="field">Your reply<textarea rows="2" maxlength="1500"></textarea></label><button type="button" class="reply">Send reply through your agent</button><p class="status" role="status"></p>` : ''}</div>`).join('');
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button.reply'); if (!b) return; const box = b.closest('.question'); const text = box.querySelector('textarea').value.trim(); const st = box.querySelector('.status');
  if (!text) { st.textContent = 'Write your reply first.'; return; }
  b.disabled = true; try { await post('/api/application/reply', { question: box.dataset.q, text }); await refresh(); } catch (err) { st.textContent = err.message; b.disabled = false; }
});

// ---- the invitation: copy
$('copy-invitation')?.addEventListener('click', async () => {
  const t = $('invitation').textContent; const st = $('copy-status');
  try { await navigator.clipboard.writeText(t); st.textContent = 'Copied.'; }
  catch { const r = document.createRange(); r.selectNodeContents($('invitation')); const s = getSelection(); s.removeAllRanges(); s.addRange(r); st.textContent = 'Selected. Copy it with your keyboard or the share menu.'; }
});
$('help-toggle')?.addEventListener('click', () => { const h = $('help'); h.hidden = !h.hidden; $('help-toggle').setAttribute('aria-expanded', String(!h.hidden)); });
document.addEventListener('visibilitychange', () => { if (!document.hidden && state && !state.signedOut) refresh(); });
refresh();

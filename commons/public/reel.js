// Cohabi Feed watch screen (Ash's design §1): the video on screen plays and the rest pause; sound stays off until
// you turn it on, then stays on; like (or double-tap), comments sheet, share, save, add friend, More with report,
// progress you can tap to jump, top bar fades.
// Fit the video area between the shared header and the bottom bar.
const fit = () => { const h = document.querySelector('.fx-top')?.offsetHeight || 0; const f = document.querySelector('.fx-bottom'); const fb = f && getComputedStyle(f).display !== 'none' ? f.offsetHeight : 0; document.documentElement.style.setProperty('--rl-head', `${h}px`); document.documentElement.style.setProperty('--rl-foot', `${fb}px`); document.documentElement.style.setProperty('--rl-h', `${innerHeight - h - fb}px`); };
fit(); addEventListener('resize', fit);
const H = { 'content-type': 'application/json', 'x-commons': '1' };
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const toast = document.querySelector('.rl-toast');
const say = (t) => { toast.textContent = t; toast.classList.add('on'); clearTimeout(say.t); say.t = setTimeout(() => toast.classList.remove('on'), 1800); };
let sound = false;
const topBar = document.querySelector('.rl-top'); let fadeT;
const wake = () => { topBar.classList.remove('faded'); clearTimeout(fadeT); fadeT = setTimeout(() => topBar.classList.add('faded'), 2500); };
const vids = $$('.rl-item video');
const io = new IntersectionObserver((es) => { for (const e of es) { const v = e.target; if (e.isIntersecting && e.intersectionRatio > 0.6) { v.muted = !sound; v.play().catch(() => {}); wake(); } else v.pause(); } }, { threshold: [0, 0.6, 1] });
for (const v of vids) {
  io.observe(v);
  const bar = v.closest('.rl-item').querySelector('.rl-prog i');
  v.addEventListener('timeupdate', () => { if (v.duration) bar.style.width = `${(v.currentTime / v.duration) * 100}%`; });
}
const setSound = (on) => { sound = on; for (const v of vids) v.muted = !on; $$('.rl-sound').forEach((b) => { b.firstElementChild.textContent = on ? '🔊' : '🔇'; b.setAttribute('aria-label', on ? 'Turn sound off' : 'Turn sound on'); }); };
document.addEventListener('click', async (e) => {
  const item = e.target.closest('.rl-item');
  if (e.target.closest('.rl-sound')) return setSound(!sound);
  const like = e.target.closest('.rl-like');
  if (like) return toggleLike(item);
  const save = e.target.closest('.rl-save');
  if (save) {
    if (save.hasAttribute('data-signin')) { signin(item); return; }
    const r = await fetch(`/api/posts/${item.dataset.post}/save`, { method: 'POST', credentials: 'same-origin', headers: H, body: '{}' });
    const j = await r.json().catch(() => null); if (!r.ok || typeof j?.saved !== 'boolean') { say('Could not save it just now'); return; }
    save.setAttribute('aria-pressed', String(j.saved)); save.setAttribute('aria-label', j.saved ? 'Remove from saved' : 'Save');
    save.querySelector('span').textContent = j.saved ? '🔖' : '📑'; save.querySelector('b').textContent = j.saved ? 'Saved' : 'Save';
    say(j.saved ? 'Saved. Find it under More → Your saved videos' : 'Removed from saved'); return;
  }
  const fr = e.target.closest('button.rl-friend');
  if (fr) {
    const r = await fetch('/api/friends', { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify({ to: fr.dataset.to, label: 'Friend' }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) { say(j.error || 'Could not send that just now'); return; }
    $$(`button.rl-friend[data-to="${CSS.escape(fr.dataset.to)}"]`).forEach((b) => { const t = document.createElement('span'); t.className = 'rl-friend is-sent'; t.textContent = 'Requested'; b.replaceWith(t); });
    say('Friend request sent'); return;
  }
  if (e.target.closest('.rl-more')) { const s = item.querySelector('.rl-moresheet'); s.hidden = false; return; }
  if (e.target.closest('.rl-cmt')) { const sh = item.querySelector('.rl-sheet'); sh.hidden = false; sh.querySelector('input')?.focus(); return; }
  if (e.target.closest('.rl-sheet-x')) { e.target.closest('.rl-sheet').hidden = true; return; }
  const sh = e.target.closest('.rl-share');
  if (sh) { const url = location.origin + sh.dataset.url; try { if (navigator.share) await navigator.share({ url, title: 'Cohabi Feed' }); else { await navigator.clipboard.writeText(url); say('Link copied'); } } catch {} return; }
  const prog = e.target.closest('.rl-prog');
  if (prog) { const v = item.querySelector('video'); const r = prog.getBoundingClientRect(); if (v.duration) v.currentTime = ((e.clientX - r.left) / r.width) * v.duration; return; }
  const cap = e.target.closest('.rl-cap'); if (cap) { cap.classList.toggle('open'); return; }
  if (e.target.closest('.rl-sheet, a, button')) return;
  // One tap pauses or plays; two quick taps like it (Ash's design: double-tap to like), with a heart that pops.
  const v = e.target.closest('.rl-item video'); if (!v) return;
  wake();
  if (tapT && tapEl === v) { clearTimeout(tapT); tapT = null; if (item.querySelector('.rl-like').getAttribute('aria-pressed') !== 'true') toggleLike(item); pop(item); return; }
  tapEl = v; tapT = setTimeout(() => { tapT = null; if (v.paused) v.play().catch(() => {}); else v.pause(); }, 260);
});
let tapT = null; let tapEl = null;
function signin(item) { location.href = `/signin?next=${encodeURIComponent('/feed#' + item.id)}`; }
function pop(item) { const b = item.querySelector('.rl-burst'); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); }
async function toggleLike(item) {
  const like = item.querySelector('.rl-like');
  if (like.hasAttribute('data-signin')) { signin(item); return; }
  const r = await fetch(`/api/posts/${item.dataset.post}/react`, { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify({ reaction: 'heart' }) });
  const j = await r.json().catch(() => null); if (!r.ok || !Array.isArray(j?.reactions)) { say('Could not like it just now'); return; }
  const on = !!j.given; like.setAttribute('aria-pressed', String(on)); like.setAttribute('aria-label', on ? 'Unlike' : 'Like');
  like.querySelector('span').textContent = on ? '❤️' : '🤍'; like.querySelector('b').textContent = j.reactions.reduce((t, x) => t + x.count, 0);
}
document.addEventListener('submit', async (e) => {
  const rf = e.target.closest('.rl-rform');
  if (rf) {
    e.preventDefault(); const item = rf.closest('.rl-item'); const fd = new FormData(rf);
    const r = await fetch(`/api/posts/${item.dataset.post}/report`, { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify({ reason: fd.get('reason'), note: fd.get('note') || '' }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) { say(j.error || 'Could not send the report just now'); return; }
    rf.innerHTML = '<p class="rl-note"><strong>Thank you. Your report went to the stewards.</strong> Nothing comes down by itself; a steward will look.</p>'; return;
  }
  const f = e.target.closest('.rl-cform'); if (!f) return; e.preventDefault();
  const item = f.closest('.rl-item'); const input = f.querySelector('input'); const text = input.value.trim(); if (!text) return;
  const r = await fetch(`/api/posts/${item.dataset.post}/comments`, { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify({ text }) });
  const j = await r.json().catch(() => ({})); if (!r.ok) { say(j.error || 'Could not post that'); return; }
  const ul = item.querySelector('.rl-sheet ul'); ul.querySelector('.rl-none')?.remove();
  const li = document.createElement('li'); const b = document.createElement('strong'); b.textContent = j.by?.name || 'You'; li.append(b, ' ', text); ul.append(li); li.scrollIntoView({ block: 'nearest' });
  const c = item.querySelector('.rl-cmt b'); c.textContent = String((parseInt(c.textContent, 10) || 0) + 1); input.value = '';
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $$('.rl-sheet').forEach((s) => { s.hidden = true; }); });
wake();

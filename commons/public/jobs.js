// Jobs Board forms: post a listing, respond privately, close your own, report one, and the opt-in work profile.
// The pages work without this (filters are links); only writing needs it.
const H = { 'Content-Type': 'application/json', 'x-commons': '1' };
const send = async (url, body) => {
  const r = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify(body || {}) });
  let j = {}; try { j = await r.json(); } catch { /* not json */ }
  if (!r.ok) throw new Error(j.error || `That didn't work (${r.status}).`);
  return j;
};
const formData = (f) => Object.fromEntries(new FormData(f).entries());
const say = (text, ok = false) => { const m = document.getElementById('jb-msg'); if (m) { m.textContent = text; m.classList.toggle('ok', ok); } };
const busy = (f, on) => { const b = f.querySelector('button[type=submit]'); if (b) b.disabled = on; };

const post = document.getElementById('jb-post');
post?.addEventListener('submit', async (e) => {
  e.preventDefault(); const d = formData(post);
  if (!d.title.trim() || d.text.trim().length < 10) return say('Add a title and a few words about what it is.');
  if (d.coins === '') delete d.coins;
  busy(post, true); say('Posting…', true);
  try { const l = await send('/api/jobs', d); location.href = `/jobs/${l.id}`; } catch (err) { say(err.message); busy(post, false); }
});

const apply = document.getElementById('jb-apply');
apply?.addEventListener('submit', async (e) => {
  e.preventDefault(); const d = formData(apply);
  if (d.text.trim().length < 10) return say('Say a little more: at least 10 characters.');
  busy(apply, true);
  try { await send(`/api/jobs/${apply.dataset.job}/apply`, d); apply.outerHTML = '<p class="jb-done">Sent. Only the poster sees it, and they can reply to you in Messenger.</p>'; } catch (err) { say(err.message); busy(apply, false); }
});

document.addEventListener('click', async (e) => {
  const close = e.target.closest('[data-close-job]');
  if (close) {
    close.disabled = true;
    try { await send(`/api/jobs/${close.dataset.closeJob}/close`, { status: 'closed' }); location.reload(); } catch (err) { close.disabled = false; close.textContent = err.message; }
    return;
  }
  const rep = e.target.closest('[data-report-job]');
  if (rep) {
    const reason = window.prompt('What is wrong with this listing? (a scam, asks for private details, not real work…) A steward will look.');
    if (!reason) return;
    try { await send(`/api/jobs/${rep.dataset.reportJob}/report`, { reason }); rep.replaceWith(Object.assign(document.createElement('span'), { textContent: 'Thanks, a steward will look.' })); } catch (err) { rep.textContent = err.message; }
  }
});

const prof = document.getElementById('jb-profile');
prof?.addEventListener('submit', async (e) => {
  e.preventDefault(); busy(prof, true);
  try { await send('/api/me/work-profile', formData(prof)); location.href = '/jobs/people#me'; location.reload(); } catch (err) { say(err.message); busy(prof, false); }
});
document.getElementById('jb-unlist')?.addEventListener('click', async () => {
  try { await send('/api/me/work-profile', { listed: false }); location.reload(); } catch (err) { say(err.message); }
});

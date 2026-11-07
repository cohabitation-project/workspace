// journal.js — one journal writer for the profile page and the house (Geoffrey, 2026-11-07). Branches as bubbles,
// a daily time each, today's question (skipping is always fine), write or speak, keep it private or post it to your
// feed. The same entries show wherever you open it.
import { readButton, micButton, VOICE_NOTE } from '/static/voicekit.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const api = async (url, opts = {}) => {
  const r = await fetch(url, { credentials: 'same-origin', ...opts, headers: { 'Content-Type': 'application/json', 'X-Commons': '1', ...(opts.headers || {}) } });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `error ${r.status}`); return j;
};
const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'; } catch { return 'UTC'; } })();

export async function mountJournal(el) {
  if (!el || el.dataset.mounted) return; el.dataset.mounted = '1';
  let plan; let entries = []; let cur = 'journal'; let skip = 0; let q = null; let useQ = true;
  try { [plan, { journals: entries }] = await Promise.all([api('/api/journal/plan'), api('/api/journal')]); }
  catch (e) { el.innerHTML = `<p class="muted small">${esc(e.message)}</p>`; return; }
  const hashBranch = (location.hash.match(/journal-([a-z0-9-]+)/) || [])[1];
  if (hashBranch && plan.branches.some((b) => b.key === hashBranch)) cur = hashBranch;
  const branch = () => plan.branches.find((b) => b.key === cur) || plan.branches[0];
  q = plan.questions?.[cur] || null;

  const savePlan = async () => { plan = { ...plan, ...(await api('/api/journal/plan', { method: 'PUT', body: JSON.stringify({ tz: TZ, branches: plan.branches.map(({ key, name, time, on }) => ({ key, name, time, on })) }) })) }; };
  const loadQ = async () => { try { q = await api(`/api/journal/question?branch=${encodeURIComponent(cur)}&n=${skip}`); } catch { q = null; } };

  function render() {
    const b = branch(); const mine = entries.filter((e) => (e.branch || 'journal') === cur);
    el.innerHTML = `
    <div class="jr-branches" role="group" aria-label="What you're writing">${plan.branches.map((x) => `<button type="button" class="pf-skillchip jr-branch" data-key="${esc(x.key)}" aria-pressed="${x.key === cur}">${esc(x.name)}${x.on ? ' <span aria-label="daily time set">⏰</span>' : ''}</button>`).join('')}<span class="jr-addwrap"><label class="sr-only" for="jr-newbranch">A branch of your own</label><input id="jr-newbranch" maxlength="30" placeholder="Add your own: Dreams, Recipes…"><button type="button" class="btn small jr-addbranch">Add</button></span></div>
    <div class="jr-time"><label class="small">Daily time for ${esc(b.name)} <input type="time" class="jr-timein" value="${esc(b.time || '')}"></label> <label class="small"><input type="checkbox" class="jr-on"${b.on ? ' checked' : ''}> remind me each day</label> <span class="small muted jr-timemsg"></span></div>
    ${q ? `<div class="jr-q${useQ ? '' : ' off'}"><p class="small muted">${cur === 'biography' ? `Chapter question ${q.index} of ${q.of}${q.answered ? ` · ${q.answered} answered` : ''}` : "Today's question"}</p><p class="jr-qtext">${esc(q.question)}</p><p class="jr-qbtns"><button type="button" class="btn ghost small jr-another">Another question</button> <button type="button" class="btn ghost small jr-free">${useQ ? 'Write freely instead' : 'Answer the question'}</button></p></div>` : ''}
    <label class="sr-only" for="jr-text">Your entry</label>
    <textarea id="jr-text" class="jr-text" rows="7" maxlength="8000" placeholder="${useQ && q ? 'Write, or tap the mic and speak…' : 'What happened? What did you notice?'}"></textarea>
    <div class="copyrow jr-row"><button type="button" class="btn small jr-save">Save (private)</button> <button type="button" class="btn ghost small jr-savepost">Save and post to my feed</button></div>
    <p class="muted small">${esc(VOICE_NOTE)}</p><p class="form-msg jr-msg" role="status"></p>
    <h3 class="jr-h">${esc(b.name)} <span class="muted small">${mine.length} entr${mine.length === 1 ? 'y' : 'ies'}</span></h3>
    <ul class="list jr-list">${mine.length ? mine.map((j) => `<li data-id="${esc(j.id)}"><div class="muted small">${esc(new Date(j.ts).toLocaleString())} · ${j.post ? `<a href="/feed#${esc(j.post)}">on the feed</a>` : j.shared ? `<a href="/j/${esc(j.id)}">shared</a>` : 'private'}</div>${j.question ? `<p class="jr-asked">${esc(j.question)}</p>` : ''}<p class="j-body">${esc(j.text).replace(/\n/g, '<br>')}</p>
      <div class="copyrow"><span class="j-read"></span>${j.post ? '' : '<button class="btn small ghost" data-act="post">Post to my feed</button>'}<button class="btn small ghost" data-act="share">${j.shared ? 'Make private' : 'Share to the Library'}</button><button class="btn small ghost" data-act="delete">Delete</button></div></li>`).join('') : '<li class="muted small">Nothing here yet.</li>'}</ul>`;
    const ta = el.querySelector('#jr-text');
    el.querySelector('.jr-row').prepend(micButton(ta, { onStatus: (m) => { el.querySelector('.jr-msg').textContent = m; } }));
    el.querySelectorAll('.jr-list li[data-id]').forEach((li) => li.querySelector('.j-read').append(readButton(() => li.querySelector('.j-body').innerText, { label: 'Read aloud' })));
    try { const d = localStorage.getItem(`journal-draft-${cur}`); if (d) ta.value = d; } catch { /* private mode */ }
    ta.addEventListener('input', () => { try { localStorage.setItem(`journal-draft-${cur}`, ta.value); } catch { /* private mode */ } });
  }

  el.addEventListener('click', async (e) => {
    const t = e.target.closest('button'); if (!t) return;
    const msg = () => el.querySelector('.jr-msg');
    try {
      if (t.classList.contains('jr-branch')) { cur = t.dataset.key; skip = 0; useQ = true; await loadQ(); render(); return; }
      if (t.classList.contains('jr-addbranch')) {
        const name = (el.querySelector('#jr-newbranch')?.value || '').trim().slice(0, 30); if (!name) { el.querySelector('#jr-newbranch')?.focus(); return; }
        plan.branches.push({ key: '', name, time: null, on: false }); await savePlan(); cur = plan.branches[plan.branches.length - 1].key; skip = 0; await loadQ(); render(); return;
      }
      if (t.classList.contains('jr-another')) { skip += 1; await loadQ(); useQ = true; render(); return; }
      if (t.classList.contains('jr-free')) { useQ = !useQ; render(); return; }
      if (t.classList.contains('jr-save') || t.classList.contains('jr-savepost')) {
        const ta = el.querySelector('#jr-text'); const text = ta.value.trim(); if (!text) { msg().textContent = 'Write or speak something first.'; return; }
        const j = await api('/api/journal', { method: 'POST', body: JSON.stringify({ text, branch: cur, question: useQ && q ? q.question : null }) });
        if (t.classList.contains('jr-savepost')) { const r = await api(`/api/journal/${j.id}/post`, { method: 'POST', body: '{}' }); j.post = r.post.id; j.shared = true; }
        entries.unshift(j); try { localStorage.removeItem(`journal-draft-${cur}`); } catch { /* ignore */ }
        if (cur === 'biography') { skip = 0; await loadQ(); }
        render(); el.querySelector('.jr-msg').textContent = j.post ? 'Saved, and posted to your feed. It stays here in your journal.' : 'Saved. Only you can see it.'; return;
      }
      const li = t.closest('li[data-id]'); if (!li) return; const id = li.dataset.id; const j = entries.find((x) => x.id === id);
      if (t.dataset.act === 'post') { const r = await api(`/api/journal/${id}/post`, { method: 'POST', body: '{}' }); j.post = r.post.id; j.shared = true; render(); el.querySelector('.jr-msg').textContent = 'Posted to your feed. It stays here in your journal.'; }
      else if (t.dataset.act === 'share') { const r = await api(`/api/journal/${id}/share`, { method: 'POST', body: JSON.stringify({ shared: !j.shared }) }); j.shared = r.shared; render(); }
      else if (t.dataset.act === 'delete') { if (t.dataset.confirm !== '1') { t.dataset.confirm = '1'; t.textContent = 'Tap again to delete for good'; return; } await api(`/api/journal/${id}`, { method: 'DELETE' }); entries = entries.filter((x) => x.id !== id); render(); }
    } catch (err) { if (msg()) msg().textContent = err.message; }
  });
  el.addEventListener('change', async (e) => {
    const b = branch(); const box = el.querySelector('.jr-timemsg');
    if (e.target.classList.contains('jr-timein') || e.target.classList.contains('jr-on')) {
      b.time = el.querySelector('.jr-timein').value || null; b.on = !!el.querySelector('.jr-on').checked && !!b.time;
      try { await savePlan(); box.textContent = b.on ? `Saved: a gentle reminder at ${b.time} each day (${TZ}).` : 'Saved: no reminder.'; } catch (err) { box.textContent = err.message; }
    }
  });
  render();
}
mountJournal(document.getElementById('journal-app'));

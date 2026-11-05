// social.js — hearts, reactions and comments on feed posts (Geoffrey, 2026-11-05: "like any social media site").
// Loaded by feed.js and profile.js. No inline handlers (CSP script-src 'self'). Without JS the reactions and comments
// still show; only giving them needs this.
const H = { 'Content-Type': 'application/json', 'X-Commons': '1' };
const call = async (url, method, body) => {
  const r = await fetch(url, { method, credentials: 'same-origin', headers: H, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `could not save (${r.status})`);
  return j;
};
const reloadAt = (id) => { try { sessionStorage.setItem('commons-scroll', String(scrollY)); } catch { /* fine */ } location.reload(); };
try { const y = sessionStorage.getItem('commons-scroll'); if (y) { sessionStorage.removeItem('commons-scroll'); addEventListener('load', () => scrollTo(0, +y)); } } catch { /* fine */ }

document.addEventListener('click', async (e) => {
  const rb = e.target.closest('.sx-react');
  if (rb && !rb.disabled) {
    rb.disabled = true;
    try {
      const j = await call(`/api/posts/${encodeURIComponent(rb.dataset.post)}/react`, 'POST', { reaction: rb.dataset.r });
      // update in place: count, pressed state, names
      const r = j.reactions.find((x) => x.reaction === rb.dataset.r);
      rb.setAttribute('aria-pressed', String(j.given));
      rb.classList.toggle('has', !!r);
      let n = rb.querySelector('.sx-n');
      if (r) { if (!n) { n = document.createElement('span'); n.className = 'sx-n'; rb.append(n); } n.textContent = String(r.count); }
      else if (n) n.remove();
      const names = r ? r.by.map((b) => b.name).join(', ') : '';
      rb.title = names ? `${rb.dataset.r}: ${names}` : rb.dataset.r;
      rb.setAttribute('aria-label', `${rb.dataset.r}${r ? `, ${r.count}: ${names}` : ''}`);
    } catch (err) { rb.title = err.message; }
    rb.disabled = false;
    return;
  }
  const rp = e.target.closest('.sx-replyto');
  if (rp) {
    const form = rp.closest('.sx').querySelector('.sx-form'); if (!form) return;
    form.reply_to.value = rp.dataset.c;
    form.querySelector('.sx-replying').textContent = `replying to ${rp.dataset.name} · `;
    const x = document.createElement('button'); x.type = 'button'; x.className = 'linkish small'; x.textContent = 'cancel';
    x.addEventListener('click', () => { form.reply_to.value = ''; form.querySelector('.sx-replying').textContent = ''; });
    form.querySelector('.sx-replying').append(x);
    form.text.focus();
    return;
  }
  const dc = e.target.closest('.sx-delc');
  if (dc) {
    if (dc.dataset.armed !== '1') { dc.dataset.armed = '1'; dc.textContent = 'sure? delete'; return; }
    try { await call(`/api/posts/${encodeURIComponent(dc.dataset.post)}/comments/${encodeURIComponent(dc.dataset.c)}`, 'DELETE'); reloadAt(); }
    catch (err) { dc.textContent = err.message; }
  }
});

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('.sx-form'); if (!form) return;
  e.preventDefault();
  const msg = form.querySelector('.form-msg'); const text = form.text.value.trim();
  if (!text) { msg.textContent = 'write something first'; return; }
  msg.textContent = 'posting…';
  try { await call(`/api/posts/${encodeURIComponent(form.dataset.post)}/comments`, 'POST', { text, reply_to: form.reply_to.value || undefined }); reloadAt(); }
  catch (err) { msg.textContent = err.message; }
});
// Enter sends, Shift+Enter makes a new line; the box grows as you type
document.addEventListener('keydown', (e) => {
  const t = e.target; if (!t.matches?.('.sx-form textarea')) return;
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); t.form.requestSubmit(); }
});
document.addEventListener('input', (e) => { const t = e.target; if (t.matches?.('.sx-form textarea')) { t.style.height = 'auto'; t.style.height = `${Math.min(200, t.scrollHeight)}px`; } });

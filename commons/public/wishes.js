// wishes.js — add a wish, offer help, approve / decline, mark fulfilled or withdraw (/wishlist).
const api = async (url, body) => {
  const r = await fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify(body || {}) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `error ${r.status}`); return j;
};
const form = document.getElementById('wl-form');
if (form) form.addEventListener('submit', async (e) => {
  e.preventDefault(); const f = new FormData(form); const msg = form.querySelector('.form-msg');
  try {
    const w = await api('/api/wishes', { title: f.get('title'), why: f.get('why'), cost: f.get('cost'), link: f.get('link') || null, kind: f.get('kind'), room: f.get('room') || null, for_org: f.get('for_org') === 'on' });
    location.href = `/wishlist?${w.status === 'pending' ? 'show=pending&' : ''}added=${Date.now()}#${w.id}`;
  } catch (err) { msg.textContent = err.message; }
});
document.addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-act]'); if (!b) return;
  const li = b.closest('li[data-id]'); const id = li.dataset.id; const msg = li.querySelector('.form-msg'); const act = b.dataset.act;
  try {
    if (act === 'help') {
      if (!li.querySelector('.wl-helpbox')) { b.insertAdjacentHTML('afterend', '<span class="wl-helpbox"><label class="sr-only" for="h-' + id + '">How you can help</label><input id="h-' + id + '" maxlength="400" placeholder="I have one I can lend… (public)"> <button type="button" class="btn small" data-act="help-send">Send</button></span>'); li.querySelector('.wl-helpbox input').focus(); }
      return;
    }
    if (act === 'help-send') { const t = li.querySelector('.wl-helpbox input').value.trim(); if (!t) return; await api(`/api/wishes/${id}/help`, { text: t }); msg.textContent = 'Sent. They will see it on their bell.'; setTimeout(() => location.reload(), 700); return; }
    if (act === 'approve') { const w = await api(`/api/wishes/${id}/approve`); msg.textContent = w.status === 'listed' ? 'Approved: it is on the list now.' : 'Approved. It still needs the other approval.'; setTimeout(() => location.reload(), 700); return; }
    if (act === 'decline') {
      if (!li.querySelector('.wl-declinebox')) { b.insertAdjacentHTML('afterend', '<span class="wl-declinebox"><label class="sr-only" for="d-' + id + '">Why</label><input id="d-' + id + '" maxlength="300" placeholder="Why, kindly (they will read it)"> <button type="button" class="btn small" data-act="decline-send">Decline</button></span>'); return; }
      return;
    }
    if (act === 'decline-send') { await api(`/api/wishes/${id}/decline`, { reason: li.querySelector('.wl-declinebox input').value }); location.reload(); return; }
    if (act === 'fulfilled' || act === 'withdrawn') {
      if (b.dataset.confirm !== '1') { b.dataset.confirm = '1'; b.textContent = act === 'fulfilled' ? 'Tap again: fulfilled' : 'Tap again to withdraw'; return; }
      await api(`/api/wishes/${id}/close`, { status: act }); location.reload();
    }
  } catch (err) { msg.textContent = err.message; }
});

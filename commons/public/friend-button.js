// The friend and message buttons on a member's profile (2026-11-13). Reads how YOU stand with this member
// (/api/friends/status: only your own label ever comes back) and shows the one button that fits.
const LABELS = ['Acquaintance', 'Kin', 'Family', 'Co-worker'];
// Every friendship carries a private label only you see (friends.mjs). Ask it in one tap, right where you pressed.
const chooser = (kind, value) => `<span class="fb-choose" role="group" aria-label="Choose a private label"><span class="fb-q">How do you know them? Only you see this.</span>${LABELS.map((l) => `<button type="button" class="btn small ghost" data-${kind}="${value}" data-label="${l}">${l}</button>`).join('')}</span>`;
const box = document.querySelector('[data-friend-for]');
if (box) {
  const id = box.dataset.friendFor;
  const call = async (path, body) => { const r = await fetch(path, { method: body ? 'POST' : 'GET', credentials: 'same-origin', headers: body ? { 'content-type': 'application/json', 'x-commons': '1' } : {}, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `Error ${r.status}`); return j; };
  const slot = box.querySelector('.fb-slot'); const note = box.querySelector('.fb-note');
  const show = (s) => {
    if (s.status === 'friends') slot.innerHTML = '<span class="mb-tag">✓ Friends</span>';
    else if (s.status === 'sent') slot.innerHTML = '<span class="mb-tag">Friend request sent</span>';
    else if (s.status === 'received') slot.innerHTML = `<button type="button" class="btn small" data-accept="${s.request}">Accept friend request</button>`;
    else if (s.status === 'none') slot.innerHTML = '<button type="button" class="btn small ghost" data-add>＋ Add friend</button>';
    else slot.innerHTML = '';
  };
  const refresh = () => call(`/api/friends/status?member=${encodeURIComponent(id)}`).then(show).catch(() => { slot.innerHTML = ''; });
  box.addEventListener('click', async (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.hasAttribute('data-add')) { slot.innerHTML = chooser('add', '1'); return; }
    if (b.dataset.accept && !b.dataset.label) { slot.innerHTML = chooser('accept', b.dataset.accept); return; }
    b.disabled = true;
    try {
      if (b.dataset.add) { await call('/api/friends', { to: id, label: b.dataset.label }); note.textContent = 'Friend request sent.'; }
      else if (b.dataset.accept) { await call(`/api/friends/requests/${encodeURIComponent(b.dataset.accept)}/accept`, { label: b.dataset.label }); note.textContent = 'You are friends now.'; }
      refresh();
    } catch (err) { b.disabled = false; note.textContent = err.message; }
  });
  refresh();
}

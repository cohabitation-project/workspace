// feed.js — posting on the social feed, the image library uploader, and delete buttons (2026-11-05).
// No inline handlers (CSP script-src 'self').
import './social.js';
const $ = (s, el = document) => el.querySelector(s);
const H = { 'Content-Type': 'application/json', 'X-Commons': '1' };
const toB64 = (file) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(new Error('could not read the file')); r.readAsDataURL(file); });
export async function uploadImage(file, { alt, credit, title, for: forWho, made_by, maker } = {}) {
  if (made_by !== undefined && !made_by) throw new Error('say who made it: Human, AI, or Human + AI');
  if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name}: over 5 MB`);
  const r = await fetch('/api/images', { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify({ data: await toB64(file), alt, credit, title, ...(made_by ? { made_by, maker: maker ?? credit } : {}), ...(forWho ? { for: forWho } : {}) }) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `upload failed (${r.status})`);
  return j;
}

// ---- compose a post, with images (each needs its own alt text and credit)
const form = $('#compose');
if (form) {
  const msg = form.querySelector('.form-msg'); const pics = $('#c-pics'); let files = [];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  $('#c-files').addEventListener('change', async (e) => {
    files = [...e.target.files].slice(0, 4);
    const previews = await Promise.all(files.map((f) => toB64(f).catch(() => ''))); // data: URLs: the CSP allows those, not blob:
    pics.innerHTML = files.map((f, i) => `<div class="c-pic"><img alt="" src="${previews[i]}"><input data-alt="${i}" maxlength="300" placeholder="what it shows (required)" aria-label="what image ${i + 1} shows"><select data-madeby="${i}" aria-label="who made image ${i + 1}: human, AI or both"><option value="">Made by…</option><option value="human">Human</option><option value="ai">AI</option><option value="hybrid">Human + AI</option></select><input data-credit="${i}" maxlength="120" list="cohabi-members" placeholder="maker: a member's name, or e.g. Midjourney" aria-label="maker of image ${i + 1}"></div>`).join('');
    if (e.target.files.length > 4) msg.textContent = 'At most 4 images: the first 4 are kept.';
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); msg.textContent = '';
    const text = $('#c-text').value.trim();
    if (!text && !files.length) { msg.textContent = 'Write something or add an image.'; return; }
    try {
      const ids = [];
      for (let i = 0; i < files.length; i++) {
        const alt = form.querySelector(`[data-alt="${i}"]`).value.trim(); const credit = form.querySelector(`[data-credit="${i}"]`).value.trim();
        const made_by = form.querySelector(`[data-madeby="${i}"]`).value;
        if (alt.length < 3) { msg.textContent = `Image ${i + 1}: say what it shows.`; return; }
        if (!made_by) { msg.textContent = `Image ${i + 1}: say who made it — Human, AI, or Human + AI.`; return; }
        msg.textContent = `uploading image ${i + 1} of ${files.length}…`;
        ids.push((await uploadImage(files[i], { alt, credit, made_by, maker: credit })).id);
      }
      msg.textContent = 'posting…';
      const group = form.dataset.group || null;
      const release = $('#c-release')?.value || null;
      const r = await fetch('/api/posts', { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify({ text, images: ids, kind: $('#c-kind').value, ...(group ? { group } : {}), ...(release ? { release } : {}) }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) { msg.textContent = j.error || `could not post (${r.status})`; return; }
      location.href = `${group ? location.pathname : '/feed'}#${j.id}`; location.reload();
    } catch (err) { msg.textContent = err.message; }
  });
}

// ---- the image library uploader
const up = $('#img-up');
if (up) {
  const msg = up.querySelector('.form-msg');
  up.addEventListener('submit', async (e) => {
    e.preventDefault(); const f = $('#iu-file').files[0]; if (!f) return;
    msg.textContent = 'uploading…';
    try { await uploadImage(f, { alt: $('#iu-alt').value.trim(), credit: $('#iu-credit').value.trim(), made_by: $('#iu-madeby').value, title: $('#iu-title').value.trim(), for: $('#iu-for').value.trim() }); location.reload(); }
    catch (err) { msg.textContent = err.message; }
  });
}

// ---- delete your own post or image
document.addEventListener('click', async (e) => {
  const b = e.target.closest('.del-post, .del-img'); if (!b) return;
  if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = 'sure? delete'; return; }
  const url = b.classList.contains('del-post') ? `/api/posts/${encodeURIComponent(b.dataset.id)}` : `/api/images/${encodeURIComponent(b.dataset.id)}`;
  const r = await fetch(url, { method: 'DELETE', credentials: 'same-origin', headers: H });
  if (r.ok) location.reload(); else b.textContent = 'could not delete';
});


// ---- groups (2026-11-06): start one from the feed; join or leave from a group page ----
const gNew = $('#g-new'), gForm = $('#g-form');
if (gNew && gForm) gNew.addEventListener('click', () => { gForm.hidden = !gForm.hidden; if (!gForm.hidden) $('#g-name').focus(); });
if (gForm) gForm.addEventListener('submit', async (e) => {
  e.preventDefault(); const m = gForm.querySelector('.form-msg');
  try {
    const r = await fetch('/api/groups', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ name: $('#g-name').value, about: $('#g-about').value }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) { m.textContent = j.error || `could not create (${r.status})`; return; }
    location.href = `/g/${j.id}`;
  } catch (err) { m.textContent = err.message; }
});
const gBtn = $('#g-member');
if (gBtn) gBtn.addEventListener('click', async () => {
  const act = gBtn.dataset.in ? 'leave' : 'join';
  const r = await fetch(`/api/groups/${encodeURIComponent(gBtn.dataset.group)}/${act}`, { method: 'POST', credentials: 'same-origin', headers: { 'X-Commons': '1' } });
  if (r.ok) location.reload(); else { const j = await r.json().catch(() => ({})); alert(j.error || `could not ${act}`); }
});

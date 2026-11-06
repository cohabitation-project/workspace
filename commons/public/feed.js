// feed.js — posting on the social feed, the image library uploader, and delete buttons (2026-11-05).
// No inline handlers (CSP script-src 'self').
import './social.js';
const $ = (s, el = document) => el.querySelector(s);
const H = { 'Content-Type': 'application/json', 'X-Commons': '1' };
const toB64 = (file) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(new Error('could not read the file')); r.readAsDataURL(file); });
export async function uploadImage(file, { alt, credit, title, for: forWho } = {}) {
  if (file.size > 5 * 1024 * 1024) throw new Error(`${file.name}: over 5 MB`);
  const r = await fetch('/api/images', { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify({ data: await toB64(file), alt, credit, title, ...(forWho ? { for: forWho } : {}) }) });
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
    pics.innerHTML = files.map((f, i) => `<div class="c-pic"><img alt="" src="${previews[i]}"><input data-alt="${i}" maxlength="300" placeholder="what it shows (required)" aria-label="what image ${i + 1} shows"><input data-credit="${i}" maxlength="160" placeholder="who made it (e.g. photo by me)" aria-label="who made image ${i + 1}"></div>`).join('');
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
        if (alt.length < 3) { msg.textContent = `Image ${i + 1}: say what it shows.`; return; }
        msg.textContent = `uploading image ${i + 1} of ${files.length}…`;
        ids.push((await uploadImage(files[i], { alt, credit })).id);
      }
      msg.textContent = 'posting…';
      const r = await fetch('/api/posts', { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify({ text, images: ids, kind: $('#c-kind').value }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) { msg.textContent = j.error || `could not post (${r.status})`; return; }
      location.href = `/feed#${j.id}`; location.reload();
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
    try { await uploadImage(f, { alt: $('#iu-alt').value.trim(), credit: $('#iu-credit').value.trim(), title: $('#iu-title').value.trim(), for: $('#iu-for').value.trim() }); location.reload(); }
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

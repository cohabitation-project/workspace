// feed.js — posting on the social feed, the image library uploader, and delete buttons (2026-11-05).
// No inline handlers (CSP script-src 'self').
import './social.js';
const $ = (s, el = document) => el.querySelector(s);
const H = { 'Content-Type': 'application/json', 'X-Commons': '1' };
const toB64 = (file) => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = () => no(new Error('could not read the file')); r.readAsDataURL(file); });
export async function uploadImage(file, { alt, credit, title, for: forWho, made_by, maker } = {}) {
  if (made_by !== undefined && !made_by) throw new Error('say who made it: Human, AI, or Human + AI');
  if (file.size > 20 * 1024 * 1024) throw new Error(`${file.name}: over 20 MB`);
  const r = await fetch('/api/images', { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify({ data: await toB64(file), alt, credit, title, ...(made_by ? { made_by, maker: maker ?? credit } : {}), ...(forWho ? { for: forWho } : {}) }) });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `upload failed (${r.status})`);
  return j;
}

// ---- compose a post, with images (each needs its own alt text and credit)
const form = $('#compose');
if (form) {
  const msg = form.querySelector('.form-msg'); const pics = $('#c-pics'); let files = []; let posting = false;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  $('#c-files').addEventListener('change', async (e) => {
    files = [...e.target.files].slice(0, 4);
    const previews = await Promise.all(files.map((f) => toB64(f).catch(() => ''))); // data: URLs: the CSP allows those, not blob:
    pics.innerHTML = files.map((f, i) => `<div class="c-pic"><img alt="" src="${previews[i]}"><input data-alt="${i}" maxlength="300" placeholder="what it shows (required)" aria-label="what image ${i + 1} shows"><select data-madeby="${i}" aria-label="who made image ${i + 1}: human, AI or both"><option value="">Made by…</option><option value="human">Human</option><option value="ai">AI</option><option value="hybrid">Human + AI</option></select><input data-credit="${i}" maxlength="120" list="cohabi-members" placeholder="maker: a member's name, or e.g. Midjourney" aria-label="maker of image ${i + 1}"></div>`).join('');
    if (e.target.files.length > 4) msg.textContent = 'At most 4 images: the first 4 are kept.';
  });
  // 🎬 one video per post: recorded on the spot (phones offer the camera) or chosen. Up to 200 MB and 2 minutes.
  let video = null; const vbox = $('#c-vid');
  $('#c-video')?.addEventListener('change', (e) => {
    const f = e.target.files[0]; video = null; if (!vbox) return;
    if (!f) { vbox.hidden = true; vbox.innerHTML = ''; return; }
    if (f.size > 200 * 1024 * 1024) { msg.textContent = `${f.name}: over 200 MB. Trim it, or record a shorter one.`; e.target.value = ''; return; }
    video = f; vbox.hidden = false;
    // A picture of the video, not its file name (Geoffrey, 2026-11-15). The frame is drawn to a data: image, which
    // the page rules allow; the blob: address is only used to read the video and is let go straight after.
    vbox.innerHTML = `<div class="cx-vprev"><img class="cx-vthumb" alt="Your video" hidden><span class="cx-vplay" aria-hidden="true">▶</span><span class="cx-vdur"></span><button type="button" class="cx-vx" id="c-vid-x" aria-label="Remove the video">×</button></div><input id="c-vid-alt" maxlength="300" placeholder="What happens in it? (helps people who can't watch)" aria-label="what happens in the video">`;
    $('#c-vid-x').addEventListener('click', () => { video = null; e.target.value = ''; vbox.hidden = true; vbox.innerHTML = ''; });
    const url = URL.createObjectURL(f); const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
    const done = () => URL.revokeObjectURL(url);
    v.addEventListener('loadedmetadata', () => {
      const d = v.duration; const dur = vbox.querySelector('.cx-vdur');
      if (dur && Number.isFinite(d)) dur.textContent = `${Math.floor(d / 60)}:${String(Math.round(d % 60)).padStart(2, '0')}`;
      if (Number.isFinite(d) && d > 121) { msg.textContent = 'That video is over 2 minutes. Trim it, or record a shorter one.'; }
      try { v.currentTime = Number.isFinite(d) ? Math.min(0.5, d / 3) : 0.1; } catch { done(); }
    }, { once: true });
    v.addEventListener('seeked', () => {
      try {
        const w = v.videoWidth || 320, h = v.videoHeight || 568, k = Math.min(1, 640 / Math.max(w, h));
        const c = document.createElement('canvas'); c.width = Math.round(w * k); c.height = Math.round(h * k);
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        const img = vbox.querySelector('.cx-vthumb'); if (img) { img.src = c.toDataURL('image/jpeg', 0.8); img.hidden = false; }
      } catch { /* no picture: the box still shows the play mark and length */ }
      done();
    }, { once: true });
    v.addEventListener('error', done, { once: true });
  });
  const sendVideo = (f, alt) => new Promise((ok, no) => {
    const x = new XMLHttpRequest(); x.open('POST', `/api/videos?alt=${encodeURIComponent(alt || '')}`); x.withCredentials = true;
    x.setRequestHeader('Content-Type', f.type || 'video/mp4'); x.setRequestHeader('X-Commons', '1');
    x.upload.onprogress = (ev) => { if (ev.lengthComputable) msg.textContent = `uploading video… ${Math.round(ev.loaded / ev.total * 100)}%`; };
    x.onload = () => { let j = {}; try { j = JSON.parse(x.responseText); } catch {} if (x.status >= 200 && x.status < 300) ok(j); else no(new Error(j.error || `video upload failed (${x.status})`)); };
    x.onerror = () => no(new Error('the video upload was cut off. Check your connection and try again.'));
    x.send(f);
  });
  // Sell / Offer (lib/sellpost.mjs): one key per thing being offered, kept across retries so a dropped connection
  // can't make it twice; a new key only after the server says this attempt is finished or refused.
  const newKey = () => { const a = new Uint8Array(12); crypto.getRandomValues(a); return 's' + [...a].map((x) => x.toString(16).padStart(2, '0')).join(''); };
  let sellKey = newKey();
  const sellMode = () => form.dataset.mode === 'sell';
  const amountRow = form.querySelector('.cx-amount');
  const syncAmount = () => { if (amountRow) amountRow.hidden = $('#cs-mode')?.value !== 'fixed'; };
  $('#cs-mode')?.addEventListener('change', syncAmount); syncAmount();
  const sellFields = () => {
    const title = $('#cs-title').value.trim(); const mode = $('#cs-mode').value; const type = $('#cs-type').value;
    if (title.length < 3) throw new Error('Give it a name (3 to 90 characters).');
    if (!$('#cs-rights').checked) throw new Error('Tick the box if you made this or hold the rights to offer it.');
    const price = mode === 'fixed' ? { mode, amount: Number($('#cs-amount').value) } : { mode };
    if (mode === 'fixed' && !(price.amount >= 1)) throw new Error('Set a price of at least $1, or choose Free or Ask for a quote.');
    return { title, category: $('#cs-cat').value, type, price, license: $('#cs-license').value, rights: true, ...($('#cs-page')?.value ? { page: $('#cs-page').value } : {}) };
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); if (posting) return; msg.textContent = '';
    const text = $('#c-text').value.trim();
    let sell = null;
    if (sellMode()) {
      const picked = [...form.querySelectorAll('.cx-mp')].filter((c) => c.querySelector('.cx-mp-on').checked);
      if (picked.length && !files.length) { msg.textContent = 'Add a photo of your art to put it on products.'; return; }
      const noPrice = picked.find((c) => !(Number(c.querySelector('.cx-mp-price input').value) >= 1));
      if (noPrice) { msg.textContent = `Set a price for the ${noPrice.querySelector('.cx-mp-name').textContent} (at least $1).`; return; }
      if (picked.length) { const amt = $('#cs-amount'); const m = $('#cs-mode'); if (m) m.value = 'fixed'; if (amt && !(Number(amt.value) >= 1)) amt.value = String(Math.min(...picked.map((c) => Number(c.querySelector('.cx-mp-price input').value)))); }
    }
    if (sellMode()) { try { sell = sellFields(); } catch (err) { msg.textContent = err.message; return; } if (!text) { msg.textContent = 'Describe what you are offering in the post (it becomes the listing description).'; return; } }
    if (!text && !files.length && !video) { msg.textContent = 'Write something, or add an image or a video.'; return; }
    posting = true; form.setAttribute('aria-busy', 'true');
    const controls = [...form.querySelectorAll('button,input,textarea,select')].map((el) => [el, el.disabled]);
    controls.forEach(([el]) => { el.disabled = true; });
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
      let vid = null;
      if (video) vid = (await sendVideo(video, $('#c-vid-alt')?.value.trim())).id;
      msg.textContent = 'posting…';
      const group = form.dataset.group || null;
      const release = $('#c-release')?.value || null;
      if (sell) {
        msg.textContent = 'publishing to the market and your feed…';
        const picked = [...form.querySelectorAll('.cx-mp')].filter((c) => c.querySelector('.cx-mp-on').checked).map((c) => ({ kind: c.dataset.kind, price: Number(c.querySelector('.cx-mp-price input').value) }));
        const merch = picked.length ? { art: ids[0], products: picked } : null;
        const send = () => fetch('/api/posts/sell', { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify({ key: sellKey, post: { text, images: ids, kind: $('#c-kind').value }, listing: { ...sell, text }, ...(merch ? { merch } : {}) }) });
        let sr = null; for (let i = 0; i < 3 && !sr; i++) sr = await send().catch(() => null);
        if (!sr) { msg.textContent = 'The connection dropped. Press Publish again: it will not be listed twice.'; return; }
        const sj = await sr.json().catch(() => ({}));
        if (!sr.ok) { if (sr.status !== 429 && sr.status < 500) sellKey = newKey(); msg.textContent = sj.error || `could not publish (${sr.status})`; return; }
        sellKey = newKey();
        location.href = `/social#${sj.post.id}`; location.reload(); return;
      }
      const r = await fetch('/api/posts', { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify({ text, images: ids, kind: $('#c-kind').value, ...(vid ? { video: vid } : {}), ...($('#c-topic')?.value ? { topic: $('#c-topic').value } : {}), ...(group ? { group } : {}), ...(release ? { release } : {}) }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) { msg.textContent = j.error || `could not post (${r.status})`; return; }
      if (!group && $('#c-cohabi')?.checked) { // 📣 also out on Cohabi's X, Bluesky & Facebook (lib/socialshare.mjs)
        msg.textContent = 'posted · sending to X, Bluesky and Facebook…';
        const sr = await fetch('/api/share', { method: 'POST', credentials: 'same-origin', headers: H, body: JSON.stringify({ post: j.id }) }).catch(() => null);
        const sj = sr ? await sr.json().catch(() => ({})) : {};
        msg.textContent = sr && sr.ok ? (sj.status === 'pending' ? 'Posted. A steward will send it out.' : sj.status === 'shared' ? 'Posted here and on X, Bluesky and Facebook.' : `Posted. Sharing: ${sj.status}.`) : `Posted here. Sharing out didn't work: ${sj.error || 'try 📣 in the post\'s Share menu'}.`;
        await new Promise((ok) => setTimeout(ok, 1600));
      }
      location.href = `${group ? location.pathname : '/social'}#${j.id}`; location.reload();
    } catch (err) { msg.textContent = err.message; }
    finally { posting = false; form.removeAttribute('aria-busy'); controls.forEach(([el, disabled]) => { el.disabled = disabled; }); }
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

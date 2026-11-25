// Small additions to the real feed; posting/reactions/comments retain their established handlers.
const byId = id => document.getElementById(id);
const composer = byId('compose');
const scrim = byId('cx-scrim');
if (composer && scrim) {
  // The Create post panel (Aletheia-6's design, 2026-11-15). Closing never posts; what you wrote stays until you post.
  const text = byId('c-text');
  let opener = null;
  const setMode = (mode) => {
    composer.dataset.mode = mode;
    composer.querySelectorAll('[data-cx-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cxMode === mode)));
    const go = composer.querySelector('.cx-post'); if (go) go.textContent = mode === 'sell' ? 'Publish →' : 'Post →';
    const h = byId('cx-title'); if (h) h.textContent = mode === 'sell' ? 'Sell or offer something' : 'Create post';
  };
  const open = (mode = 'post', from = null) => {
    opener = from || document.activeElement; setMode(mode); scrim.hidden = false; document.body.classList.add('cx-open');
    composer.classList.remove('cx-previewing');
    (mode === 'link' ? byId('fx-link-url') : text).focus();
  };
  const close = () => { stopCam(); scrim.hidden = true; document.body.classList.remove('cx-open'); opener?.focus?.(); };
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-cx-open]'); if (o) { e.preventDefault(); if (o.dataset.cxOpen === 'camera') { open('video', o); startCam(); } else open(o.dataset.cxOpen, o); return; }
    const m = e.target.closest('[data-cx-mode]'); if (m) { setMode(m.dataset.cxMode); return; }
    if (e.target === scrim) close();
  });
  byId('fx-write')?.addEventListener('click', (e) => open('post', e.currentTarget));
  // One "Add photos or a video" in Post (Geoffrey, 2026-11-24: photo and video are one choice, not two buttons). The
  // picked files go to the same photo and video inputs as before, so previews, alt text and posting are unchanged.
  const pass = (input, list) => { if (!input) return; const dt = new DataTransfer(); list.forEach((f) => dt.items.add(f)); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true })); };
  byId('c-any')?.addEventListener('change', (e) => {
    const all = [...e.target.files]; const pics = all.filter((f) => f.type.startsWith('image/')); const vid = all.find((f) => f.type.startsWith('video/'));
    if (vid) pass(byId('c-video'), [vid]); else if (pics.length) pass(byId('c-files'), pics);
    if (vid && pics.length) { const m = composer.querySelector('.form-msg'); if (m) m.textContent = 'One video per post: the video is kept. Post the photos separately.'; }
    e.target.value = '';
  });
  composer.querySelector('[data-cx-rec]')?.addEventListener('click', () => byId('cx-rec')?.click());
  byId('fx-compose-close')?.addEventListener('click', close);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !scrim.hidden) close(); });
  if (location.hash === '#compose') open('post');
  // Tag people: put an @ in the text; the members list (datalist) helps finish the name.
  byId('cx-tag')?.addEventListener('click', () => { const at = `${text.value && !/\s$/.test(text.value) ? ' ' : ''}@`; text.value += at; text.focus(); text.dispatchEvent(new Event('input', { bubbles: true })); });
  // Phone: Preview swaps to the preview and back.
  byId('cx-prevbtn')?.addEventListener('click', () => { composer.classList.add('cx-previewing'); byId('cx-backedit')?.focus(); });
  byId('cx-backedit')?.addEventListener('click', () => { composer.classList.remove('cx-previewing'); text.focus(); });
  // Live preview: the words, then the photo or video thumbnails feed.js draws.
  const mockText = byId('cx-mock-text'), mockMedia = byId('cx-mock-media');
  const paint = () => {
    mockText.textContent = text.value.trim() || 'Your post will appear here as you write.';
    mockText.classList.toggle('cx-empty', !text.value.trim());
    const thumbs = [...composer.querySelectorAll('#c-pics img, #c-vid img.cx-vthumb')].map((img) => img.src).filter(Boolean).slice(0, 4);
    mockMedia.innerHTML = ''; mockMedia.dataset.n = String(thumbs.length);
    for (const src of thumbs) { const im = document.createElement('img'); im.alt = ''; im.src = src; mockMedia.append(im); }
  };
  text.addEventListener('input', paint);
  // Watch only the two boxes feed.js fills (watching the whole form would see the preview's own changes and loop).
  const watch = new MutationObserver(paint); for (const id of ['c-pics', 'c-vid']) { const el = byId(id); if (el) watch.observe(el, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'hidden'] }); }

  // ● Record a video with the camera, right here (Geoffrey, 2026-11-15: "shoot live video to post it").
  // The camera fills the screen while it's open. Each camera frame is drawn onto a canvas of the camera's own shape, and
  // the canvas is what gets recorded, with the microphone's own track (2026-11-15: a phone video once posted sideways
  // and silent). 2026-11-25: no forced 9:16 any more; the video is exactly what the camera sees.
  const cam = byId('cx-cam'), camV = byId('cx-cam-v'), go = byId('cx-cam-go'), time = byId('cx-cam-time'), msg = composer.querySelector('.form-msg');
  const MAX = 120;
  let stream = null, rec = null, chunks = [], facing = 'user', started = 0, tick = null, raf = 0, canvas = null, ctx2 = null;
  // The recording is the camera's own picture, in the camera's own shape (Geoffrey, 2026-11-25: cropping to 9:16 zoomed a
  // phone's wide front camera in on his face; fitting it showed a thin band). No crop, no bars: what the camera sees.
  let W = 720, H = 1280;
  const fmt = (n) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
  // Chrome and Firefox: WebM with Opus sound (reliable); Safari: MP4 with AAC. The server makes every one an MP4.
  const pickType = () => (window.MediaRecorder ? ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm', 'video/mp4;codecs="avc1.42E01E,mp4a.40.2"', 'video/mp4'].find((t) => MediaRecorder.isTypeSupported(t)) || '' : '');
  // The preview IS this canvas, so what you see is exactly what records.
  const size = () => { // the canvas takes the camera's own shape, long side at most 1280
    const vw = camV.videoWidth, vh = camV.videoHeight; if (!vw || !vh) return;
    const k = Math.min(1, 1280 / Math.max(vw, vh)); const w = Math.round(vw * k / 2) * 2, h = Math.round(vh * k / 2) * 2;
    if (canvas && (canvas.width !== w || canvas.height !== h)) { canvas.width = w; canvas.height = h; } W = w; H = h;
  };
  const draw = () => {
    if (ctx2 && camV.videoWidth) {
      if (!rec) size(); // never change shape mid-recording
      ctx2.save(); if (facing === 'user') { ctx2.translate(W, 0); ctx2.scale(-1, 1); } // selfie as a mirror, like every phone
      ctx2.drawImage(camV, 0, 0, W, H);
      ctx2.restore();
    }
    raf = requestAnimationFrame(draw);
  };
  function stopCam() {
    clearInterval(tick); tick = null; cancelAnimationFrame(raf); raf = 0;
    if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop(); }
    rec = null; stream?.getTracks().forEach((t) => t.stop()); stream = null;
    if (camV) camV.srcObject = null; if (cam) cam.hidden = true; document.body.classList.remove('cx-camopen');
    go?.classList.remove('cx-recording'); document.querySelectorAll('[data-cam-mode]').forEach((b) => { b.disabled = false; }); if (go) go.setAttribute('aria-label', go.classList.contains('cx-photo') ? 'Take a photo' : 'Start recording');
  }
  const startCam = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream) { msg.textContent = "This browser can't record here. Tap Choose a video: on a phone it offers your camera too."; return; }
    try {
      stream?.getTracks().forEach((t) => t.stop());
      // Only the long side is asked for, so the phone keeps its camera's natural shape (nothing cropped or zoomed).
      const long = innerHeight >= innerWidth ? { height: { ideal: 1280 } } : { width: { ideal: 1280 } };
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, ...long }, audio: { echoCancellation: true, noiseSuppression: true } });
      camV.srcObject = stream; await camV.play().catch(() => {});
      if (!canvas) { canvas = byId('cx-cam-c'); ctx2 = canvas.getContext('2d'); } cancelAnimationFrame(raf); draw();
      cam.hidden = false; document.body.classList.add('cx-camopen'); time.textContent = `0:00 / ${fmt(MAX)}`; msg.textContent = '';
      
      if (!stream.getAudioTracks().length) msg.textContent = 'No microphone found: this video will have no sound.';
    } catch (err) {
      msg.textContent = err && err.name === 'NotAllowedError' ? 'The camera or microphone is blocked for cohabi.org. Allow both in your browser settings, then try again.' : "Couldn't open a camera. Tap Choose a video instead.";
      stopCam();
    }
  };
  byId('cx-rec')?.addEventListener('click', startCam);
  byId('cx-cam-x')?.addEventListener('click', stopCam);
  byId('cx-cam-flip')?.addEventListener('click', () => { if (rec) return; facing = facing === 'user' ? 'environment' : 'user'; startCam(); });
  // Photo or Video, like a phone's camera app (Geoffrey, 2026-11-25: "you can't take a photo with the camera").
  // Photo mode: the shutter takes a still of exactly what the preview shows and adds it to the post's photos.
  let shoot = 'video';
  const modeBtns = [...document.querySelectorAll('[data-cam-mode]')];
  const setCamMode = (m) => {
    if (rec) return; shoot = m;
    for (const b of modeBtns) { const on = b.dataset.camMode === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); }
    go?.classList.toggle('cx-photo', m === 'photo'); go?.setAttribute('aria-label', m === 'photo' ? 'Take a photo' : 'Start recording');
    time.hidden = m === 'photo';
  };
  for (const b of modeBtns) b.addEventListener('click', () => setCamMode(b.dataset.camMode));
  const takePhoto = () => {
    canvas.toBlob((blob) => {
      if (!blob) { msg.textContent = "Couldn't take the photo. Try again, or tap Add photos."; return; }
      const file = new File([blob], `photo-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.jpg`, { type: 'image/jpeg' });
      const input = byId('c-files'); const dt = new DataTransfer();
      for (const f of input.files || []) dt.items.add(f); // keep photos already chosen (up to 4)
      if (dt.items.length >= 4) { msg.textContent = 'A post holds up to 4 photos.'; return; }
      dt.items.add(file); input.files = dt.files; stopCam(); input.dispatchEvent(new Event('change', { bubbles: true }));
    }, 'image/jpeg', 0.92);
  };
  go?.addEventListener('click', () => {
    if (!stream) return;
    if (shoot === 'photo') { takePhoto(); return; }
    if (rec) { rec.stop(); return; }
    const out = canvas.captureStream(30); stream.getAudioTracks().forEach((t) => out.addTrack(t));
    const type = pickType(); chunks = [];
    try { rec = type ? new MediaRecorder(out, { mimeType: type, videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128_000 }) : new MediaRecorder(out); } catch { msg.textContent = "This browser can't record video here. Tap Choose a video instead."; return; }
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const base = (rec?.mimeType || type || 'video/webm').split(';')[0];
      const file = new File(chunks, `recording-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${base.includes('mp4') ? 'mp4' : 'webm'}`, { type: base });
      rec = null; stopCam();
      const input = byId('c-video'); const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    rec.start(1000); started = Date.now(); modeBtns.forEach((b) => { b.disabled = true; }); go.classList.add('cx-recording'); go.setAttribute('aria-label', 'Stop recording');
    tick = setInterval(() => { const s = (Date.now() - started) / 1000; time.textContent = `${fmt(s)} / ${fmt(MAX)}`; if (s >= MAX) rec?.stop(); }, 250);
  });

  // Link: add a link to the post text.
  byId('fx-insert-link')?.addEventListener('click', () => {
    const input = byId('fx-link-url'), message = byId('fx-link-msg');
    try {
      const url = new URL(input.value.trim());
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error();
      const link = `[Link](${url.href.replace(/[()]/g, c => c === '(' ? '%28' : '%29')})`;
      const addition = `${text.value ? '\n' : ''}${link}`;
      if (text.value.length + addition.length > text.maxLength) { message.textContent = 'That link would exceed the post length. Shorten the post first.'; return; }
      text.value += addition;
      text.dispatchEvent(new Event('input', {bubbles:true}));
      input.value = ''; message.textContent = 'Added to your post.'; text.focus();
    } catch { message.textContent = 'Enter a complete http:// or https:// link.'; input.focus(); }
  });
}
// Clearly scoped local search: no claim to search unloaded posts, people or the whole network.
const search = byId('fx-find-input'), stream = byId('fx-stream');
if (search && stream) {
  byId('fx-find').hidden = false;
  const filter = () => {
    const q = search.value.trim().toLocaleLowerCase();
    const cards = [...stream.querySelectorAll('.fx-post')];
    let count = 0;
    for (const card of cards) { const match = !q || card.textContent.toLocaleLowerCase().includes(q); card.hidden = !match; if (match) count++; }
    stream.querySelectorAll('.fx-inline').forEach(widget => { widget.hidden = !!q; });
    const more = byId('fx-more'); if (more) more.hidden = !!q;
    byId('fx-find-status').textContent = q ? `${count} of ${cards.length} loaded posts match.` : '';
  };
  search.addEventListener('input', filter);
  new MutationObserver(filter).observe(stream, {childList:true});
}

// A failed album thumbnail must not replace the readable release title with broken alt text.
const hideFailedCover = image => { if (image.matches('.fx-rel img')) image.hidden = true; };
document.addEventListener('error', event => { if (event.target instanceof HTMLImageElement) hideFailedCover(event.target); }, true);
document.querySelectorAll('.fx-rel img').forEach(image => { if (image.complete && !image.naturalWidth) hideFailedCover(image); });

// Native app menus retain keyboard behavior; Escape returns focus to the menu summary.
document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;for(const menu of document.querySelectorAll('.fx-app-switch[open],.fx-deeper[open]')){menu.open=false;menu.querySelector('summary')?.focus();}});

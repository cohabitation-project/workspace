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
  };
  const open = (mode = 'post', from = null) => {
    opener = from || document.activeElement; setMode(mode); scrim.hidden = false; document.body.classList.add('cx-open');
    composer.classList.remove('cx-previewing');
    (mode === 'link' ? byId('fx-link-url') : text).focus();
  };
  const close = () => { stopCam(); scrim.hidden = true; document.body.classList.remove('cx-open'); opener?.focus?.(); };
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-cx-open]'); if (o) { e.preventDefault(); open(o.dataset.cxOpen, o); return; }
    const m = e.target.closest('[data-cx-mode]'); if (m) { setMode(m.dataset.cxMode); return; }
    if (e.target === scrim) close();
  });
  byId('fx-write')?.addEventListener('click', (e) => open('post', e.currentTarget));
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
  const cam = byId('cx-cam'), camV = byId('cx-cam-v'), go = byId('cx-cam-go'), time = byId('cx-cam-time'), msg = composer.querySelector('.form-msg');
  let stream = null, rec = null, chunks = [], facing = 'user', started = 0, tick = null;
  const MAX = 120;
  const fmt = (n) => `${Math.floor(n / 60)}:${String(Math.floor(n % 60)).padStart(2, '0')}`;
  const pickType = () => (window.MediaRecorder ? ['video/mp4;codecs=avc1,mp4a', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'].find((t) => MediaRecorder.isTypeSupported(t)) || '' : '');
  function stopCam() {
    clearInterval(tick); tick = null;
    if (rec && rec.state !== 'inactive') { rec.onstop = null; rec.stop(); }
    rec = null; stream?.getTracks().forEach((t) => t.stop()); stream = null;
    if (camV) camV.srcObject = null; if (cam) cam.hidden = true;
  }
  const startCam = async () => {
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { msg.textContent = "This browser can't record here. Tap Choose a video: on a phone it offers your camera too."; return; }
    try {
      stream?.getTracks().forEach((t) => t.stop());
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 1280 } }, audio: true });
      camV.srcObject = stream; cam.hidden = false; time.textContent = `0:00 / ${fmt(MAX)}`; go.textContent = '● Start recording'; msg.textContent = '';
    } catch (err) {
      msg.textContent = err && err.name === 'NotAllowedError' ? 'The camera is blocked for cohabi.org. Allow the camera and microphone in your browser settings, then try again.' : "Couldn't open a camera. Tap Choose a video instead.";
      stopCam();
    }
  };
  byId('cx-rec')?.addEventListener('click', startCam);
  byId('cx-cam-x')?.addEventListener('click', stopCam);
  byId('cx-cam-flip')?.addEventListener('click', () => { if (rec) return; facing = facing === 'user' ? 'environment' : 'user'; startCam(); });
  go?.addEventListener('click', () => {
    if (!stream) return;
    if (rec) { rec.stop(); return; }
    const type = pickType(); chunks = [];
    try { rec = type ? new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 2_500_000 }) : new MediaRecorder(stream); } catch { msg.textContent = "This browser can't record video here. Tap Choose a video instead."; return; }
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
    rec.onstop = () => {
      const base = (rec?.mimeType || type || 'video/webm').split(';')[0];
      const file = new File(chunks, `recording-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.${base.includes('mp4') ? 'mp4' : 'webm'}`, { type: base });
      stopCam();
      const input = byId('c-video'); const dt = new DataTransfer(); dt.items.add(file); input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    rec.start(1000); started = Date.now(); go.textContent = '■ Stop'; go.classList.add('cx-recording');
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

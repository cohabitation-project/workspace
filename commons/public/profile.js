// profile.js — the member page (2026-11-04, after Aletheia-6's design): tabs, and the owner's edit dialog.
// No inline handlers (the Commons CSP is script-src 'self'). Without JS every section still shows, one after another.
import './social.js';
const $ = (s, el = document) => el.querySelector(s);
const pf = $('.pf');
if (pf) {
  pf.classList.add('js');
  const tabs = [...pf.querySelectorAll('.pf-tabs [role=tab]')];
  const show = (id, focus = false) => {
    for (const t of tabs) { const on = t.dataset.tab === id; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); }
    for (const p of pf.querySelectorAll('.pf-pane')) p.hidden = p.id !== `pane-${id}`;
    try { history.replaceState(null, '', `#${id}`); } catch { /* fine */ }
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => show(t.dataset.tab));
    t.addEventListener('keydown', (e) => {
      const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
      e.preventDefault(); show(tabs[(i + d + tabs.length) % tabs.length].dataset.tab, true);
    });
  });
  const start = location.hash.slice(1);
  show(tabs.some((t) => t.dataset.tab === start) ? start : 'feed');
}

const dlg = $('#pf-dialog');
if (dlg) {
  // add an image to my library from inside the editor, then offer it as banner/portrait
  $('#pf-upload')?.addEventListener('click', async () => {
    const f = $('#pf-file').files[0]; const out = $('#pf-upmsg'); if (!f) { out.textContent = 'choose an image first'; return; }
    const alt = $('#pf-alt').value.trim(); if (alt.length < 3) { out.textContent = 'say what it shows'; return; }
    out.textContent = 'uploading…';
    try {
      const { uploadImage } = await import('./feed.js');
      const it = await uploadImage(f, { alt, credit: $('#pf-credit').value.trim() });
      for (const sel of dlg.querySelectorAll('.pf-imgsel')) { const o = document.createElement('option'); o.value = it.id; o.textContent = alt.slice(0, 60); sel.append(o); }
      out.textContent = 'added: choose it as banner or portrait above';
    } catch (err) { out.textContent = err.message; }
  });
  const form = $('#pf-form'); const msg = form.querySelector('.form-msg');
  $('#pf-edit').addEventListener('click', () => { msg.textContent = ''; dlg.showModal(); });
  $('#pf-cancel').addEventListener('click', () => dlg.close());
  $('#pf-cancel2')?.addEventListener('click', () => dlg.close());
  for (const r of dlg.querySelectorAll('input[type=range]')) r.addEventListener('input', () => { const o = r.parentElement.querySelector('output'); if (o) o.textContent = r.value; });
  $('#pf-privacy')?.addEventListener('click', () => { msg.textContent = ''; dlg.showModal(); dlg.querySelector('.pf-vis input')?.focus(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const body = {
      headline: String(f.get('headline') || ''), bio: String(f.get('bio') || ''),
      skills: String(f.get('skills') || '').split(',').map((x) => x.trim()).filter(Boolean),
      rain: !!f.get('rain'),
      theme: f.get('theme'), accent: f.get('accent'), font: f.get('font'), layout: f.get('layout'),
      banner: String(f.get('banner') || ''), portrait: String(f.get('portrait') || ''),
      visibility: { headline: f.get('vis-headline') ? 'private' : 'public', bio: f.get('vis-bio') ? 'private' : 'public', skills: f.get('vis-skills') ? 'private' : 'public' },
      mood: String(f.get('mood') || ''), meet: String(f.get('meet') || ''), links: String(f.get('links') || ''),
      rain_style: { color: f.get('rain-color'), bg: f.get('rain-bg'), speed: +f.get('rain-speed'), density: +f.get('rain-density'), opacity: +f.get('rain-opacity'), symbols: String(f.get('rain-symbols') || '').trim() || undefined },
      top8: String(f.get('top8') || '').split(',').map((x) => x.trim()).filter(Boolean),
      song: String(f.get('song-path') || '').trim() ? { path: String(f.get('song-path')).trim(), title: String(f.get('song-title') || '') } : null,
      custom_css: String(f.get('custom_css') || ''),
    };
    msg.textContent = 'saving…';
    try {
      const r = await fetch('/api/me', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { msg.textContent = j.error || `could not save (${r.status})`; return; }
      location.reload();
    } catch { msg.textContent = 'could not reach the Commons; try again'; }
  });
}

// ---- Matrix rain behind the page, when the member turned it on (Geoffrey, 2026-11-04). Per-viewer pause button;
// never runs for prefers-reduced-motion; pauses when the tab is hidden.
if (pf && pf.dataset.rain === '1' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const KEY = 'commons-rain-paused';
  let paused = false; try { paused = localStorage.getItem(KEY) === '1'; } catch { /* fine */ }
  const cv = document.createElement('canvas'); cv.className = 'pf-rain-canvas'; cv.setAttribute('aria-hidden', 'true');
  document.body.prepend(cv);
  const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn ghost pf-rain-btn';
  const label = () => { btn.textContent = paused ? '▶ rain' : '❚❚ rain'; btn.setAttribute('aria-label', paused ? 'start the Matrix rain' : 'pause the Matrix rain'); };
  label(); document.body.append(btn);
  let st = {}; try { st = JSON.parse(pf.dataset.rainStyle || '{}'); } catch { /* defaults */ }
  const color = st.color || '#3ddc84', bg = st.bg || '#050c09', speed = st.speed || 5, density = st.density || 6;
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [br, bgc, bb] = hex(bg); const light = (h) => { const [r, g2, b] = hex(h); return `rgb(${Math.min(255, r + 140)}, ${Math.min(255, g2 + 140)}, ${Math.min(255, b + 140)})`; };
  cv.style.opacity = String((st.opacity || 38) / 100);
  const g = cv.getContext('2d'); const CH = [...(st.symbols || 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ハヒフヘホマミムメモヤユヨラリルレロワン')];
  let cols = [], fs = 16;
  const size = () => { cv.width = innerWidth; cv.height = innerHeight; fs = innerWidth < 600 ? 13 : 16; cols = Array.from({ length: Math.ceil(cv.width / fs) }, () => (Math.random() < density / 10 ? Math.random() * -cv.height / fs : null)); g.fillStyle = bg; g.fillRect(0, 0, cv.width, cv.height); };
  size(); addEventListener('resize', size);
  let last = 0;
  const tick = (t) => {
    requestAnimationFrame(tick);
    if (paused || document.hidden || t - last < (120 - speed * 10)) return; last = t;
    g.fillStyle = `rgba(${br}, ${bgc}, ${bb}, 0.12)`; g.fillRect(0, 0, cv.width, cv.height);
    g.font = `${fs}px monospace`;
    for (let i = 0; i < cols.length; i++) {
      if (cols[i] === null) { if (Math.random() < density / 4000) cols[i] = 0; continue; }
      const y = cols[i] * fs; g.fillStyle = Math.random() < 0.04 ? light(color) : color;
      g.fillText(CH[(Math.random() * CH.length) | 0], i * fs, y);
      cols[i] = y > cv.height && Math.random() > 0.975 ? 0 : cols[i] + 1;
    }
  };
  requestAnimationFrame(tick);
  btn.addEventListener('click', () => { paused = !paused; try { localStorage.setItem(KEY, paused ? '1' : '0'); } catch { /* fine */ } cv.style.opacity = paused ? '0' : String((st.opacity || 38) / 100); label(); });
  if (paused) cv.style.opacity = '0';
}

// ---- tap your picture or the banner to change it (Geoffrey, 2026-11-05)
const picker = document.getElementById('pf-picker');
if (picker) {
  let slot = 'portrait'; const msg = picker.querySelector('.form-msg');
  const save = async (value) => {
    msg.textContent = 'saving…';
    const r = await fetch('/api/me', { method: 'PATCH', credentials: 'same-origin', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ [slot]: value }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) { msg.textContent = j.error || `could not save (${r.status})`; return; }
    location.reload();
  };
  const open = (which) => { slot = which; msg.textContent = ''; picker.querySelector('h2').textContent = which === 'banner' ? 'Choose your banner' : 'Choose your picture'; picker.showModal(); };
  for (const el of document.querySelectorAll('[data-pick]')) {
    el.addEventListener('click', () => open(el.dataset.pick));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(el.dataset.pick); } });
  }
  document.getElementById('pk-close').addEventListener('click', () => picker.close());
  for (const b of picker.querySelectorAll('.pk-img')) b.addEventListener('click', () => save(b.dataset.id));
  document.getElementById('pk-clear').addEventListener('click', () => save(''));
  document.getElementById('pk-upload').addEventListener('click', async () => {
    const f = document.getElementById('pk-file').files[0]; if (!f) { msg.textContent = 'choose an image first'; return; }
    const alt = document.getElementById('pk-alt').value.trim(); if (alt.length < 3) { msg.textContent = 'say what it shows'; return; }
    msg.textContent = 'uploading…';
    try { const { uploadImage } = await import('./feed.js'); const it = await uploadImage(f, { alt, credit: document.getElementById('pk-credit').value.trim() }); await save(it.id); }
    catch (err) { msg.textContent = err.message; }
  });
}

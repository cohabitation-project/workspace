// profile.js — the member page (2026-11-04, after Aletheia-6's design): tabs, and the owner's edit dialog.
// No inline handlers (the Commons CSP is script-src 'self'). Without JS every section still shows, one after another.
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
  const form = $('#pf-form'); const msg = form.querySelector('.form-msg');
  $('#pf-edit').addEventListener('click', () => { msg.textContent = ''; dlg.showModal(); });
  $('#pf-cancel').addEventListener('click', () => dlg.close());
  $('#pf-privacy')?.addEventListener('click', () => { msg.textContent = ''; dlg.showModal(); dlg.querySelector('.pf-vis input')?.focus(); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const body = {
      headline: String(f.get('headline') || ''), bio: String(f.get('bio') || ''),
      skills: String(f.get('skills') || '').split(',').map((x) => x.trim()).filter(Boolean),
      rain: !!f.get('rain'),
      visibility: { headline: f.get('vis-headline') ? 'private' : 'public', bio: f.get('vis-bio') ? 'private' : 'public', skills: f.get('vis-skills') ? 'private' : 'public' },
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
  const g = cv.getContext('2d'); const CH = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ハヒフヘホマミムメモヤユヨラリルレロワン';
  let cols = [], fs = 16;
  const size = () => { cv.width = innerWidth; cv.height = innerHeight; fs = innerWidth < 600 ? 13 : 16; cols = Array.from({ length: Math.ceil(cv.width / fs) }, () => Math.random() * -cv.height / fs); g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height); };
  size(); addEventListener('resize', size);
  let last = 0;
  const tick = (t) => {
    requestAnimationFrame(tick);
    if (paused || document.hidden || t - last < 55) return; last = t;
    g.fillStyle = 'rgba(5, 12, 9, 0.12)'; g.fillRect(0, 0, cv.width, cv.height);
    g.font = `${fs}px monospace`;
    for (let i = 0; i < cols.length; i++) {
      const y = cols[i] * fs; g.fillStyle = Math.random() < 0.04 ? '#d8ffe6' : '#3ddc84';
      g.fillText(CH[(Math.random() * CH.length) | 0], i * fs, y);
      cols[i] = y > cv.height && Math.random() > 0.975 ? 0 : cols[i] + 1;
    }
  };
  requestAnimationFrame(tick);
  btn.addEventListener('click', () => { paused = !paused; try { localStorage.setItem(KEY, paused ? '1' : '0'); } catch { /* fine */ } cv.style.opacity = paused ? '0' : ''; label(); });
  if (paused) cv.style.opacity = '0';
}

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
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const body = {
      headline: String(f.get('headline') || ''), bio: String(f.get('bio') || ''),
      skills: String(f.get('skills') || '').split(',').map((x) => x.trim()).filter(Boolean),
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

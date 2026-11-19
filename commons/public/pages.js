// pages.js — editing a band, artist or business page (only its managers see the editor).
const $ = (s, r = document) => r.querySelector(s);
const dlg = $('#pg-dialog');
const KIND_FIELDS = { band: ['location', 'genres', 'sounds_like', 'influences', 'record_label', 'label_type', 'members', 'shows'], artist: ['location', 'mediums', 'commissions', 'influences'], business: ['location', 'services', 'service_area', 'hours'], label: ['location', 'genres'] };
if (dlg) {
  const form = $('#pg-form'); const msg = $('#pg-msg'); const kind = $('#pf-kind', form);
  // Preview appearance on the actual page while the editor is open. Persist only on save.
  const page = document.querySelector('.mk-page') || document.body;
  const original = { theme: page.dataset.mk, gold: page.style.getPropertyValue('--gold'), goldInk: page.style.getPropertyValue('--gold-ink') };
  const themeField = form.querySelector('[name="theme"]');
  const accentField = form.querySelector('[name="accent"]');
  let saving = false; let uploading = 0;
  const readableInk = (hex) => {
    const n = parseInt(String(hex).replace('#', ''), 16);
    if (!Number.isFinite(n)) return '#ffffff';
    const linear = (v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
    const lum = 0.2126 * linear((n >> 16) & 255) + 0.7152 * linear((n >> 8) & 255) + 0.0722 * linear(n & 255);
    return (lum + 0.05) / 0.05 >= 4.5 ? '#10171c' : '#ffffff';
  };
  const preview = () => {
    if (themeField?.value) page.dataset.mk = themeField.value;
    if (accentField?.value) {
      page.style.setProperty('--gold', accentField.value);
      page.style.setProperty('--gold-ink', readableInk(accentField.value));
    }
  };
  const revert = () => {
    if (original.theme === undefined) delete page.dataset.mk; else page.dataset.mk = original.theme;
    for (const [key, value] of [['--gold', original.gold], ['--gold-ink', original.goldInk]]) {
      if (value) page.style.setProperty(key, value); else page.style.removeProperty(key);
    }
  };
  const discard = () => { if (saving || uploading) return; form.reset(); revert(); msg.textContent = ''; dlg.close(); };
  $('#pg-edit')?.addEventListener('click', () => { msg.textContent = ''; dlg.showModal(); preview(); });
  $('#pg-cancel2')?.addEventListener('click', discard);
  // The visible X saves, like clicking the backdrop. Cancel is the explicit discard path.
  $('#pg-cancel')?.addEventListener('click', () => { if (!saving && !uploading) form.requestSubmit(); });
  for (const event of ['input', 'change']) form.addEventListener(event, (e) => {
    if (e.target === themeField || e.target === accentField) preview();
  });
  dlg.addEventListener('pointerdown', (e) => {
    if (e.target !== dlg || saving || uploading) return;
    const b = dlg.getBoundingClientRect();
    if (e.clientX < b.left || e.clientX > b.right || e.clientY < b.top || e.clientY > b.bottom) form.requestSubmit();
  });
  dlg.addEventListener('cancel', (e) => { e.preventDefault(); if (!saving && !uploading) form.requestSubmit(); });
  const showKind = () => { const on = new Set(KIND_FIELDS[kind?.value] || []); for (const el of form.querySelectorAll('.pf-kf')) el.hidden = !on.has(el.dataset.kf); };
  kind?.addEventListener('change', showKind); showKind();
  // Upload a picture straight from the page editor (Geoffrey, 2026-11-19: "I can't edit the logo from the page").
  // The new image is uploaded as yours, added to the list, and selected; Save puts it on the page.
  for (const input of form.querySelectorAll('[data-pg-upload]')) input.addEventListener('change', async () => {
    const file = input.files && input.files[0]; if (!file) return;
    const sel = form.querySelector(`select[name="${input.dataset.pgUpload}"]`); const name = (form.querySelector('[name="name"]')?.value || document.title.split(' · ')[0] || 'this page').trim();
    if (file.size > 20 * 1024 * 1024) { msg.textContent = 'That picture is over 20 MB.'; return; }
    uploading++;
    msg.textContent = 'Uploading…';
    try {
      const data = await new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => bad(new Error('could not read the file')); r.readAsDataURL(file); });
      const alt = `${name} ${input.dataset.pgUpload === 'banner' ? 'banner' : 'logo'}`;
      const r = await fetch('/api/images', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ data, alt, title: alt, made_by: 'human' }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `error ${r.status}`);
      const o = document.createElement('option'); o.value = j.id; o.textContent = alt; sel.prepend(o); sel.value = j.id;
      msg.textContent = 'Uploaded. Press Save to put it on the page.';
    } catch (err) { msg.textContent = `Upload failed: ${err.message}`; }
    finally { uploading--; }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving || uploading) { msg.textContent = uploading ? 'Finish uploading before saving.' : 'Already saving…'; return; }
    saving = true;
    const f = new FormData(form); const k = kind?.value;
    const info = {};
    for (const key of KIND_FIELDS[k] || []) { const v = f.get(`kf-${key}`); if (v === null) continue; info[key] = ['shows', 'members'].includes(key) ? String(v).split('\n').map((x) => x.trim()).filter(Boolean) : String(v).trim(); }
    const body = { headline: f.get('headline') || '', bio: f.get('bio') || '', theme: f.get('theme'), accent: f.get('accent'), portrait: f.get('portrait') || '', banner: f.get('banner') || '', links: String(f.get('links') || ''), kind_info: info, gallery: f.getAll('gallery') };
    if (k) body.kind = k;
    if (f.get('name') !== null) body.name = f.get('name');
    const add = String(f.get('add_manager') || '').trim(); if (add) body.add_manager = add;
    const art = String(f.get('add_artist') || '').trim(); if (art) body.add_artist = art;
    msg.textContent = 'Saving…';
    try {
      const r = await fetch(`/api/pages/${form.dataset.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `error ${r.status}`);
      location.href = j.href || location.pathname;
    } catch (err) { msg.textContent = `Not saved: ${err.message}. Your edits are still here.`; }
    finally { saving = false; }
  });
}
// creating a page (/p/new)
const nf = $('#pg-new');
if (nf) nf.addEventListener('submit', async (e) => {
  e.preventDefault(); const f = new FormData(nf); const out = $('#pg-newmsg'); out.textContent = 'Making your page…';
  try {
    const r = await fetch('/api/pages', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ kind: f.get('kind'), name: f.get('name') }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `error ${r.status}`);
    location.href = j.href;
  } catch (err) { out.textContent = err.message; }
});

// A member-run label page (2026-11-18): a band asks to join, and the label's managers answer. Built here from the
// page's own API so the page, its edit form and the asks all use the same PATCH route.
(async () => {
  const m = location.pathname.match(/^\/page\/([^/]+)\/?$/); if (!m) return;
  const H = { 'Content-Type': 'application/json', 'X-Commons': '1' };
  const el = (tag, text, attrs = {}) => { const e = document.createElement(tag); if (text) e.textContent = text; for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
  let label, mine;
  try {
    const r = await fetch(`/api/pages/${encodeURIComponent(m[1])}`, { headers: { 'X-Commons': '1' } }); if (!r.ok) return; label = await r.json();
    if (label.kind !== 'label' || label.label_record) return;
    const r2 = await fetch('/api/me/pages', { headers: { 'X-Commons': '1' } }); if (!r2.ok) return; mine = (await r2.json()).pages || [];
  } catch { return; }
  const host = $('.mk-pagemain') || $('main'); if (!host) return;
  const slugOfHref = (h) => String(h || '').split('/').filter(Boolean).pop();
  const send = async (body, out) => {
    out.textContent = 'Sending…';
    try {
      const r = await fetch(`/api/pages/${label.id}`, { method: 'PATCH', headers: H, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `error ${r.status}`);
      location.reload();
    } catch (err) { out.textContent = err.message; }
  };
  const sec = el('section', '', { id: 'pg-roster-asks', class: 'mk-about' });
  const runsLabel = mine.some((x) => x.id === label.id);
  const onRoster = new Set(label.roster || []);
  const pending = (label.requests || []).filter((r) => !onRoster.has(r.slug));
  if (runsLabel) {
    if (!pending.length) return;
    sec.append(el('h2', 'Bands asking to join', { class: 'mk-h' }));
    const ul = el('ul', '', { class: 'mk-links' }); const out = el('p', '', { class: 'form-msg', role: 'status' });
    for (const r of pending) {
      const li = el('li'); const name = el('strong', r.slug); li.append(name, el('span', ` asked by ${r.by?.name || 'a member'} `, { class: 'muted small' }));
      fetch(`/api/pages/${encodeURIComponent(r.slug)}`, { headers: { 'X-Commons': '1' } }).then((x) => (x.ok ? x.json() : null)).then((b) => { if (b?.name) name.textContent = b.name; }).catch(() => {});
      for (const [answer, text] of [['yes', 'Approve'], ['no', 'Decline']]) { const b = el('button', text, { type: 'button', class: answer === 'yes' ? 'btn small' : 'btn ghost small' }); b.addEventListener('click', () => send({ decide_join: { band: r.slug, answer } }, out)); li.append(b, ' '); }
      ul.append(li);
    }
    sec.append(ul, out);
  } else {
    const waiting = new Set(pending.map((r) => r.slug));
    const bands = mine.filter((x) => ['band', 'artist'].includes(x.kind) && !onRoster.has(slugOfHref(x.href)) && !waiting.has(slugOfHref(x.href)));
    if (!bands.length) return;
    sec.append(el('h2', 'Ask to join this label', { class: 'mk-h' }));
    const form = el('form', '', { class: 'mk-form' }); const sel = el('select', '', { name: 'band', 'aria-label': 'Which of your pages' });
    for (const b of bands) sel.append(el('option', b.name, { value: b.id }));
    const btn = el('button', 'Ask to join', { class: 'btn' }); const out = el('span', '', { class: 'form-msg', role: 'status' });
    form.append(sel, ' ', btn, ' ', out); form.addEventListener('submit', (e) => { e.preventDefault(); send({ request_join: sel.value }, out); });
    sec.append(el('p', `${label.name}'s managers answer. Nothing is added until they say yes.`, { class: 'small muted' }), form);
  }
  host.prepend(sec);
})();

// One-tap picture and background changes on the page itself, for its managers (Geoffrey, 2026-11-19: "editable just
// like a normal site"). Uploads the file as yours and saves it on the page straight away.
for (const input of document.querySelectorAll('[data-pg-quick]')) input.addEventListener('change', async () => {
  const file = input.files && input.files[0]; if (!file) return;
  const out = document.querySelector('.mk-quickmsg'); const say = (t) => { if (out) out.textContent = t; };
  const id = document.querySelector('#pg-form')?.dataset.id; if (!id) return say('Open the editor once, then try again.');
  if (file.size > 20 * 1024 * 1024) return say('That picture is over 20 MB.');
  const which = input.dataset.pgQuick; const name = document.title.split(' · ')[0] || 'This page';
  say('Uploading…');
  try {
    const data = await new Promise((ok, bad) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = () => bad(new Error('could not read the file')); r.readAsDataURL(file); });
    const alt = `${name} ${which === 'banner' ? 'background' : 'logo'}`;
    const up = await fetch('/api/images', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ data, alt, title: alt, made_by: 'human' }) });
    const img = await up.json().catch(() => ({})); if (!up.ok) throw new Error(img.error || `error ${up.status}`);
    say('Saving…');
    const r = await fetch(`/api/pages/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify({ [which]: img.id }) });
    const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `error ${r.status}`);
    location.reload();
  } catch (err) { say(`Didn't save: ${err.message}`); }
});

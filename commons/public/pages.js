// pages.js — editing a band, artist or business page (only its managers see the editor).
const $ = (s, r = document) => r.querySelector(s);
const dlg = $('#pg-dialog');
const KIND_FIELDS = { band: ['location', 'genres', 'sounds_like', 'influences', 'record_label', 'label_type', 'members', 'shows'], artist: ['location', 'mediums', 'commissions', 'influences'], business: ['location', 'services', 'service_area', 'hours'], label: ['location', 'genres'] };
if (dlg) {
  const form = $('#pg-form'); const msg = $('#pg-msg'); const kind = $('#pf-kind', form);
  $('#pg-edit')?.addEventListener('click', () => { msg.textContent = ''; dlg.showModal(); });
  for (const id of ['#pg-cancel', '#pg-cancel2']) $(id)?.addEventListener('click', () => dlg.close());
  const showKind = () => { const on = new Set(KIND_FIELDS[kind?.value] || []); for (const el of form.querySelectorAll('.pf-kf')) el.hidden = !on.has(el.dataset.kf); };
  kind?.addEventListener('change', showKind); showKind();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
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
    } catch (err) { msg.textContent = err.message; }
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

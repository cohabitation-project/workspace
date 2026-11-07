// market.js — the Cohabi Market's forms: list or edit, withdraw, and the public question thread.
const $ = (s, r = document) => r.querySelector(s);
const send = async (url, method, body) => {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `error ${r.status}`); return j;
};

const form = $('#mk-form');
if (form) {
  const modeSel = form.querySelector('[name=price_mode]');
  const sync = () => {
    const m = modeSel.value;
    form.querySelector('.mk-amount').hidden = m !== 'fixed';
    form.querySelector('.mk-packsform').hidden = m !== 'packages';
  };
  modeSel.addEventListener('change', sync); sync();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(form); const msg = $('#mk-msg');
    const mode = f.get('price_mode');
    const body = {
      title: f.get('title'), text: f.get('text'), category: f.get('category'), type: f.get('type'),
      price: { mode, amount: mode === 'fixed' ? Number(f.get('price_amount')) : undefined },
      link: f.get('link') || null, tags: String(f.get('tags') || ''), license: f.get('license'), made_by: f.get('made_by'),
      desk: f.get('desk') || null, images: f.getAll('images'),
    };
    if (mode === 'packages') body.packages = [0, 1, 2].map((i) => ({ name: f.get(`pk_name_${i}`), price: Number(f.get(`pk_price_${i}`)), days: Number(f.get(`pk_days_${i}`)), includes: f.get(`pk_includes_${i}`) })).filter((k) => k.name);
    const id = form.dataset.id;
    if (!id) { body.rights = f.get('rights') === 'on'; if (f.get('team')) body.team = f.get('team'); if (f.get('page')) body.page = f.get('page'); }
    msg.textContent = 'Saving…';
    try {
      const l = id ? await send(`/api/market/listings/${id}`, 'PATCH', body) : await send('/api/market/listings', 'POST', body);
      location.href = `/label/l/${l.id}`;
    } catch (err) { msg.textContent = err.message; }
  });
}

document.addEventListener('click', async (e) => {
  const w = e.target.closest('.mk-withdraw');
  if (w) {
    if (w.dataset.armed !== '1') { w.dataset.armed = '1'; w.textContent = 'Tap again to withdraw (it stays in the record)'; return; }
    try { await send(`/api/market/listings/${w.dataset.id}/withdraw`, 'POST'); location.reload(); } catch (err) { w.textContent = err.message; }
    return;
  }
  const r = e.target.closest('.mk-reply');
  if (r) {
    const f = $('.mk-askform'); if (!f) return;
    f.querySelector('[name=reply_to]').value = r.dataset.q; f.querySelector('.mk-replying').hidden = false; f.querySelector('textarea').focus();
    return;
  }
  if (e.target.closest('.mk-cancel')) { const f = $('.mk-askform'); f.querySelector('[name=reply_to]').value = ''; f.querySelector('.mk-replying').hidden = true; }
});

const askf = $('.mk-askform');
if (askf) askf.addEventListener('submit', async (e) => {
  e.preventDefault();
  const t = askf.querySelector('textarea'); const text = t.value.trim(); if (!text) return;
  try {
    const a = await send(`/api/market/listings/${askf.dataset.id}/ask`, 'POST', { text, reply_to: askf.querySelector('[name=reply_to]').value || null });
    location.hash = a.id; location.reload();
  } catch (err) { t.setCustomValidity(err.message); t.reportValidity(); setTimeout(() => t.setCustomValidity(''), 3000); }
});

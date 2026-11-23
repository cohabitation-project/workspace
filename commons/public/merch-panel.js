// merch-panel.js: put one artwork on products, the way the best print shops do it (Ash's six-point bar, Income
// m_mwtpc8631geb4a0b; Geoffrey 2026-11-23: "People want to see it before they release it").
//  - the art is placed by hand on a picture of the real product, live in the browser (Printful's templates are made
//    for client-side positioning; real mockups are limited to a few a minute, so they're made only on request)
//  - print quality updates as the art is resized
//  - the maker picks colours; every size of each comes with it
//  - the money is live: what the buyer pays per size, Printful's cost, card fee, Cohabi's cut, what the maker earns
//  - nothing reaches the listing until the maker has seen the real photo and approved it
const $ = (s, r = document) => r.querySelector(s);
const app = $('#mp-app'); const LID = app?.dataset.id;
const el = (tag, props = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v === true ? '' : v); } for (const c of kids.flat()) if (c) n.append(c); return n; };
const send = async (url, method = 'GET', body) => {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `error ${r.status}`); return j;
};
const money = (n) => `$${Number(n).toFixed(2)}`;
let D = null; let sel = null; let st = null; let poll = null; let dirty = false;

function grade(product, scale) {
  if (!D.art.width) return { text: 'Quality unknown', cls: 'unknown' };
  const dpi = Math.round(D.art.width / ((product.area.width / (product.dpi || 150)) * scale));
  const g = dpi >= 150 ? ['Excellent', 'excellent'] : dpi >= 110 ? ['Good', 'good'] : dpi >= 75 ? ['Acceptable', 'acceptable'] : ['Poor — it may print blurry; make it smaller or upload a larger file', 'poor'];
  return { text: `Print quality: ${g[0]} (${dpi} dpi at this size)`, cls: g[1] };
}
function rows(product, colors, price) {
  const f = D.fees; const vs = product.variants.filter((v) => !colors.length || colors.includes(v.color));
  if (!vs.length) return [];
  const baseMin = Math.min(...vs.map((v) => v.price)); const by = new Map();
  for (const v of vs) if (!by.has(v.size) || by.get(v.size) < v.price) by.set(v.size, v.price);
  const c = (n) => Math.round(n * 100) / 100;
  return [...by].map(([size, base]) => { const pays = c(price + (base - baseMin)); const card = c(pays * f.card_pct + f.card_fixed); const cut = c(pays * f.cohabi_pct); return { size, pays, base, card, cut, earns: c(pays - base - card - cut) }; });
}
function floorOf(product, colors) {
  const f = D.fees; const vs = product.variants.filter((v) => !colors.length || colors.includes(v.color));
  const baseMin = Math.min(...vs.map((v) => v.price)); return Math.ceil(((baseMin + f.card_fixed + 0.01) / (1 - f.card_pct - f.cohabi_pct)) * 100) / 100;
}

async function load() {
  try { D = await send(`/api/market/listings/${LID}/merch/panel`); }
  catch (e) { app.replaceChildren(el('p', { class: 'small', text: `Couldn't load products: ${e.message}` })); return; }
  if (!D.products.length) { app.replaceChildren(el('p', { class: 'small', text: "The print partner's products aren't available right now. Try again in a minute." })); return; }
  pick(sel || D.products[0].product);
}

function statusOf(p) { return !p.current ? ['Not on', 'off'] : p.current.status === 'approved' ? ['On your listing', 'live'] : ['Draft', 'draft']; }

function pick(key) {
  if (dirty && !confirm('You have changes on this product that are not saved. Leave them?')) return;
  dirty = false; sel = key; const p = D.products.find((x) => x.product === key); const cur = p.current;
  st = { colors: cur ? cur.colors.map((c) => c.name) : [p.colors[0].name], view: cur ? cur.colors[0]?.name : p.colors[0].name,
    scale: cur?.pos?.scale ?? 0.7, x: cur?.pos?.x ?? 0.5, y: cur?.pos?.y ?? 0.3, price: cur?.price ?? Math.ceil(floorOf(p, []) * 1.6) };
  render();
}

function render() {
  const p = D.products.find((x) => x.product === sel);
  const list = el('nav', { class: 'mp-list', 'aria-label': 'Products' }, D.products.map((q) => { const [t, c] = statusOf(q); return el('button', { type: 'button', class: `mp-tab${q.product === sel ? ' on' : ''}`, onclick: () => pick(q.product) }, el('span', { class: 'mp-tabname', text: q.title }), el('span', { class: `mp-chip ${c}`, text: t })); }));
  app.replaceChildren(list, editor(p));
}

function editor(p) {
  const box = el('section', { class: 'mp-editor' });
  box.append(el('h2', { text: p.title }), el('p', { class: 'small muted', text: `Print area: ${p.placement}. Drag your art, or set the size and position below.` }));
  // ---- the stage: the product picture with the print area, the art on top, draggable
  const t = p.template; const stage = el('div', { class: 'mp-stage' }); const code = p.colors.find((c) => c.name === st.view)?.code;
  const W = t ? t.width : p.area.width; const H = t ? t.height : p.area.height;
  stage.style.aspectRatio = `${W} / ${H}`; stage.style.background = t?.background_color || code || '#f3f3f3';
  if (code) stage.style.background = code;
  if (t?.background) stage.append(el('img', { class: 'mp-bg', src: t.background, alt: '' }));
  if (t?.image) stage.append(el('img', { class: 'mp-tpl', src: t.image, alt: `${p.title} outline` }));
  const area = t ? t.area : { left: 0, top: 0, width: W, height: H };
  const zone = el('div', { class: 'mp-zone', title: 'Print area' });
  Object.assign(zone.style, { left: `${(area.left / W) * 100}%`, top: `${(area.top / H) * 100}%`, width: `${(area.width / W) * 100}%`, height: `${(area.height / H) * 100}%` });
  const art = el('img', { class: 'mp-art', src: D.art.url, alt: 'Your art', draggable: 'false' }); zone.append(art); stage.append(zone);
  const aspect = D.art.width && D.art.height ? D.art.width / D.art.height : 1; const zAspect = area.width / area.height;
  const place = () => {
    let w = st.scale; let h = (w * zAspect) / aspect; if (h > 1) { h = 1; w = (aspect / zAspect); }
    Object.assign(art.style, { width: `${w * 100}%`, height: `${h * 100}%`, left: `${(1 - w) * st.x * 100}%`, top: `${(1 - h) * st.y * 100}%` });
    q.textContent = grade(p, st.scale).text; q.className = `mp-quality ${grade(p, st.scale).cls}`;
    sizeIn.value = Math.round(st.scale * 100); xIn.value = Math.round(st.x * 100); yIn.value = Math.round(st.y * 100);
    slider.value = String(Math.round(st.scale * 100));
  };
  let drag = null;
  art.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, sx: st.x, sy: st.y, r: zone.getBoundingClientRect(), a: art.getBoundingClientRect() }; art.setPointerCapture(e.pointerId); });
  art.addEventListener('pointermove', (e) => { if (!drag) return; const fw = drag.r.width - drag.a.width; const fh = drag.r.height - drag.a.height;
    st.x = fw > 0 ? Math.min(1, Math.max(0, drag.sx + (e.clientX - drag.x) / fw)) : 0.5; st.y = fh > 0 ? Math.min(1, Math.max(0, drag.sy + (e.clientY - drag.y) / fh)) : 0.5; dirty = true; place(); });
  art.addEventListener('pointerup', () => { drag = null; });
  // ---- exact controls + quality
  const num = (label, min, max, on) => { const i = el('input', { type: 'number', min, max, step: '1' }); i.addEventListener('input', () => { on(Number(i.value)); dirty = true; place(); }); return [el('label', { class: 'small' }, `${label} `, i), i]; };
  const [sizeL, sizeIn] = num('Size %', 10, 100, (v) => { st.scale = Math.min(1, Math.max(0.1, v / 100)); });
  const [xL, xIn] = num('Left↔right %', 0, 100, (v) => { st.x = Math.min(1, Math.max(0, v / 100)); });
  const [yL, yIn] = num('Up↕down %', 0, 100, (v) => { st.y = Math.min(1, Math.max(0, v / 100)); });
  const slider = el('input', { type: 'range', min: '10', max: '100', value: String(Math.round(st.scale * 100)), 'aria-label': 'Size' });
  slider.addEventListener('input', () => { st.scale = Number(slider.value) / 100; dirty = true; place(); });
  const centre = el('button', { type: 'button', class: 'btn ghost small', text: 'Centre it', onclick: () => { st.x = 0.5; dirty = true; place(); } });
  const q = el('p', { class: 'mp-quality' });
  box.append(stage, el('div', { class: 'mp-controls' }, el('label', { class: 'small' }, 'Size ', slider), sizeL, xL, yL, centre), q);
  // ---- colours
  const colorsBox = el('fieldset', { class: 'mp-colors' }, el('legend', { text: 'Colours to offer (every size of each comes with it)' }));
  for (const c of p.colors) {
    const cb = el('input', { type: 'checkbox', checked: st.colors.includes(c.name) });
    cb.addEventListener('change', () => { st.colors = p.colors.map((x) => x.name).filter((n) => (n === c.name ? cb.checked : st.colors.includes(n))); if (!st.colors.includes(st.view)) st.view = st.colors[0] || c.name; dirty = true; render(); });
    const sw = el('span', { class: 'mp-sw', title: c.name }); sw.style.background = c.code || '#ddd';
    const look = el('button', { type: 'button', class: `mp-look${st.view === c.name ? ' on' : ''}`, text: 'see', title: `See it in ${c.name}`, onclick: () => { st.view = c.name; render(); } });
    colorsBox.append(el('label', { class: 'mp-color' }, cb, sw, el('span', { text: c.name }), look));
  }
  box.append(colorsBox);
  // ---- money
  const priceIn = el('input', { type: 'number', step: '0.01', min: String(floorOf(p, st.colors)), value: String(st.price) });
  const table = el('table', { class: 'mp-money small' });
  const floorNote = el('p', { class: 'small' });
  const drawMoney = () => {
    const r = rows(p, st.colors, st.price); const fl = floorOf(p, st.colors);
    floorNote.textContent = st.price < fl ? `At this price you'd earn nothing. The lowest price that pays you is ${money(fl)}.` : '';
    floorNote.className = `small${st.price < fl ? ' mp-warn' : ''}`;
    table.replaceChildren(el('thead', {}, el('tr', {}, ...['Size', 'Buyer pays', 'Printful', 'Card fee', `Cohabi (${Math.round(D.fees.cohabi_pct * 100)}%)`, 'You earn'].map((h) => el('th', { text: h })))),
      el('tbody', {}, r.map((x) => el('tr', {}, el('td', { text: x.size }), el('td', { text: money(x.pays) }), el('td', { text: money(x.base) }), el('td', { text: money(x.card) }), el('td', { text: money(x.cut) }), el('td', { class: x.earns > 0 ? 'mp-earn' : 'mp-warn', text: money(x.earns) })))));
  };
  priceIn.addEventListener('input', () => { st.price = Number(priceIn.value) || 0; dirty = true; drawMoney(); });
  box.append(el('fieldset', { class: 'mp-price' }, el('legend', { text: 'Your price' }), el('label', {}, 'Price (smallest size) $ ', priceIn),
    el('p', { class: 'small muted', text: 'Bigger sizes cost more to print; that difference is added to the buyer\'s price, so you earn about the same on every size (the card fee rises a few cents with the price). The card fee is shown coming out of your side until Cohabi decides who carries it.' }), table, floorNote));
  drawMoney();
  // ---- the real photo, approve, remove
  const cur = p.current; const cv = cur?.colors.find((c) => c.name === st.view);
  const photoBox = el('div', { class: 'mp-photo' });
  if (dirty) photoBox.append(el('p', { class: 'small', text: 'Save your changes, then make the real photo.' }));
  else if (cv?.photo) photoBox.append(el('a', { href: cv.photo, target: '_blank', rel: 'noopener' }, el('img', { src: cv.photo, alt: `Real photo: ${p.title} in ${st.view}` })), el('p', { class: 'small', text: `The real Printful photo, ${st.view}. Check it, then approve.` }));
  else if (cv?.making) photoBox.append(el('p', { class: 'small', text: `Printful is making the ${st.view} photo… (about 30 seconds each; it appears here)` }));
  else if (cv?.error) photoBox.append(el('p', { class: 'small mp-warn', text: `The photo didn't come through: ${cv.error}. Try again.` }));
  const msg = el('p', { class: 'small', role: 'status' });
  const saveDraft = async () => { msg.textContent = 'Saving…'; const r = await send(`/api/market/listings/${LID}/merch/${sel}`, 'PUT', { colors: st.colors, scale: st.scale, x: st.x, y: st.y, price: st.price }); p.current = r; dirty = false; return r; };
  const act = (label, fn, opts = {}) => el('button', { type: 'button', class: `btn${opts.ghost ? ' ghost' : ''}`, disabled: opts.disabled, text: label, onclick: async () => { try { await fn(); } catch (e) { msg.textContent = e.message; } } });
  const approved = cur?.status === 'approved' && !dirty;
  box.append(el('section', { class: 'mp-actions' },
    act('Save draft', async () => { await saveDraft(); msg.textContent = 'Saved as a draft. It is not on your listing yet.'; render(); }, { ghost: true }),
    act(`Make the real photo (${st.view})`, async () => { if (dirty || !cur) await saveDraft(); await send(`/api/market/listings/${LID}/merch/${sel}/photo`, 'POST', { color: st.view }); await refresh(); render(); }),
    act(approved ? 'On your listing ✓' : 'Approve — put it on my listing', async () => { if (dirty) { msg.textContent = 'Save and make the real photo first.'; return; } p.current = await send(`/api/market/listings/${LID}/merch/${sel}/approve`, 'POST'); msg.textContent = 'It is on your listing. Photos for your other colours are being made.'; render(); }, { disabled: approved || dirty || !cur?.ready_to_approve }),
    cur ? act('Remove from listing', async () => { if (!confirm(`Take ${p.title} off this art?`)) return; await send(`/api/market/listings/${LID}/merch/${sel}`, 'DELETE'); p.current = null; render(); }, { ghost: true }) : null),
  photoBox, msg);
  place();
  return box;
}

async function refresh() {
  const v = await send(`/api/market/listings/${LID}/merch?mine=1`);
  for (const p of D.products) p.current = v.items.find((i) => i.product === p.product) || null;
}
function startPoll() {
  clearInterval(poll);
  poll = setInterval(async () => {
    const making = D?.products.some((p) => p.current?.colors.some((c) => c.making));
    if (!making || dirty) return;
    try { await refresh(); render(); } catch { /* try again next time */ }
  }, 5000);
}
if (app && LID) { load().then(startPoll); window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }); }

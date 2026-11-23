// merch-panel.js: put one artwork on products, the way the best print shops do it (Ash's six-point bar, Income
// m_mwtpc8631geb4a0b; Geoffrey 2026-11-23: "People want to see it before they release it").
//  - the art is placed by hand, live in the browser: on Printful's product template for colour products (shirts, mugs),
//    on the exact shape of the chosen size for wall art (canvas, posters: every size is its own shape)
//  - the art can turn 90° at a time: wide art on a tall canvas hangs sideways (Printful's canvases and posters are all
//    square or taller than wide)
//  - colour products: the maker picks colours (every size each). Wall art: the maker picks sizes.
//  - print quality and the money update live; nothing reaches the listing until the real photo is seen and approved
const $ = (s, r = document) => r.querySelector(s);
const app = $('#mp-app'); const LID = app?.dataset.id;
const el = (tag, props = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v === true ? '' : v); } for (const c of kids.flat()) if (c) n.append(c); return n; };
const send = async (url, method = 'GET', body) => {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `error ${r.status}`); return j;
};
const money = (n) => `$${Number(n).toFixed(2)}`;
let D = null; let sel = null; let st = null; let poll = null; let dirty = false;

const isColors = (p) => p.kind === 'colors';
const chosenVariants = (p) => p.variants.filter((v) => (isColors(p) ? st.opts.includes(v.color) : st.opts.includes(v.size)));
function previewArea(p) { if (isColors(p)) return { area: p.area, dpi: p.dpi }; const z = p.sizes.find((x) => x.name === st.view) || p.sizes[0]; return { area: z.area, dpi: z.dpi }; }
function grade(p) {
  if (!D.art.width) return { text: 'Print quality: unknown', cls: 'unknown' };
  const { area, dpi } = previewArea(p); const across = st.rot % 180 ? D.art.height : D.art.width;
  // the width the art actually prints at: the size slider, unless the art hits the print's height first
  let aspect = D.art.width / D.art.height; if (st.rot % 180) aspect = 1 / aspect; const zA = area.width / area.height;
  const fitted = (st.scale * zA) / aspect > 1 ? aspect / zA : st.scale;
  const eff = Math.round(across / ((area.width / (dpi || 150)) * fitted));
  const g = eff >= 150 ? ['Excellent', 'excellent'] : eff >= 110 ? ['Good', 'good'] : eff >= 75 ? ['Acceptable', 'acceptable'] : ['Poor — it may print blurry; make it smaller or upload a larger file', 'poor'];
  return { text: `Print quality: ${g[0]} (${eff} dpi at this size${isColors(p) ? '' : `, ${st.view}`})`, cls: g[1] };
}
function rows(p, price) {
  const f = D.fees; const vs = chosenVariants(p); if (!vs.length) return [];
  const baseMin = Math.min(...vs.map((v) => v.price)); const by = new Map();
  for (const v of vs) if (!by.has(v.size) || by.get(v.size) < v.price) by.set(v.size, v.price);
  const c = (n) => Math.round(n * 100) / 100;
  return [...by].map(([size, base]) => { const pays = c(price + (base - baseMin)); const card = c(pays * f.card_pct + f.card_fixed); const cut = c(pays * f.cohabi_pct); return { size, pays, base, card, cut, earns: c(pays - base - card - cut) }; });
}
function floorOf(p) {
  const f = D.fees; const vs = chosenVariants(p).length ? chosenVariants(p) : p.variants;
  const baseMin = Math.min(...vs.map((v) => v.price)); return Math.ceil(((baseMin + f.card_fixed + 0.01) / (1 - f.card_pct - f.cohabi_pct)) * 100) / 100;
}

async function load() {
  try { D = await send(`/api/market/listings/${LID}/merch/panel`); }
  catch (e) { app.replaceChildren(el('p', { class: 'small', text: `Couldn't load products: ${e.message}` })); return; }
  if (!D.products.length) { app.replaceChildren(el('p', { class: 'small', text: "The print partner's products aren't available right now. Try again in a minute." })); return; }
  pick(sel || D.products[0].product);
}
const statusOf = (p) => (!p.current ? ['Not on', 'off'] : p.current.status === 'approved' ? ['On your listing', 'live'] : ['Draft', 'draft']);

function pick(key) {
  if (dirty && !confirm('You have changes on this product that are not saved. Leave them?')) return;
  dirty = false; sel = key; const p = D.products.find((x) => x.product === key); const cur = p.current;
  const wide = D.art.width > D.art.height;
  // Wall art starts on a common size; wide art on wall art starts turned, so it fills the tall print.
  const firstSize = p.sizes.find((z) => /^16″×20″$/.test(z.name))?.name || p.sizes.find((z) => /^12″×16″$/.test(z.name))?.name || p.sizes[0]?.name;
  const opts = cur ? (isColors(p) ? cur.colors : cur.chosen_sizes) : (isColors(p) ? [p.colors[0].name] : [firstSize]);
  st = { opts: [...opts], view: opts[0], rot: cur?.pos?.rot ?? (!isColors(p) && wide ? 90 : 0),
    scale: cur?.pos?.scale ?? (isColors(p) ? 0.7 : 1), x: cur?.pos?.x ?? 0.5, y: cur?.pos?.y ?? (isColors(p) ? 0.3 : 0.5), price: cur?.price ?? 0 };
  if (!cur) st.price = Math.ceil(floorOf(p) * 1.6);
  render();
}
function render() {
  const p = D.products.find((x) => x.product === sel);
  const list = el('nav', { class: 'mp-list', 'aria-label': 'Products' }, D.products.map((q) => { const [t, c] = statusOf(q); return el('button', { type: 'button', class: `mp-tab${q.product === sel ? ' on' : ''}`, onclick: () => pick(q.product) }, el('span', { class: 'mp-tabname', text: q.title }), el('span', { class: `mp-chip ${c}`, text: t })); }));
  app.replaceChildren(list, editor(p));
}

function editor(p) {
  const box = el('section', { class: 'mp-editor' });
  box.append(el('h2', { text: p.title }), el('p', { class: 'small muted', text: isColors(p) ? `Print area: ${p.placement}. Drag your art, or set the size and position below.` : `Showing the ${st.view} print. Every size is its own shape: tick the sizes you sell below, and press "see" to check your art on each.` }));
  // ---- the stage
  const { area: pa } = previewArea(p); const t = isColors(p) ? p.template : null;
  const W = t ? t.width : pa.width; const H = t ? t.height : pa.height;
  const stage = el('div', { class: `mp-stage${isColors(p) ? '' : ' mp-wall'}` }); stage.style.aspectRatio = `${W} / ${H}`;
  const code = isColors(p) ? p.colors.find((c) => c.name === st.view)?.code : null;
  stage.style.background = code || t?.background_color || '#ffffff';
  if (t?.background) stage.append(el('img', { class: 'mp-bg', src: t.background, alt: '' }));
  if (t?.image) stage.append(el('img', { class: 'mp-tpl', src: t.image, alt: `${p.title} outline` }));
  const area = t ? t.area : { left: 0, top: 0, width: W, height: H };
  const zone = el('div', { class: 'mp-zone', title: 'Print area' });
  Object.assign(zone.style, { left: `${(area.left / W) * 100}%`, top: `${(area.top / H) * 100}%`, width: `${(area.width / W) * 100}%`, height: `${(area.height / H) * 100}%` });
  const art = el('div', { class: 'mp-art' }); const img = el('img', { src: D.art.url, alt: 'Your art', draggable: 'false' }); art.append(img); zone.append(art); stage.append(zone);
  const zAspect = area.width / area.height; const hint = el('p', { class: 'small mp-hint' });
  const place = () => {
    let aspect = D.art.width && D.art.height ? D.art.width / D.art.height : 1; if (st.rot % 180) aspect = 1 / aspect;
    let w = st.scale; let h = (w * zAspect) / aspect; if (h > 1) { h = 1; w = aspect / zAspect; }
    Object.assign(art.style, { width: `${w * 100}%`, height: `${h * 100}%`, left: `${(1 - w) * st.x * 100}%`, top: `${(1 - h) * st.y * 100}%` });
    // The picture turns inside its box. Turned 90/270, its unturned box has the sides swapped: width = box height.
    const r = h / (w * zAspect); // box height / box width, in pixels
    Object.assign(img.style, st.rot % 180 ? { width: `${r * 100}%`, height: `${(1 / r) * 100}%` } : { width: '100%', height: '100%' }, { transform: `translate(-50%, -50%) rotate(${st.rot}deg)` });
    const gq = grade(p); q.textContent = gq.text; q.className = `mp-quality ${gq.cls}`;
    sizeIn.value = Math.round(st.scale * 100); xIn.value = Math.round(st.x * 100); yIn.value = Math.round(st.y * 100); slider.value = String(Math.round(st.scale * 100));
    const artWide = st.rot % 180 ? D.art.height > D.art.width : D.art.width > D.art.height; const tall = pa.height > pa.width * 1.05;
    hint.textContent = !isColors(p) && artWide && tall ? 'Your art is wider than this print. Turn it 90° to fill it: the print then hangs sideways, landscape.' : !isColors(p) && st.rot % 180 ? 'Turned 90°: this print hangs sideways (landscape) on the wall.' : '';
  };
  let drag = null;
  art.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, sx: st.x, sy: st.y, r: zone.getBoundingClientRect(), a: art.getBoundingClientRect() }; art.setPointerCapture(e.pointerId); });
  art.addEventListener('pointermove', (e) => { if (!drag) return; const fw = drag.r.width - drag.a.width; const fh = drag.r.height - drag.a.height;
    st.x = fw > 1 ? Math.min(1, Math.max(0, drag.sx + (e.clientX - drag.x) / fw)) : 0.5; st.y = fh > 1 ? Math.min(1, Math.max(0, drag.sy + (e.clientY - drag.y) / fh)) : 0.5; dirty = true; place(); });
  art.addEventListener('pointerup', () => { drag = null; });
  // ---- controls
  const num = (label, min, max, on) => { const i = el('input', { type: 'number', min, max, step: '1' }); i.addEventListener('input', () => { on(Number(i.value)); dirty = true; place(); }); return [el('label', { class: 'small' }, `${label} `, i), i]; };
  const [sizeL, sizeIn] = num('Size %', 10, 100, (v) => { st.scale = Math.min(1, Math.max(0.1, v / 100)); });
  const [xL, xIn] = num('Left↔right %', 0, 100, (v) => { st.x = Math.min(1, Math.max(0, v / 100)); });
  const [yL, yIn] = num('Up↕down %', 0, 100, (v) => { st.y = Math.min(1, Math.max(0, v / 100)); });
  const slider = el('input', { type: 'range', min: '10', max: '100', 'aria-label': 'Size' });
  slider.addEventListener('input', () => { st.scale = Number(slider.value) / 100; dirty = true; place(); });
  const btn = (text, fn) => el('button', { type: 'button', class: 'btn ghost small', text, onclick: () => { fn(); dirty = true; place(); } });
  const q = el('p', { class: 'mp-quality' });
  box.append(stage, hint, el('div', { class: 'mp-controls' }, el('label', { class: 'small' }, 'Size ', slider), sizeL, xL, yL,
    btn('Centre it', () => { st.x = 0.5; if (!isColors(p)) st.y = 0.5; }), btn('↻ Turn 90°', () => { st.rot = (st.rot + 90) % 360; }),
    !isColors(p) ? btn('Fill the print', () => { st.scale = 1; st.x = 0.5; st.y = 0.5; }) : null), q);
  // ---- colours, or sizes
  const opts = el('fieldset', { class: 'mp-colors' });
  if (isColors(p)) {
    opts.append(el('legend', { text: 'Colours to offer — each colour comes in every size' }));
    for (const c of p.colors) {
      const cb = el('input', { type: 'checkbox', checked: st.opts.includes(c.name) });
      cb.addEventListener('change', () => { st.opts = p.colors.map((x) => x.name).filter((n) => (n === c.name ? cb.checked : st.opts.includes(n))); if (!st.opts.includes(st.view)) st.view = st.opts[0] || c.name; dirty = true; render(); });
      const sw = el('span', { class: 'mp-sw', title: c.name }); sw.style.background = c.code || '#ddd';
      opts.append(el('label', { class: 'mp-color' }, cb, sw, el('span', { text: c.name }), el('button', { type: 'button', class: `mp-look${st.view === c.name ? ' on' : ''}`, text: 'see', title: `See it in ${c.name}`, onclick: () => { st.view = c.name; render(); } })));
    }
  } else {
    opts.append(el('legend', { text: 'Sizes to offer — tick the ones you sell; "see" shows your art on that size' }));
    for (const z of p.sizes) {
      const cb = el('input', { type: 'checkbox', checked: st.opts.includes(z.name) });
      cb.addEventListener('change', () => { st.opts = p.sizes.map((x) => x.name).filter((n) => (n === z.name ? cb.checked : st.opts.includes(n))); if (!st.opts.includes(st.view)) st.view = st.opts[0] || z.name; dirty = true; render(); });
      opts.append(el('label', { class: 'mp-color mp-size' }, cb, el('span', { text: z.name }), el('span', { class: 'muted small', text: `cost ${money(z.price)}` }), el('button', { type: 'button', class: `mp-look${st.view === z.name ? ' on' : ''}`, text: 'see', title: `See it on ${z.name}`, onclick: () => { st.view = z.name; render(); } })));
    }
  }
  box.append(opts);
  // ---- money
  const priceIn = el('input', { type: 'number', step: '0.01', value: String(st.price) });
  const table = el('table', { class: 'mp-money small' }); const floorNote = el('p', { class: 'small' });
  const drawMoney = () => {
    const r = rows(p, st.price); const fl = floorOf(p); priceIn.min = String(fl);
    floorNote.textContent = st.price < fl ? `At this price you'd earn nothing. The lowest price that pays you is ${money(fl)}.` : ''; floorNote.className = `small${st.price < fl ? ' mp-warn' : ''}`;
    table.replaceChildren(el('thead', {}, el('tr', {}, ...['Size', 'Buyer pays', 'Printful', 'Card fee', `Cohabi (${Math.round(D.fees.cohabi_pct * 100)}%)`, 'You earn'].map((h) => el('th', { text: h })))),
      el('tbody', {}, r.map((x) => el('tr', {}, el('td', { text: x.size }), el('td', { text: money(x.pays) }), el('td', { text: money(x.base) }), el('td', { text: money(x.card) }), el('td', { text: money(x.cut) }), el('td', { class: x.earns > 0 ? 'mp-earn' : 'mp-warn', text: money(x.earns) })))));
  };
  priceIn.addEventListener('input', () => { st.price = Number(priceIn.value) || 0; dirty = true; drawMoney(); });
  box.append(el('fieldset', { class: 'mp-price' }, el('legend', { text: 'Your price' }), el('label', {}, `Price (${isColors(p) ? 'smallest size' : 'smallest size you offer'}) $ `, priceIn),
    el('p', { class: 'small muted', text: 'Bigger sizes cost more to print; that difference is added to the buyer\'s price, so you earn about the same on every size (the card fee rises a few cents with the price). The card fee is shown coming out of your side until Cohabi decides who carries it.' }), table, floorNote));
  drawMoney();
  // ---- the real photo, approve, remove
  const cur = p.current; const cv = cur?.options.find((o) => o.name === st.view);
  const photoBox = el('div', { class: 'mp-photo' });
  if (dirty) photoBox.append(el('p', { class: 'small', text: 'Save your changes, then make the real photo.' }));
  else if (cv?.photo) photoBox.append(el('a', { href: cv.photo, target: '_blank', rel: 'noopener' }, el('img', { src: cv.photo, alt: `Real photo: ${p.title}, ${st.view}` })), el('p', { class: 'small', text: `The real Printful photo, ${st.view}. Check it, then approve.` }));
  else if (cv?.making) photoBox.append(el('p', { class: 'small', text: `Printful is making the ${st.view} photo… (about 30 seconds each; it appears here)` }));
  else if (cv?.error) photoBox.append(el('p', { class: 'small mp-warn', text: `The photo didn't come through: ${cv.error}. Try again.` }));
  const msg = el('p', { class: 'small', role: 'status' });
  const saveDraft = async () => { msg.textContent = 'Saving…'; const r = await send(`/api/market/listings/${LID}/merch/${sel}`, 'PUT', { colors: isColors(p) ? st.opts : [], sizes: isColors(p) ? [] : st.opts, scale: st.scale, x: st.x, y: st.y, rot: st.rot, price: st.price }); p.current = r; dirty = false; return r; };
  const act = (label, fn, o = {}) => el('button', { type: 'button', class: `btn${o.ghost ? ' ghost' : ''}`, disabled: o.disabled, text: label, onclick: async () => { try { await fn(); } catch (e) { msg.textContent = e.message; } } });
  const approved = cur?.status === 'approved' && !dirty;
  box.append(el('section', { class: 'mp-actions' },
    act('Save draft', async () => { await saveDraft(); msg.textContent = 'Saved as a draft. It is not on your listing yet.'; render(); }, { ghost: true }),
    act(`Make the real photo (${st.view})`, async () => { if (dirty || !cur) await saveDraft(); await send(`/api/market/listings/${LID}/merch/${sel}/photo`, 'POST', { option: st.view }); await refresh(); render(); }),
    act(approved ? 'On your listing ✓' : 'Approve — put it on my listing', async () => { if (dirty) { msg.textContent = 'Save and make the real photo first.'; return; } p.current = await send(`/api/market/listings/${LID}/merch/${sel}/approve`, 'POST'); msg.textContent = `It is on your listing. Photos for your other ${isColors(p) ? 'colours' : 'sizes'} are being made.`; render(); }, { disabled: approved || dirty || !cur?.ready_to_approve }),
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
    if (dirty || !D?.products.some((p) => p.current?.options.some((o) => o.making))) return;
    try { await refresh(); render(); } catch { /* try again next time */ }
  }, 5000);
}
if (app && LID) { load().then(startPoll); window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }); }

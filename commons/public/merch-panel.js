// merch-panel.js: the Product Customizer. One artwork on many products, the way the best print shops do it.
// Layout follows Aletheia-6's design approved by Geoffrey (2026-11-23, Commons image img_d46ab826dd561cf3): art header,
// product rail, a big live stage, an "Art placement" card, colour swatches (or size chips for wall art), and on the
// right "Pricing & earnings" first, the size breakdown, one dominant "Approve and publish", and the sample photo.
// Behaviour (Ash's six-point bar, Income m_mwtpc8631geb4a0b): nothing reaches buyers until the real Printful photo has
// been seen and approved; the art is placed by hand; print quality and the money update live; turning the art on wall
// art shows the print turned too, as it hangs (Geoffrey: "the canvas should rotate too").
// Not shown until real: all-over print, Front/Back/Both, collaborator pills (see Builders m_mwtqpyfd08640ec3).
const $ = (s, r = document) => r.querySelector(s);
const app = $('#mp-app'); const LID = app?.dataset.id;
const el = (tag, props = {}, ...kids) => { const n = document.createElement(tag); for (const [k, v] of Object.entries(props)) { if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v; else if (k.startsWith('on')) n.addEventListener(k.slice(2), v); else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v === true ? '' : v); } for (const c of kids.flat()) if (c) n.append(c); return n; };
const send = async (url, method = 'GET', body) => {
  const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-Commons': '1' }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || `error ${r.status}`); return j;
};
const money = (n) => `$${Number(n).toFixed(2)}`;
let D = null; let sel = null; let st = null; let poll = null; let dirty = false; let note = '';

// ------------------------------------------------------------------ the same rules the server enforces
const isColors = (p) => p.kind === 'colors';
const chosenVariants = (p) => p.variants.filter((v) => (isColors(p) ? st.opts.includes(v.color) : st.opts.includes(v.size)));
function previewArea(p) { if (isColors(p)) return { area: p.area, dpi: p.dpi }; const z = p.sizes.find((x) => x.name === st.view) || p.sizes[0]; return { area: z.area, dpi: z.dpi }; }
function fitted(p) { // the share of the print width the art really covers (the size slider, unless the art hits the height first)
  const { area } = previewArea(p); let a = D.art.width && D.art.height ? D.art.width / D.art.height : 1; if (st.rot % 180) a = 1 / a;
  const zA = area.width / area.height; return (st.scale * zA) / a > 1 ? a / zA : st.scale;
}
function grade(p) {
  if (!D.art.width) return { text: 'Print quality: unknown', cls: 'unknown' };
  const { area, dpi } = previewArea(p); const across = st.rot % 180 ? D.art.height : D.art.width;
  const eff = Math.round(across / ((area.width / (dpi || 150)) * fitted(p)));
  const g = eff >= 150 ? ['Excellent', 'excellent'] : eff >= 110 ? ['Good', 'good'] : eff >= 75 ? ['Acceptable', 'acceptable'] : ['Poor — may print blurry. Make it smaller or upload a larger file', 'poor'];
  return { text: `Print quality: ${g[0]} · ${eff} dpi`, cls: g[1] };
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
const statusOf = (p) => (!p.current ? ['Not on', 'off'] : p.current.status === 'approved' ? ['On your listing', 'live'] : ['Draft', 'draft']);
const thumbOf = (p) => p.current?.main || p.current?.options?.find((o) => o.photo)?.photo || p.image || null;

// ------------------------------------------------------------------ load, pick, render
async function load() {
  try { D = await send(`/api/market/listings/${LID}/merch/panel`); }
  catch (e) { app.replaceChildren(el('p', { class: 'small', text: `Couldn't load products: ${e.message}` })); return; }
  if (!D.products.length) { app.replaceChildren(el('p', { class: 'small', text: "The print partner's products aren't available right now. Try again in a minute." })); return; }
  pick(sel || D.products[0].product, true);
}
function pick(key, force) {
  if (!force && dirty && !confirm('You have changes on this product that are not saved. Leave them?')) return;
  dirty = false; note = ''; sel = key; const p = D.products.find((x) => x.product === key); const cur = p.current;
  const wide = D.art.width > D.art.height;
  const firstSize = p.sizes.find((z) => z.name === '16″×20″')?.name || p.sizes.find((z) => z.name === '12″×16″')?.name || p.sizes[0]?.name;
  const firstColor = p.colors.find((c) => /^black$/i.test(c.name))?.name || p.colors.find((c) => /^white$/i.test(c.name))?.name || p.colors[0]?.name;
  const opts = cur ? (isColors(p) ? cur.colors : cur.chosen_sizes) : (isColors(p) ? [firstColor] : [firstSize]);
  st = { opts: [...opts], view: opts[0], rot: cur?.pos?.rot ?? (!isColors(p) && wide ? 90 : 0),
    scale: cur?.pos?.scale ?? (isColors(p) ? 0.7 : 1), x: cur?.pos?.x ?? 0.5, y: cur?.pos?.y ?? (isColors(p) ? 0.3 : 0.5), price: cur?.price ?? 0 };
  if (!cur) st.price = Math.ceil(floorOf(p) * 1.6);
  render();
}
function render() {
  const p = D.products.find((x) => x.product === sel);
  const live = D.products.filter((q) => q.current?.status === 'approved').length;
  const header = el('header', { class: 'cz-head' },
    el('img', { class: 'cz-art', src: D.art.url, alt: `Your art: ${D.title}` }),
    el('div', {}, el('h2', { class: 'cz-title', text: D.page || D.title }),
      el('p', { class: 'cz-sub', text: `${D.page ? `“${D.title}” · ` : ''}by ${D.maker} · ${live} product${live === 1 ? '' : 's'} on your listing · customise, price and publish` })));
  const rail = el('nav', { class: 'cz-rail', 'aria-label': `Products (${D.products.length})` }, el('h3', { text: `Products (${D.products.length})` }),
    D.products.map((q) => { const [t, c] = statusOf(q); const th = thumbOf(q);
      return el('button', { type: 'button', class: `cz-prod${q.product === sel ? ' on' : ''}`, 'aria-current': q.product === sel ? 'true' : null, onclick: () => pick(q.product) },
        th ? el('img', { src: th, alt: '', loading: 'lazy' }) : el('span', { class: 'cz-ph', 'aria-hidden': 'true', text: '◆' }),
        el('span', { class: 'cz-pname' }, el('b', { text: q.title }), el('span', { class: `cz-chip ${c}`, text: t }))); }));
  app.replaceChildren(header, rail, ...editor(p));
}

// ------------------------------------------------------------------ the editor: stage + placement + options | pricing
function editor(p) {
  const centre = el('section', { class: 'cz-centre', 'aria-label': 'Design' });
  const side = el('aside', { class: 'cz-side', 'aria-label': 'Pricing and publishing' });
  // ---- stage. Wall art turned 90/270 is shown turned too, as it hangs (landscape, art upright).
  const { area: pa } = previewArea(p); const t = isColors(p) ? p.template : null;
  const W = t ? t.width : pa.width; const H = t ? t.height : pa.height;
  const hung = !isColors(p) && st.rot % 180 !== 0;
  const stage = el('div', { class: `cz-stage${isColors(p) ? '' : ' wall'}` }); stage.style.aspectRatio = `${W} / ${H}`;
  const code = isColors(p) ? p.colors.find((c) => c.name === st.view)?.code : null;
  stage.style.background = code || t?.background_color || '#fffdf8';
  if (t?.background) stage.append(el('img', { class: 'cz-bg', src: t.background, alt: '' }));
  if (t?.image) stage.append(el('img', { class: 'cz-tpl', src: t.image, alt: `${p.title} outline` }));
  const area = t ? t.area : { left: 0, top: 0, width: W, height: H };
  const zone = el('div', { class: 'cz-zone', title: 'Print area' });
  Object.assign(zone.style, { left: `${(area.left / W) * 100}%`, top: `${(area.top / H) * 100}%`, width: `${(area.width / W) * 100}%`, height: `${(area.height / H) * 100}%` });
  const art = el('div', { class: 'cz-artbox', role: 'img', 'aria-label': 'Your art. Drag to move it.' }); const img = el('img', { src: D.art.url, alt: '', draggable: 'false' }); art.append(img); zone.append(art); stage.append(zone);
  let stageWrap = stage;
  if (hung) { // the print turned back so it reads as it hangs: the wrapper is landscape, the print inside turns -rot
    stageWrap = el('div', { class: 'cz-hang' }); stageWrap.style.aspectRatio = `${H} / ${W}`;
    Object.assign(stage.style, { position: 'absolute', left: '50%', top: '50%', width: `${(W / H) * 100}%`, transform: `translate(-50%, -50%) rotate(${-st.rot}deg)` });
    stageWrap.append(stage);
  }
  const zAspect = area.width / area.height;
  const q = el('p', { class: 'cz-quality' }); const hint = el('p', { class: 'cz-hint' });
  const sliders = {};
  const place = () => {
    let aspect = D.art.width && D.art.height ? D.art.width / D.art.height : 1; if (st.rot % 180) aspect = 1 / aspect;
    let w = st.scale; let h = (w * zAspect) / aspect; if (h > 1) { h = 1; w = aspect / zAspect; }
    Object.assign(art.style, { width: `${w * 100}%`, height: `${h * 100}%`, left: `${(1 - w) * st.x * 100}%`, top: `${(1 - h) * st.y * 100}%` });
    const r = h / (w * zAspect); // art box height / width, in pixels; turned 90/270 the picture's own box swaps sides
    Object.assign(img.style, st.rot % 180 ? { width: `${r * 100}%`, height: `${(1 / r) * 100}%` } : { width: '100%', height: '100%' }, { transform: `translate(-50%, -50%) rotate(${st.rot}deg)` });
    const gq = grade(p); q.textContent = gq.text; q.className = `cz-quality ${gq.cls}`;
    for (const [k, s] of Object.entries(sliders)) s.forEach((i) => { i.value = String(Math.round(st[k] * 100)); });
    const artWide = st.rot % 180 ? D.art.height > D.art.width : D.art.width > D.art.height; const tall = pa.height > pa.width * 1.05;
    hint.textContent = !isColors(p) && artWide && tall ? 'Your art is wider than this print. Turn it 90° to fill it: the print then hangs sideways, as a landscape.' : hung ? `Shown as it hangs: turned ${st.rot}°, landscape.` : '';
  };
  // drag: on a turned stage, the screen movement is turned back into the print's own directions
  let drag = null;
  art.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, sx: st.x, sy: st.y, fw: zone.offsetWidth - art.offsetWidth, fh: zone.offsetHeight - art.offsetHeight }; art.setPointerCapture(e.pointerId); });
  art.addEventListener('pointermove', (e) => {
    if (!drag) return; let dx = e.clientX - drag.x; let dy = e.clientY - drag.y;
    if (hung) { const a = (st.rot * Math.PI) / 180; [dx, dy] = [dx * Math.cos(a) - dy * Math.sin(a), dx * Math.sin(a) + dy * Math.cos(a)]; }
    st.x = drag.fw > 1 ? Math.min(1, Math.max(0, drag.sx + dx / drag.fw)) : 0.5; st.y = drag.fh > 1 ? Math.min(1, Math.max(0, drag.sy + dy / drag.fh)) : 0.5; dirty = true; place(); });
  art.addEventListener('pointerup', () => { drag = null; });
  centre.append(el('div', { class: 'cz-stagewrap' }, stageWrap, el('p', { class: 'cz-cap', text: isColors(p) ? `${p.title} · ${st.view} · ${p.placement}` : `${p.title} · ${st.view}${hung ? ' · hangs landscape' : ''}` })), hint);
  // ---- art placement card
  const slider = (label, key, min = 0, max = 100) => { const r = el('input', { type: 'range', min: String(min), max: String(max), 'aria-label': label }); const n = el('input', { type: 'number', min: String(min), max: String(max), 'aria-label': `${label} exact` });
    const on = (v) => { st[key] = Math.min(max, Math.max(min, Number(v))) / 100; dirty = true; place(); }; r.addEventListener('input', () => on(r.value)); n.addEventListener('input', () => on(n.value));
    sliders[key] = [r, n]; return el('div', { class: 'cz-slider' }, el('span', { text: label }), r, el('span', { class: 'cz-num' }, n, '%')); };
  const small = (text, fn) => el('button', { type: 'button', class: 'cz-btn ghost', text, onclick: () => { fn(); dirty = true; place(); if (text.startsWith('↻')) render(); } });
  centre.append(el('div', { class: 'cz-card' }, el('h3', { text: 'Art placement' }), el('p', { class: 'cz-muted', text: 'Drag the art to move it, or use the sliders.' }),
    slider('Size', 'scale', 10, 100), slider('Left ↔ right', 'x'), slider('Up ↕ down', 'y'),
    el('div', { class: 'cz-row' }, small('Centre artwork', () => { st.x = 0.5; if (!isColors(p)) st.y = 0.5; }), small('↻ Turn 90°', () => { st.rot = (st.rot + 90) % 360; }),
      !isColors(p) ? small('Fill the print', () => { st.scale = 1; st.x = 0.5; st.y = 0.5; }) : null), q));
  // ---- colours (shirts, mugs) or sizes (wall art): pick what to PREVIEW, and separately whether you SELL it
  const sells = st.opts.includes(st.view); const word = isColors(p) ? 'colour' : 'size';
  const optCard = el('div', { class: 'cz-card' }, el('h3', { text: isColors(p) ? `Product colour (${p.title})` : 'Print sizes' }),
    el('p', { class: 'cz-muted', text: isColors(p) ? 'Tap a colour to preview it. Each colour you sell comes in every size.' : 'Tap a size to preview your art on its shape. Every size is its own shape.' }));
  const grid = el('div', { class: isColors(p) ? 'cz-swatches' : 'cz-chips', role: 'group', 'aria-label': isColors(p) ? 'Colours' : 'Sizes' });
  for (const o of isColors(p) ? p.colors : p.sizes) {
    const sold = st.opts.includes(o.name);
    const b = el('button', { type: 'button', class: `${isColors(p) ? 'cz-sw' : 'cz-sz'}${o.name === st.view ? ' on' : ''}${sold ? ' sold' : ''}`, title: `${o.name}${sold ? ' (you sell this)' : ''}`, 'aria-pressed': o.name === st.view ? 'true' : 'false', onclick: () => { st.view = o.name; render(); } },
      isColors(p) ? null : el('span', { text: o.name }), sold ? el('span', { class: 'cz-tick', 'aria-hidden': 'true', text: '✓' }) : null);
    if (isColors(p)) { b.style.setProperty('--sw', o.code || '#ccc'); b.setAttribute('aria-label', o.name); }
    grid.append(b);
  }
  optCard.append(grid, el('div', { class: 'cz-row' }, el('span', { class: 'cz-muted', text: `Previewing ${st.view}${isColors(p) ? '' : ` · Printful cost ${money(p.sizes.find((z) => z.name === st.view)?.price || 0)}`}` }),
    el('button', { type: 'button', class: `cz-btn${sells ? ' ghost' : ''}`, text: sells ? `✓ Selling this ${word} — stop selling` : `+ Sell this ${word}`, onclick: () => {
      st.opts = sells ? st.opts.filter((n) => n !== st.view) : [...(isColors(p) ? p.colors : p.sizes).map((x) => x.name).filter((n) => n === st.view || st.opts.includes(n))]; dirty = true; render(); } })),
  el('p', { class: 'cz-muted', text: st.opts.length ? `You sell: ${st.opts.join(', ')}` : `Pick at least one ${word} to sell.` }));
  centre.append(optCard);
  // ---- pricing & earnings (summary first)
  const r = rows(p, st.price); const fl = floorOf(p); const first = r[0];
  const priceIn = el('input', { type: 'number', step: '0.01', min: String(fl), value: String(st.price), 'aria-label': 'Your price' });
  priceIn.addEventListener('change', () => { st.price = Number(priceIn.value) || 0; dirty = true; render(); });
  side.append(el('div', { class: 'cz-pay' },
    el('div', { class: 'cz-payhead' }, el('h3', { text: 'Pricing & earnings' }), el('label', { class: 'cz-price' }, 'Your price ', priceIn)),
    el('div', { class: 'cz-big' }, el('div', {}, el('span', { text: 'Buyer pays' }), el('b', { text: first ? money(first.pays) : '—' })),
      el('div', {}, el('span', { text: 'Printful cost' }), el('b', { text: first ? money(first.base) : '—' })),
      el('div', { class: 'earn' }, el('span', { text: 'You earn' }), el('b', { text: first ? money(first.earns) : '—' }))),
    st.price < fl ? el('p', { class: 'cz-warn', text: `At this price you'd earn nothing. The lowest price that pays you is ${money(fl)}.` }) : null,
    el('details', { class: 'cz-breakdown', open: true }, el('summary', { text: `Size breakdown (${p.title})` }),
      el('table', {}, el('thead', {}, el('tr', {}, ...['Size', 'Buyer pays', 'Printful', 'Card fee', `Cohabi ${Math.round(D.fees.cohabi_pct * 100)}%`, 'You earn'].map((h) => el('th', { text: h })))),
        el('tbody', {}, r.map((x) => el('tr', {}, el('td', { text: x.size }), el('td', { text: money(x.pays) }), el('td', { text: money(x.base) }), el('td', { text: money(x.card) }), el('td', { text: money(x.cut) }), el('td', { class: x.earns > 0 ? 'earn' : 'cz-warn', text: money(x.earns) }))))),
      el('p', { class: 'cz-muted', text: 'Bigger sizes cost more to print; that difference is added to the buyer\'s price, so you earn about the same on every size. The card fee (2.9% + 30¢) is shown on your side until Cohabi decides who carries it.' }))));
  // ---- actions: one dominant Approve; Save and Make photo secondary; Remove tucked under
  const cur = p.current; const cv = cur?.options.find((o) => o.name === st.view);
  const msg = el('p', { class: 'cz-msg', role: 'status', text: note });
  const say = (t) => { note = t; msg.textContent = t; };
  const saveDraft = async () => { say('Saving…'); const res = await send(`/api/market/listings/${LID}/merch/${sel}`, 'PUT', { colors: isColors(p) ? st.opts : [], sizes: isColors(p) ? [] : st.opts, scale: st.scale, x: st.x, y: st.y, rot: st.rot, price: st.price }); p.current = res; dirty = false; return res; };
  const act = (label, cls, fn, disabled) => el('button', { type: 'button', class: `cz-btn ${cls}`, disabled, text: label, onclick: async () => { try { await fn(); } catch (e) { say(e.message); } } });
  const approved = cur?.status === 'approved' && !dirty;
  side.append(el('div', { class: 'cz-actions' },
    act('Save draft', 'ghost', async () => { await saveDraft(); say('Saved as a draft. Not on your listing yet.'); render(); }),
    act('📷 Make real photo', 'ghost', async () => { if (dirty || !cur) await saveDraft(); if (!st.opts.includes(st.view)) { say(`You don't sell ${st.view} yet. Tap "+ Sell this ${word}" first.`); return; } await send(`/api/market/listings/${LID}/merch/${sel}/photo`, 'POST', { option: st.view }); await refresh(); say(`Printful is making the ${st.view} photo.`); render(); }),
    act(approved ? '✓ Published on your listing' : '🚀 Approve and publish', 'primary', async () => { if (dirty) { say('Save and make the real photo first.'); return; } p.current = await send(`/api/market/listings/${LID}/merch/${sel}/approve`, 'POST'); say(`Published. Photos for your other ${isColors(p) ? 'colours' : 'sizes'} are being made.`); render(); }, approved || dirty || !cur?.ready_to_approve)),
  el('p', { class: 'cz-lock', text: '🔒 Nothing appears publicly until approved.' }), msg);
  // ---- sample real photo
  const photo = el('div', { class: 'cz-card cz-photo' }, el('h3', { text: `Sample real photo (${p.title}, ${st.view})` }));
  if (dirty) photo.append(el('p', { class: 'cz-muted', text: 'Save your changes, then make the real photo to see exactly what will print.' }));
  else if (cv?.photo) photo.append(el('a', { href: cv.photo, target: '_blank', rel: 'noopener' }, el('img', { src: cv.photo, alt: `Real Printful photo: ${p.title}, ${st.view}` })), el('p', { class: 'cz-muted', text: 'The real Printful photo. Check it, then approve.' }));
  else if (cv?.making) photo.append(el('p', { class: 'cz-muted', text: `Printful is making it… about 30 seconds per photo. It appears here.` }));
  else if (cv?.error) photo.append(el('p', { class: 'cz-warn', text: `The photo didn't come through: ${cv.error}. Try again.` }));
  else photo.append(el('p', { class: 'cz-muted', text: 'No photo yet. Press "Make real photo" to see your art on the real product.' }));
  side.append(photo);
  if (cur) side.append(el('details', { class: 'cz-more' }, el('summary', { text: 'More' }), act('Remove this product from my listing', 'danger', async () => { await send(`/api/market/listings/${LID}/merch/${sel}`, 'DELETE'); p.current = null; say('Removed.'); render(); })));
  place();
  return [centre, side];
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

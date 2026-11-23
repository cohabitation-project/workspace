/**
 * merchsets.mjs: one artwork, many products, done the way the best print shops do it (Geoffrey, 2026-11-23, after the
 * first version shipped "subpar by far": "People want to see it before they release it ... There has to be color
 * options ... the costs and the cuts, what we take, how that all works, should all be clear right there").
 * The bar, from Ash's research (Redbubble, Society6, Etsy, Prodigi, Shopify; Income m_mwtpc8631geb4a0b):
 *   1. art first, and every product is previewed before it goes public  -> each product is a DRAFT until approved
 *   2. the maker places the art by hand                                -> scale / x / y, saved per product
 *   3. print-quality feedback                                          -> quality(): effective DPI at that size
 *   4. a real mockup per colour                                        -> requestPhoto(): Printful's own photo
 *   5. the money, live                                                 -> money(): price, cost, card fee, cut, earnings
 *   6. colours and sizes inside the one listing                       -> colours chosen by the maker, all sizes each
 * The art stays ONE market listing. Buying a product is NOT wired here (a separate Tier 1 checkout step).
 *
 * Data: <data>/merch/sets.json = { [listingId]: { listing, by, art, items: { [productKey]: Item } } }
 *   Item = { product_id, title, placement, colors: [name], pos: {scale,x,y}, price, status: 'draft'|'approved',
 *            photos: { [color]: { img, pos } }, queue: [color], tasks: { [color]: key }, errors: { [color]: text } }
 * A photo counts only while `photos[c].pos` equals the item's current position (move the art -> new photo needed).
 */
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { CommonsError } from './core.mjs';
import * as market from './market.mjs';
import * as images from './images.mjs';
import * as printful from './printful.mjs';
import * as store from './store.mjs';

const fail = (s, m) => { throw new CommonsError(s, m); };
let FILE = null; let sets = {};
const save = () => { if (!FILE) return; const t = FILE + '.tmp'; fs.writeFileSync(t, JSON.stringify(sets, null, 1), { mode: 0o600 }); fs.renameSync(t, FILE); };
export function init(dataDir) {
  const dir = path.join(dataDir, 'merch'); fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  FILE = path.join(dir, 'sets.json');
  try { sets = JSON.parse(fs.readFileSync(FILE, 'utf8')) || {}; } catch { sets = {}; }
  // Sets saved by the first version (no status) are drafts now: nothing reaches buyers unapproved.
  for (const s of Object.values(sets)) for (const it of Object.values(s.items || {})) if (!it.status) Object.assign(it, { status: 'draft', colors: [], pos: { scale: 0.7, x: 0.5, y: 0.3 }, photos: {}, queue: [], tasks: {}, errors: {} });
}

export const shortTitle = (t) => String(t || '').split(' | ')[0];
export const colorOf = (v) => v.color || 'Standard';
const posKey = (p) => `${p.scale.toFixed(3)}:${p.x.toFixed(3)}:${p.y.toFixed(3)}`;
const clamp = (n, lo, hi, d) => { const v = Number(n); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };

// ------------------------------------------------------------------ the money, the same formula the page shows live
// Card fee: Stripe's standard US card rate, 2.9% + $0.30 per charge (the rate the fee tables v0.2 use). Who carries it
// is Geoffrey's open call; until he decides it is shown coming out of the maker's side, so earnings are never overstated.
export const FEES = () => ({ card_pct: 0.029, card_fixed: 0.30, cohabi_pct: Math.min(30, Math.max(0, Number(process.env.COMMONS_FEE_PERCENT || 0))) / 100, card_fee_payer: 'undecided' });
const cents = (n) => Math.round(n * 100) / 100;
/** Per size: what the buyer pays (the maker's price + Printful's size upcharge passed through), Printful's cost, the
 *  card fee, Cohabi's cut, and what the maker earns. Bigger sizes cost more to print; the maker's earnings stay level. */
export function money(product, colors, price) {
  const f = FEES(); const vs = product.variants.filter((v) => !colors?.length || colors.includes(colorOf(v)));
  const baseMin = Math.min(...vs.map((v) => v.price)); const bySize = new Map();
  for (const v of vs) { const k = v.size || v.name; if (!bySize.has(k) || bySize.get(k) < v.price) bySize.set(k, v.price); }
  return [...bySize].map(([size, base]) => { const pays = cents(price + (base - baseMin)); const card = cents(pays * f.card_pct + f.card_fixed); const cut = cents(pays * f.cohabi_pct);
    return { size, pays, printful: base, card_fee: card, cohabi: cut, earns: cents(pays - base - card - cut) }; });
}
/** The lowest price at which the maker still earns something on every size. */
export function floor(product, colors) {
  const f = FEES(); const vs = product.variants.filter((v) => !colors?.length || colors.includes(colorOf(v)));
  const baseMin = Math.min(...vs.map((v) => v.price));
  return Math.ceil(((baseMin + f.card_fixed + 0.01) / (1 - f.card_pct - f.cohabi_pct)) * 100) / 100;
}

// ------------------------------------------------------------------ print quality
/** Effective DPI of the art at this size on this product, and a plain grade (Prodigi's Excellent..Poor bar). */
export function quality(artPx, product, scale) {
  if (!artPx?.width) return { dpi: null, grade: 'unknown' };
  const inches = (product.area.width / (product.dpi || 150)) * scale; const dpi = Math.round(artPx.width / inches);
  return { dpi, grade: dpi >= 150 ? 'excellent' : dpi >= 110 ? 'good' : dpi >= 75 ? 'acceptable' : 'poor' };
}
async function artPixels(art) { try { const m = await sharp(images.fileOf(art)).metadata(); return { width: m.width || 0, height: m.height || 0 }; } catch { return null; } }

// ------------------------------------------------------------------ reading
export const get = (listingId) => sets[String(listingId)] || null;
/** Approved products only: what buyers see and what the Discovery chip counts. */
export const count = (listingId) => Object.values(get(listingId)?.items || {}).filter((it) => it.status === 'approved').length;

/** Buyers (owner=false): approved products only, each colour with its photo when made, sizes with buyer prices.
 *  The maker (owner=true): every product, drafts included, with position, queue, errors and the money breakdown. */
export function view(listingId, { owner = false, products = printful.cachedProducts() } = {}) {
  const s = get(listingId); if (!s) return { listing: String(listingId), items: [] };
  const items = [];
  for (const [key, it] of Object.entries(s.items)) {
    if (!owner && it.status !== 'approved') continue;
    const p = products.find((q) => q.key === key);
    const pk = posKey(it.pos);
    const photo = (c) => (it.photos?.[c]?.pos === pk ? `/images/${it.photos[c].img}` : null);
    const colors = it.colors.map((c) => ({ name: c, code: p?.variants.find((v) => colorOf(v) === c)?.color_code || null, photo: photo(c),
      making: (it.queue || []).includes(c) || !!it.tasks?.[c], error: it.errors?.[c] || null }));
    const sizes = p ? money(p, it.colors, it.price).map((r) => (owner ? r : { size: r.size, price: r.pays })) : [];
    items.push({ product: key, title: shortTitle(it.title), status: it.status, price: it.price, colors, sizes,
      main: colors.map((c) => c.photo).find(Boolean) || null,
      ...(owner ? { pos: it.pos, ready_to_approve: !!(it.colors[0] && photo(it.colors[0])) } : {}) });
  }
  return { listing: s.listing, art: s.art, items };
}

/** Everything the maker panel needs for one listing: the art, every product it could go on (with template, colours,
 *  quality), what's already set, and the fee terms. */
export async function panel(member, listingId) {
  const { l, art } = mine(member, listingId);
  const px = await artPixels(art); const list = await printful.products(); const fees = FEES();
  const current = view(l.id, { owner: true, products: list }).items;
  const out = [];
  for (const p of list) {
    let tpl = null; try { tpl = await printful.template(p.id, p.placement); } catch { tpl = null; }
    // Served from our own address (CSP): /api/merch/template/<product id>/image|background
    if (tpl) tpl = { ...tpl, image: tpl.image ? `/api/merch/template/${p.id}/image` : null, background: tpl.background ? `/api/merch/template/${p.id}/background` : null };
    const colors = [...new Map(p.variants.map((v) => [colorOf(v), v.color_code || null]))].map(([name, code]) => ({ name, code }));
    out.push({ product: p.key, title: shortTitle(p.title), placement: p.placement_label, area: p.area, dpi: p.dpi, template: tpl, colors,
      variants: p.variants.map((v) => ({ id: v.id, color: colorOf(v), size: v.size || v.name, price: v.price })),
      floor: floor(p, []), current: current.find((c) => c.product === p.key) || null });
  }
  return { listing: l.id, title: l.title, art: { id: art.id, url: `/images/${art.id}`, ...(px || {}) }, fees, products: out };
}

// ------------------------------------------------------------------ the maker's actions
function mine(member, listingId) {
  const l = market.get(listingId); if (!l || l.status !== 'live') fail(404, 'No such listing.');
  if (!member || l.by.id !== member.id) fail(403, 'Only the member who listed this art can put it on products.');
  const art = (l.images || []).map((id) => images.get(id)).find(Boolean);
  if (!art) fail(400, 'Add the picture of your art to this listing first. The products print that picture.');
  return { l, art };
}
async function productOf(key) {
  const p = (await printful.products()).find((q) => q.key === key);
  if (!p) fail(400, 'That product is not offered right now.'); return p;
}
function setFor(l, art, member) {
  let s = sets[l.id];
  if (!s || s.art !== art.id) s = sets[l.id] = { listing: l.id, by: member.id, art: art.id, items: s?.art === art.id ? s.items : {} };
  return s;
}

/** Save the maker's choices for one product as a DRAFT: colours, where the art sits, and the price. Moving the art or
 *  changing colours takes an approved product back to draft until it is previewed and approved again. */
export async function saveDraft(member, listingId, key, { colors, scale, x, y, price } = {}) {
  const { l, art } = mine(member, listingId); const p = await productOf(key);
  const offered = new Set(p.variants.map(colorOf));
  const picked = [...new Set((Array.isArray(colors) ? colors : []).map(String))].filter((c) => offered.has(c)).slice(0, 30);
  if (!picked.length) fail(400, 'Pick at least one colour to offer.');
  const pos = { scale: clamp(scale, 0.1, 1, 0.7), x: clamp(x, 0, 1, 0.5), y: clamp(y, 0, 1, 0.3) };
  const pr = cents(Number(price)); const fl = floor(p, picked);
  if (!(pr >= fl)) fail(400, `${shortTitle(p.title)}: at $${Number(price || 0).toFixed(2)} you'd earn nothing after Printful's cost and fees. The lowest price that pays you is $${fl.toFixed(2)}.`);
  if (pr > 10000) fail(400, 'That price is too high.');
  const s = setFor(l, art, member); const old = s.items[key];
  const moved = !old || posKey(old.pos) !== posKey(pos) || old.colors.join('|') !== picked.join('|');
  s.items[key] = { product_id: p.id, title: p.title, placement: p.placement, colors: picked, pos, price: pr,
    status: old?.status === 'approved' && !moved ? 'approved' : 'draft',
    photos: old?.photos || {}, queue: (old?.queue || []).filter((c) => picked.includes(c)), tasks: old?.tasks || {}, errors: {} };
  save(); return view(l.id, { owner: true }).items.find((i) => i.product === key);
}

/** Ask Printful for the real photo of one colour at the current position. Made in the background (~2 a minute). */
export function requestPhoto(member, listingId, key, color) {
  const { l } = mine(member, listingId); const it = sets[l.id]?.items?.[key];
  if (!it) fail(404, 'Save this product first.');
  const c = String(color || it.colors[0]); if (!it.colors.includes(c)) fail(400, 'Pick one of the colours you offer.');
  if (it.photos?.[c]?.pos === posKey(it.pos)) return { status: 'ready' };
  if (!it.queue.includes(c) && !it.tasks?.[c]) it.queue.push(c);
  delete it.errors[c]; save(); return { status: 'making', ahead: Math.max(0, it.queue.indexOf(c)) };
}

/** Put the product on the listing. Needs the real photo of the first colour at the current position; the other
 *  colours' photos are then made in the background. */
export function approve(member, listingId, key) {
  const { l } = mine(member, listingId); const it = sets[l.id]?.items?.[key];
  if (!it) fail(404, 'Save this product first.');
  const pk = posKey(it.pos);
  if (it.photos?.[it.colors[0]]?.pos !== pk) fail(409, 'Make the real photo first and check it. Nothing goes on your listing until you have seen it.');
  it.status = 'approved';
  for (const c of it.colors) if (it.photos?.[c]?.pos !== pk && !it.queue.includes(c) && !it.tasks?.[c]) it.queue.push(c);
  save(); return view(l.id, { owner: true }).items.find((i) => i.product === key);
}

export function remove(member, listingId, key) {
  const { l } = mine(member, listingId);
  if (sets[l.id]?.items?.[key]) { delete sets[l.id].items[key]; if (!Object.keys(sets[l.id].items).length) delete sets[l.id]; save(); }
  return { removed: key };
}

// ------------------------------------------------------------------ the background photo maker
// One step per tick: finish a photo Printful has made, else start ONE queued photo if the market-wide quota allows.
let busy = false;
export async function tick(publicUrl) {
  if (busy || !printful.configured()) return; busy = true;
  try {
    const base = String(publicUrl || '').replace(/\/+$/, ''); const list = await printful.products();
    for (const s of Object.values(sets)) for (const [key, it] of Object.entries(s.items)) {
      for (const [c, task] of Object.entries(it.tasks || {})) {
        const r = await printful.taskResult(task.key, it.placement);
        if (r.status === 'completed') {
          const owner = store.getMember(s.by); delete it.tasks[c];
          if (!owner) { it.errors[c] = 'the maker is no longer here'; save(); continue; }
          const img = images.upload(owner, { data: await images.fetchLink(r.url), alt: `${shortTitle(it.title)} in ${c}, printed with the art from this listing`, credit: "Product mockup by Printful, with the maker's art", title: `${shortTitle(it.title)} (${c}) mockup` });
          it.photos[c] = { img: img.id, pos: task.pos }; save();
        } else if (r.status === 'failed') { delete it.tasks[c]; it.errors[c] = r.error; save(); }
      }
    }
    if (!/^https?:\/\//.test(base)) return; // the print partner fetches the art from our public address
    for (const s of Object.values(sets)) for (const [key, it] of Object.entries(s.items)) {
      const c = it.queue?.[0]; if (!c) continue;
      const p = list.find((q) => q.key === key); if (!p) continue;
      const v = p.variants.find((x) => colorOf(x) === c); if (!v) { it.queue.shift(); save(); continue; }
      const px = await artPixels(images.get(s.art)); const aspect = px?.width && px?.height ? px.width / px.height : 1;
      const position = printful.positionFor(p.area, { ...it.pos, aspect });
      const k = await printful.queueMockup({ productId: p.id, variantId: v.id, placement: p.placement, imageUrl: `${base}/images/${s.art}`, position });
      if (!k) return;
      it.queue.shift(); it.tasks[c] = { key: k, pos: posKey(it.pos) }; save(); return;
    }
  } catch { /* a passing problem: the next tick tries again */ } finally { busy = false; }
}
export function start(publicUrl, ms = 20_000) {
  const t = setInterval(() => { tick(typeof publicUrl === 'function' ? publicUrl() : publicUrl); }, ms); t.unref?.();
  return t;
}

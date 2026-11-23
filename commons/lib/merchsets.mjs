/**
 * merchsets.mjs: one artwork, many products, done the way the best print shops do it (Geoffrey, 2026-11-23, after the
 * first version shipped "subpar by far": "People want to see it before they release it ... There has to be color
 * options ... the costs and the cuts, what we take, how that all works, should all be clear right there").
 * The bar, from Ash's research (Redbubble, Society6, Etsy, Prodigi, Shopify; Income m_mwtpc8631geb4a0b):
 *   1. art first, and every product is previewed before it goes public  -> each product is a DRAFT until approved
 *   2. the maker places the art by hand                                -> scale / x / y, saved per product
 *   3. print-quality feedback                                          -> the panel's grade(): effective DPI at that size
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
  for (const s of Object.values(sets)) for (const it of Object.values(s.items || {})) { if (!it.status) Object.assign(it, { status: 'draft', colors: [], pos: { scale: 0.7, x: 0.5, y: 0.3 }, photos: {}, queue: [], tasks: {}, errors: {} }); if (!it.sizes) it.sizes = []; if (it.pos && it.pos.rot === undefined) it.pos.rot = 0; }
}

export const shortTitle = (t) => String(t || '').split(' | ')[0];
export const colorOf = (v) => v.color || 'Standard';
export const sizeOf = (v) => v.size || v.name;
// Shirts, hoodies, mugs come in COLOURS (each colour in every size). Canvas and posters have no colours: they come in
// SIZES, each its own shape (Printful: all square or taller than wide), so the maker picks which sizes to offer.
export const kindOf = (p) => (new Set(p.variants.map(colorOf)).size > 1 || colorOf(p.variants[0]) !== 'Standard' ? 'colors' : 'sizes');
/** The variants this product is offered in: the chosen colours (all sizes each), or the chosen sizes. */
const chosen = (p, it) => p.variants.filter((v) => (kindOf(p) === 'colors' ? it.colors.includes(colorOf(v)) : it.sizes.includes(sizeOf(v))));
/** The variant a photo of one option (a colour, or a size) is made on. */
const variantFor = (p, it, opt) => p.variants.find((v) => (kindOf(p) === 'colors' ? colorOf(v) === opt : sizeOf(v) === opt));
const optionsOf = (p, it) => (kindOf(p) === 'colors' ? it.colors : it.sizes);
const ROTS = [0, 90, 180, 270];
const posKey = (p) => `${p.scale.toFixed(3)}:${p.x.toFixed(3)}:${p.y.toFixed(3)}:${p.rot || 0}`;
const clamp = (n, lo, hi, d) => { const v = Number(n); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };

// ------------------------------------------------------------------ the money, the same formula the page shows live
// Card fee: Stripe's standard US card rate, 2.9% + $0.30 per charge (the rate the fee tables v0.2 use). Who carries it
// is Geoffrey's open call; until he decides it is shown coming out of the maker's side, so earnings are never overstated.
export const FEES = () => ({ card_pct: 0.029, card_fixed: 0.30, cohabi_pct: Math.min(30, Math.max(0, Number(process.env.COMMONS_FEE_PERCENT || 0))) / 100, card_fee_payer: 'undecided' });
const cents = (n) => Math.round(n * 100) / 100;
/** Per size: what the buyer pays (the maker's price + Printful's size upcharge passed through), Printful's cost, the
 *  card fee, Cohabi's cut, and what the maker earns. Bigger sizes cost more to print; the maker's earnings stay level. */
export function money(product, vs, price) {
  const f = FEES(); vs = vs?.length ? vs : product.variants;
  const baseMin = Math.min(...vs.map((v) => v.price)); const bySize = new Map();
  for (const v of vs) { const k = sizeOf(v); if (!bySize.has(k) || bySize.get(k) < v.price) bySize.set(k, v.price); }
  return [...bySize].map(([size, base]) => { const pays = cents(price + (base - baseMin)); const card = cents(pays * f.card_pct + f.card_fixed); const cut = cents(pays * f.cohabi_pct);
    return { size, pays, printful: base, card_fee: card, cohabi: cut, earns: cents(pays - base - card - cut) }; });
}
/** The lowest price at which the maker still earns something on every size. */
export function floor(product, vs) {
  const f = FEES(); vs = vs?.length ? vs : product.variants;
  const baseMin = Math.min(...vs.map((v) => v.price));
  return Math.ceil(((baseMin + f.card_fixed + 0.01) / (1 - f.card_pct - f.cohabi_pct)) * 100) / 100;
}

// ------------------------------------------------------------------ print quality
// Print quality is computed in the panel (merch-panel.js grade()), live, from the art's pixels and each size's print
// area and DPI, which panel() provides; one formula, in one place.
async function artPixels(art) { try { const m = await sharp(images.fileOf(art)).metadata(); return { width: m.width || 0, height: m.height || 0 }; } catch { return null; } }

// The art turned 90/180/270°, for products where it has to turn (wide art on a tall canvas hangs sideways). Served at a
// public address because Printful fetches the print file from us; made on demand from the listing's own picture.
const turned = new Map(); // `${artId}:${rot}` -> png buffer
export async function rotatedArt(listingId, rot) {
  const r = Number(rot); if (![90, 180, 270].includes(r)) fail(404, 'No such turn.');
  const l = market.get(listingId); if (!l || l.status !== 'live') fail(404, 'No such listing.');
  const art = (l.images || []).map((id) => images.get(id)).find(Boolean); if (!art) fail(404, 'No art.');
  const k = `${art.id}:${r}`; if (!turned.has(k)) { if (turned.size > 200) turned.clear(); turned.set(k, await sharp(images.fileOf(art)).rotate(r).png().toBuffer()); }
  return turned.get(k);
}
const artUrl = (base, s, rot) => (rot ? `${base}/api/merch/art/${s.listing}/${rot}` : `${base}/images/${s.art}`);

// ------------------------------------------------------------------ reading
export const get = (listingId) => sets[String(listingId)] || null;
/** Approved products only: what buyers see and what the Discovery chip counts. */
export const count = (listingId) => Object.values(get(listingId)?.items || {}).filter((it) => it.status === 'approved').length;

/** Buyers (owner=false): approved products only. A colour product shows swatches (each with its photo) and every size
 *  with its price; a size product (canvas, posters) shows its sizes, each with its own photo and price.
 *  The maker (owner=true): every product, drafts included, with position, queue, errors and the money breakdown. */
export function view(listingId, { owner = false, products = printful.cachedProducts() } = {}) {
  const s = get(listingId); if (!s) return { listing: String(listingId), items: [] };
  const items = [];
  for (const [key, it] of Object.entries(s.items)) {
    if (!owner && it.status !== 'approved') continue;
    const p = products.find((q) => q.key === key); if (!p) continue;
    const kind = kindOf(p); const pk = posKey(it.pos);
    const photo = (o) => (it.photos?.[o]?.pos === pk ? `/images/${it.photos[o].img}` : null);
    const opts = optionsOf(p, it).map((o) => ({ name: o, code: kind === 'colors' ? p.variants.find((v) => colorOf(v) === o)?.color_code || null : null, photo: photo(o),
      making: (it.queue || []).includes(o) || !!it.tasks?.[o], error: it.errors?.[o] || null }));
    const rows = money(p, chosen(p, it), it.price);
    items.push({ product: key, kind, title: shortTitle(it.title), status: it.status, price: it.price, options: opts,
      sizes: owner ? rows : rows.map((r) => ({ size: r.size, price: r.pays, photo: kind === 'sizes' ? photo(r.size) : null })),
      main: opts.map((o) => o.photo).find(Boolean) || null,
      ...(owner ? { pos: it.pos, colors: it.colors, chosen_sizes: it.sizes, ready_to_approve: !!(optionsOf(p, it)[0] && photo(optionsOf(p, it)[0])) } : {}) });
  }
  return { listing: s.listing, art: s.art, items };
}

/** Everything the maker panel needs for one listing: the art, every product it could go on (template, colours or sizes
 *  with each size's own print area, quality inputs), what's already set, and the fee terms. */
export async function panel(member, listingId) {
  const { l, art } = mine(member, listingId);
  const px = await artPixels(art); const list = await printful.products(); const fees = FEES();
  const current = view(l.id, { owner: true, products: list }).items;
  const out = [];
  for (const p of list) {
    const kind = kindOf(p);
    let tpl = null; if (kind === 'colors') { try { tpl = await printful.template(p.id, p.placement); } catch { tpl = null; } }
    if (tpl) tpl = { ...tpl, image: tpl.image ? `/api/merch/template/${p.id}/image` : null, background: tpl.background ? `/api/merch/template/${p.id}/background` : null };
    const colors = [...new Map(p.variants.map((v) => [colorOf(v), v.color_code || null]))].map(([name, code]) => ({ name, code }));
    const sizes = [...new Map(p.variants.map((v) => [sizeOf(v), v]))].map(([name, v]) => ({ name, area: v.area || p.area, dpi: v.dpi || p.dpi, price: v.price }));
    out.push({ product: p.key, kind, title: shortTitle(p.title), image: p.image ? `/api/merch/product-image/${p.id}` : null, placement: p.placement_label, area: p.area, dpi: p.dpi, template: tpl, colors, sizes,
      variants: p.variants.map((v) => ({ id: v.id, color: colorOf(v), size: sizeOf(v), price: v.price })),
      floor: floor(p, []), current: current.find((c) => c.product === p.key) || null });
  }
  return { listing: l.id, title: l.title, maker: l.by.name, page: l.page?.name || null, art: { id: art.id, url: `/images/${art.id}`, ...(px || {}) }, fees, products: out };
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

/** Save the maker's choices for one product as a DRAFT: colours (or sizes), where the art sits and how it's turned, and
 *  the price. Moving or turning the art, or changing what's offered, takes an approved product back to draft. */
export async function saveDraft(member, listingId, key, { colors, sizes, scale, x, y, rot, price } = {}) {
  const { l, art } = mine(member, listingId); const p = await productOf(key); const kind = kindOf(p);
  const pickFrom = (want, all, max) => [...new Set((Array.isArray(want) ? want : []).map(String))].filter((c) => all.has(c)).slice(0, max);
  const cols = kind === 'colors' ? pickFrom(colors, new Set(p.variants.map(colorOf)), 40) : [];
  const szs = kind === 'sizes' ? pickFrom(sizes, new Set(p.variants.map(sizeOf)), 60) : [];
  if (kind === 'colors' && !cols.length) fail(400, 'Pick at least one colour to offer.');
  if (kind === 'sizes' && !szs.length) fail(400, 'Pick at least one size to offer.');
  const r = Number(rot) || 0; if (!ROTS.includes(r)) fail(400, 'Turn the art by 90° steps.');
  const pos = { scale: clamp(scale, 0.1, 1, 0.7), x: clamp(x, 0, 1, 0.5), y: clamp(y, 0, 1, 0.3), rot: r };
  const probe = { colors: cols, sizes: szs }; const vs = chosen(p, probe);
  const pr = cents(Number(price)); const fl = floor(p, vs);
  if (!(pr >= fl)) fail(400, `${shortTitle(p.title)}: at $${Number(price || 0).toFixed(2)} you'd earn nothing after Printful's cost and fees. The lowest price that pays you is $${fl.toFixed(2)}.`);
  if (pr > 10000) fail(400, 'That price is too high.');
  const s = setFor(l, art, member); const old = s.items[key]; const opts = kind === 'colors' ? cols : szs;
  const moved = !old || posKey(old.pos) !== posKey(pos) || (old.colors || []).join('|') !== cols.join('|') || (old.sizes || []).join('|') !== szs.join('|');
  s.items[key] = { product_id: p.id, title: p.title, placement: p.placement, colors: cols, sizes: szs, pos, price: pr,
    status: old?.status === 'approved' && !moved ? 'approved' : 'draft',
    photos: old?.photos || {}, queue: (old?.queue || []).filter((c) => opts.includes(c)), tasks: old?.tasks || {}, errors: {} };
  save(); return view(l.id, { owner: true }).items.find((i) => i.product === key);
}

/** Ask Printful for the real photo of one option (a colour, or a size) at the current position and turn. */
export async function requestPhoto(member, listingId, key, option) {
  const { l } = mine(member, listingId); const it = sets[l.id]?.items?.[key];
  if (!it) fail(404, 'Save this product first.');
  const p = await productOf(key); const opts = optionsOf(p, it);
  const o = String(option || opts[0]); if (!opts.includes(o)) fail(400, `Pick one of the ${kindOf(p) === 'colors' ? 'colours' : 'sizes'} you offer.`);
  if (it.photos?.[o]?.pos === posKey(it.pos)) return { status: 'ready' };
  if (!it.queue.includes(o) && !it.tasks?.[o]) it.queue.push(o);
  delete it.errors[o]; save(); return { status: 'making', ahead: Math.max(0, it.queue.indexOf(o)) };
}

/** Put the product on the listing. Needs the real photo of the first option at the current position; the other
 *  options' photos are then made in the background. */
export async function approve(member, listingId, key) {
  const { l } = mine(member, listingId); const it = sets[l.id]?.items?.[key];
  if (!it) fail(404, 'Save this product first.');
  const p = await productOf(key); const opts = optionsOf(p, it); const pk = posKey(it.pos);
  if (it.photos?.[opts[0]]?.pos !== pk) fail(409, 'Make the real photo first and check it. Nothing goes on your listing until you have seen it.');
  it.status = 'approved';
  for (const o of opts) if (it.photos?.[o]?.pos !== pk && !it.queue.includes(o) && !it.tasks?.[o]) it.queue.push(o);
  save(); return view(l.id, { owner: true }).items.find((i) => i.product === key);
}

export function remove(member, listingId, key) {
  const { l } = mine(member, listingId);
  if (sets[l.id]?.items?.[key]) { delete sets[l.id].items[key]; if (!Object.keys(sets[l.id].items).length) delete sets[l.id]; save(); }
  return { removed: key };
}

// ------------------------------------------------------------------ the background photo maker
// One step per tick: finish photos Printful has made, else start ONE queued photo if the market-wide quota allows.
let busy = false;
export async function tick(publicUrl) {
  if (busy || !printful.configured()) return; busy = true;
  try {
    const base = String(publicUrl || '').replace(/\/+$/, ''); const list = await printful.products();
    for (const s of Object.values(sets)) for (const it of Object.values(s.items)) {
      for (const [o, task] of Object.entries(it.tasks || {})) {
        const r = await printful.taskResult(task.key, it.placement);
        if (r.status === 'completed') {
          const owner = store.getMember(s.by); delete it.tasks[o];
          if (!owner) { it.errors[o] = 'the maker is no longer here'; save(); continue; }
          const img = images.upload(owner, { data: await images.fetchLink(r.url), alt: `${shortTitle(it.title)} (${o}), printed with the art from this listing`, credit: "Product mockup by Printful, with the maker's art", title: `${shortTitle(it.title)} (${o}) mockup` });
          it.photos[o] = { img: img.id, pos: task.pos }; save();
        } else if (r.status === 'failed') { delete it.tasks[o]; it.errors[o] = r.error; save(); }
      }
    }
    if (!/^https?:\/\//.test(base)) return; // the print partner fetches the art from our public address
    for (const s of Object.values(sets)) for (const [key, it] of Object.entries(s.items)) {
      const o = it.queue?.[0]; if (!o) continue;
      const p = list.find((q) => q.key === key); if (!p) continue;
      const v = variantFor(p, it, o); if (!v) { it.queue.shift(); save(); continue; }
      const px = await artPixels(images.get(s.art)); const rot = it.pos.rot || 0;
      let aspect = px?.width && px?.height ? px.width / px.height : 1; if (rot % 180) aspect = 1 / aspect;
      const position = printful.positionFor(v.area || p.area, { ...it.pos, aspect });
      const k = await printful.queueMockup({ productId: p.id, variantId: v.id, placement: p.placement, imageUrl: artUrl(base, s, rot), position });
      if (!k) return;
      it.queue.shift(); it.tasks[o] = { key: k, pos: posKey(it.pos) }; save(); return;
    }
  } catch { /* a passing problem: the next tick tries again */ } finally { busy = false; }
}
export function start(publicUrl, ms = 20_000) {
  const t = setInterval(() => { tick(typeof publicUrl === 'function' ? publicUrl() : publicUrl); }, ms); t.unref?.();
  return t;
}

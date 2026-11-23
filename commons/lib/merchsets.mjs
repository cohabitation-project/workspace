/**
 * merchsets.mjs: one artwork, many products (Geoffrey, 2026-11-23: "An artist shouldn't have to post a cup, a shirt, a
 * print as different individual objects. What you do is you make the one image that's sitting there able to be applied
 * to anything"). The art stays ONE market listing. Its maker ticks which Printful products it can go on and sets a price
 * for each; the art is placed automatically and a real mockup of each product is made in the background (Printful makes
 * only a few a minute) and kept in the image library. Buyers see a "Get it on" row under the artwork.
 *
 * Buying a product from the row is NOT wired here: the checkout for a chosen product + colour/size is a separate Tier 1
 * step (money). Until then the row says so plainly. Nothing here reaches Printful except mockup requests.
 *
 * Data: <data>/merch/sets.json = { [listingId]: { listing, by, art, items: { [productKey]: {...} }, updated } }.
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
}

// Where the art sits on each product: share of the print area's width, and how far down (0 top, 1 bottom).
const PLACE = { tee: [0.7, 0.25], hoodie: [0.6, 0.25], mug: [0.8, 0.5], poster: [0.95, 0.5], canvas: [1, 0.5], tote: [0.8, 0.45], sticker: [0.9, 0.5], phone: [0.9, 0.5] };
export const shortTitle = (t) => String(t || '').split(' | ')[0];
const topBase = (p) => Math.max(...p.variants.map((v) => v.price).filter((n) => n > 0));
async function aspectOf(art) { try { const m = await sharp(images.fileOf(art)).metadata(); return m.width && m.height ? m.width / m.height : 1; } catch { return 1; } }

export const get = (listingId) => sets[String(listingId)] || null;
export const count = (listingId) => Object.keys(get(listingId)?.items || {}).length;

/** What a page or an agent needs: each product with its price, its mockup (once made) and its colours/sizes. */
export function view(listingId, products = printful.cachedProducts()) {
  const s = get(listingId); if (!s) return { listing: String(listingId), items: [] };
  return { listing: s.listing, art: s.art, items: Object.entries(s.items).map(([key, it]) => ({
    product: key, product_id: it.product_id, title: shortTitle(it.title), price: it.price,
    mockup: it.mockup ? `/images/${it.mockup}` : null, status: it.mockup ? 'ready' : it.error ? 'failed' : 'making', error: it.error || null,
    options: (products.find((p) => p.key === key)?.variants || []).map((v) => ({ id: v.id, name: v.name })),
  })) };
}

/** The maker says which products this art goes on, and at what price. Replaces the set; keeps finished mockups. */
export async function setProducts(member, listingId, items) {
  const l = market.get(listingId); if (!l || l.status !== 'live') fail(404, 'No such listing.');
  if (!member || l.by.id !== member.id) fail(403, 'Only the member who listed this art can put it on products.');
  const art = (l.images || []).map((id) => images.get(id)).find(Boolean);
  if (!art) fail(400, 'Add the picture of your art to this listing first. The products print that picture.');
  const want = Array.isArray(items) ? items : [];
  if (!want.length) { delete sets[l.id]; save(); return view(l.id); }
  const list = await printful.products();
  if (!list.length) fail(503, "The print partner's products aren't available right now. Try again in a minute.");
  const prev = sets[l.id]; const aspect = await aspectOf(art); const out = {};
  for (const w of want.slice(0, list.length)) {
    const p = list.find((q) => q.key === w?.product || q.id === Number(w?.product));
    if (!p) fail(400, `Pick from the products offered (${list.map((q) => q.key).join(', ')}).`);
    const floor = topBase(p); const price = Math.round(Number(w.price) * 100) / 100;
    if (!(price >= floor)) fail(400, `${shortTitle(p.title)}: set a price of at least $${floor.toFixed(2)}, the print partner's highest base cost for it, so every size can be sold.`);
    if (price > 10000) fail(400, `${shortTitle(p.title)}: that price is too high.`);
    const [scale, y] = PLACE[p.key] || [0.8, 0.4];
    const old = prev && prev.art === art.id ? prev.items?.[p.key] : null; // a new picture means new mockups
    out[p.key] = { product_id: p.id, title: p.title, price, placement: p.placement, position: printful.positionFor(p.area, { scale, y, x: 0.5, aspect }),
      variant: p.variants[0].id, mockup: old?.mockup || null, task: old?.mockup ? null : old?.task || null, error: null };
  }
  sets[l.id] = { listing: l.id, by: member.id, art: art.id, items: out, updated: new Date().toISOString() };
  save(); return view(l.id, list);
}

// ------------------------------------------------------------------ the background mockup maker
// One step per tick: finish a waiting task if one is done, else start ONE new mockup if the market-wide quota allows.
let busy = false;
export async function tick(publicUrl) {
  if (busy || !printful.configured()) return; busy = true;
  try {
    const base = String(publicUrl || '').replace(/\/+$/, '');
    for (const s of Object.values(sets)) {
      for (const it of Object.values(s.items)) {
        if (it.mockup || it.error) continue;
        if (it.task) {
          const r = await printful.taskResult(it.task, it.placement);
          if (r.status === 'completed') {
            const owner = store.getMember(s.by); if (!owner) { it.error = 'the maker is no longer here'; it.task = null; save(); continue; }
            const img = images.upload(owner, { data: await images.fetchLink(r.url), alt: `${shortTitle(it.title)} printed with the art from this listing`, credit: "Product mockup by Printful, with the maker's art", title: `${shortTitle(it.title)} mockup` });
            it.mockup = img.id; it.task = null; save();
          } else if (r.status === 'failed') { it.error = r.error; it.task = null; save(); }
          continue;
        }
        if (!/^https?:\/\//.test(base)) return; // the print partner fetches the art from our public address
        const key = await printful.queueMockup({ productId: it.product_id, variantId: it.variant, placement: it.placement, imageUrl: `${base}/images/${s.art}`, position: it.position });
        if (!key) return; it.task = key; save(); return;
      }
    }
  } catch { /* a passing problem: the next tick tries again */ } finally { busy = false; }
}
export function start(publicUrl, ms = 20_000) {
  const t = setInterval(() => { tick(typeof publicUrl === 'function' ? publicUrl() : publicUrl); }, ms); t.unref?.();
  return t;
}

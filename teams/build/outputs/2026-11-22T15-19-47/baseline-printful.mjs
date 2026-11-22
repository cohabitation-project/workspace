/**
 * printful.mjs: a maker turns their own art into a real product, with a real Printful mockup (Ash's spec, Income,
 * 2026-11-21 m_mwr29y4w3q53347c). The maker picks a product, a colour and where the art sits; the server asks Printful's
 * Mockup Generator for a photo of that product with the art on it and keeps its own copy in the image library
 * (Printful's mockup links expire after 72 hours). The maker sets a price at or above Printful's base cost and publishes
 * an ordinary market listing linked to the Printful product. Orders do NOT go to Printful until payments open
 * (fulfillment.send refuses before then). This replaces the flat-outline picker, which stays out.
 *
 * Token: PRINTFUL_TOKEN in the server .env (an account-level private token: store products + files), never in git or
 * chat. PRINTFUL_STORE_ID is optional here; it is needed later for orders. PRINTFUL_API_URL points tests at a fake.
 *
 * The product list is short on purpose. Each id is checked against Printful's catalog when the list is first read; a
 * product Printful doesn't return (wrong id, discontinued) is left out, and the title shown is always Printful's own.
 * PRINTFUL_PRODUCTS (JSON [{key,id}]) replaces the list without a code change.
 */
import { CommonsError } from './core.mjs';
import * as images from './images.mjs';
import { PIPES } from './fulfillment.mjs';

const fail = (s, m) => { throw new CommonsError(s, m); };
const env = (k) => (process.env[k] || '').trim();
export const configured = () => !!env('PRINTFUL_TOKEN');

// Ash's list: tee, hoodie, mug, poster, canvas, tote, sticker, phone case. Ids are Printful catalog product ids.
export const DEFAULT_PRODUCTS = [
  { key: 'tee', id: 71 }, { key: 'hoodie', id: 146 }, { key: 'mug', id: 19 }, { key: 'poster', id: 1 },
  { key: 'canvas', id: 3 }, { key: 'tote', id: 84 }, { key: 'sticker', id: 358 }, { key: 'phone', id: 181 },
];
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const curated = () => { try { const j = JSON.parse(env('PRINTFUL_PRODUCTS') || 'null'); if (Array.isArray(j) && j.length) return j; } catch { /* default */ } return DEFAULT_PRODUCTS; };

async function api(p, { method = 'GET', body } = {}) {
  if (!configured()) fail(503, "The print partner isn't connected yet.");
  const headers = { authorization: `Bearer ${env('PRINTFUL_TOKEN')}`, ...(body ? { 'content-type': 'application/json' } : {}) };
  if (env('PRINTFUL_STORE_ID')) headers['X-PF-Store-Id'] = env('PRINTFUL_STORE_ID');
  let r; try { r = await fetch(PIPES.printful.base() + p, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25_000) }); }
  catch { fail(502, "Couldn't reach the print partner. Try again in a minute."); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 429) fail(429, 'The print partner makes only a few mockups a minute. Try again in a minute.');
  if (!r.ok) fail(502, `The print partner said no (${r.status}${j?.error?.message ? `: ${String(j.error.message).slice(0, 160)}` : ''}).`);
  return j.result ?? j;
}

// ------------------------------------------------------------------ the product list (cached 6 hours)
let cache = null; let cacheAt = 0;
export function resetCache() { cache = null; cacheAt = 0; tasks.clear(); recent.length = 0; }
export async function products() {
  if (cache && Date.now() - cacheAt < 6 * 3600_000) return cache;
  const out = [];
  for (const { key, id } of curated()) {
    try {
      const p = await api(`/products/${Number(id)}`);
      if (!p?.product || p.product.is_discontinued) continue;
      const pf = await api(`/mockup-generator/printfiles/${Number(id)}`);
      const variants = (p.variants || []).filter((v) => v.in_stock !== false).slice(0, 60)
        .map((v) => ({ id: v.id, name: v.name, color: v.color || null, color_code: v.color_code || null, size: v.size || null, price: Number(v.price) || 0 }));
      if (!variants.length) continue;
      const placements = pf?.available_placements || {};
      const placement = placements.front ? 'front' : placements.default ? 'default' : Object.keys(placements)[0];
      if (!placement) continue;
      const vp = (pf.variant_printfiles || []).find((x) => x.placements?.[placement]);
      const printfile = (pf.printfiles || []).find((x) => x.printfile_id === vp?.placements?.[placement]) || (pf.printfiles || [])[0];
      if (!printfile?.width || !printfile?.height) continue;
      out.push({ key, id: Number(id), title: p.product.title || p.product.model || key, image: p.product.image || null, currency: p.product.currency || 'USD',
        placement, placement_label: placements[placement] || placement, area: { width: printfile.width, height: printfile.height }, variants,
        base_from: Math.min(...variants.map((v) => v.price).filter((n) => n > 0)) });
    } catch (e) { if (e?.status === 503) throw e; /* one product failing leaves the rest */ }
  }
  cache = out; cacheAt = Date.now();
  return out;
}

// ------------------------------------------------------------------ a mockup
const tasks = new Map();   // task_key -> { member, product, variant, placement, art, position, base, ts, image }
const recent = [];         // timestamps of tasks created, Commons-wide (Printful allows 2-10 a minute per account)
const PER_MINUTE = () => Number(env('PRINTFUL_MOCKUPS_PER_MINUTE')) || 2;

/** Where the art sits: scale is its width as a share of the print area (0.1-1); x and y place it (0 = left/top,
 *  0.5 = centre, 1 = right/bottom); aspect is the art's own width/height. Kept inside the print area. */
export function positionFor(area, { scale = 0.8, x = 0.5, y = 0.35, aspect = 1 } = {}) {
  const s = Math.min(1, Math.max(0.1, num(scale, 0.8))); const a = Math.min(20, Math.max(0.05, num(aspect, 1)));
  let w = Math.round(area.width * s); let h = Math.round(w / a);
  if (h > area.height) { h = area.height; w = Math.round(h * a); }
  const cx = Math.min(1, Math.max(0, num(x, 0.5))); const cy = Math.min(1, Math.max(0, num(y, 0.35)));
  return { area_width: area.width, area_height: area.height, width: w, height: h, left: Math.round((area.width - w) * cx), top: Math.round((area.height - h) * cy) };
}

export async function startMockup(member, { product, variant, art, scale, x, y, aspect } = {}, { publicUrl }) {
  if (!member) fail(401, 'Sign in to make a product.');
  const list = await products();
  const p = list.find((q) => q.key === product || q.id === Number(product)); if (!p) fail(400, 'Pick one of the products offered.');
  const v = p.variants.find((q) => q.id === Number(variant)) || p.variants[0];
  // Your own upload only (uploaded by you, or for you): a product carries the maker's rights, so no borrowing pictures.
  const it = images.get(art); if (!it) fail(400, 'Pick one of your own pictures for the art.');
  if (it.by !== member.id && it.for !== member.id) fail(403, 'Use art you uploaded yourself. A product is sold under your name, so the art has to be yours.');
  const artId = it.id;
  const base = String(publicUrl || '').replace(/\/+$/, ''); if (!/^https?:\/\//.test(base)) fail(503, "This server doesn't know its public address (COMMONS_PUBLIC_URL), so the print partner can't fetch the art.");
  const now = Date.now(); while (recent.length && now - recent[0] > 60_000) recent.shift();
  if (recent.length >= PER_MINUTE()) fail(429, `The print partner makes only ${PER_MINUTE()} mockups a minute for the whole market. Try again in ${Math.ceil((60_000 - (now - recent[0])) / 1000)} seconds.`);
  const position = positionFor(p.area, { scale, x, y, aspect });
  const r = await api(`/mockup-generator/create-task/${p.id}`, { method: 'POST', body: { variant_ids: [v.id], format: 'jpg', files: [{ placement: p.placement, image_url: `${base}/images/${artId}`, position }] } });
  if (!r?.task_key) fail(502, "The print partner didn't start the mockup.");
  recent.push(now);
  tasks.set(r.task_key, { member: member.id, product: p.key, product_id: p.id, product_title: p.title, variant: v.id, variant_name: v.name, placement: p.placement, art: artId, position, base: v.price, ts: now, image: null });
  return { task: r.task_key, status: 'pending', base_price: v.price };
}

/** Poll a mockup. When Printful has made it, the server keeps a copy in the image library (as the maker's picture). */
export async function mockupResult(member, key) {
  const t = tasks.get(String(key || '')); if (!t || !member || t.member !== member.id) fail(404, 'No such mockup.');
  if (t.image) return { status: 'completed', image: t.image, url: `/images/${t.image}`, base_price: t.base };
  const r = await api(`/mockup-generator/task?task_key=${encodeURIComponent(key)}`);
  if (r?.status === 'failed') { tasks.delete(key); fail(502, `The print partner couldn't make that mockup${r.error ? `: ${String(r.error).slice(0, 160)}` : ''}.`); }
  if (r?.status !== 'completed') return { status: 'pending' };
  const m = (r.mockups || []).find((x) => x.placement === t.placement) || (r.mockups || [])[0];
  if (!m?.mockup_url) fail(502, 'The print partner finished but sent no picture.');
  const buf = await images.fetchLink(m.mockup_url);
  const img = images.upload(member, { data: buf, alt: `Mockup: ${t.product_title} (${t.variant_name}) with the maker's art`, credit: 'Product mockup by Printful, with the maker\'s art', title: `${t.product_title} mockup` });
  t.image = img.id;
  return { status: 'completed', image: img.id, url: `/images/${img.id}`, base_price: t.base };
}

/** The finished mockup a listing is about to use: the maker's own, completed, not yet used. */
export function takeTask(member, key) {
  const t = tasks.get(String(key || '')); if (!t || t.member !== member?.id) fail(404, 'No such mockup. Make the mockup first.');
  if (!t.image) fail(409, "The mockup isn't ready yet.");
  return t;
}
export const forgetTask = (key) => tasks.delete(String(key || ''));

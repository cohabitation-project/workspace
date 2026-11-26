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
// A failure that may pass by itself (rate limit, timeout, network, Printful 5xx): never cached as "no products".
const transient = (s, m) => { const e = new CommonsError(s, m); e.transient = true; throw e; };
const env = (k) => (process.env[k] || '').trim();
export const configured = () => !!env('PRINTFUL_TOKEN');

// Ash's list: tee, hoodie, mug, poster, canvas, tote, sticker, phone case. Ids are Printful catalog product ids.
export const DEFAULT_PRODUCTS = [
  { key: 'tee', id: 71 }, { key: 'hoodie', id: 146 }, { key: 'mug', id: 19 }, { key: 'poster', id: 1 },
  { key: 'canvas', id: 3 }, { key: 'tote', id: 84 }, { key: 'sticker', id: 358 }, { key: 'phone', id: 181 },
];
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

// PRINTFUL_PRODUCTS: unset (or empty) means DEFAULT_PRODUCTS — that is the intended fallback, in silence. SET but
// unusable is a configuration mistake, not a reason to sell Ash's eight defaults as if nothing were wrong (round 67).
// Before this, `'[]'`, `'{bad'`, an entry without an id (which reached Printful as /products/NaN and vanished) and a
// repeated key (one product silently won) all fell back or half-worked with no sign in the log. Now each distinct
// problem writes one `[printful] …` line to the server log and refuses with a CommonsError(500) whose message says
// what is wrong and what shape is wanted, so the maker panel and GET /api/merch/products can show it. The background
// merchsets.tick keeps its own catch and retries: a misconfigured server retries every 20 s and logs once per problem.
const reported = new Set();
function unusable(why) {
  if (!reported.has(why)) {
    reported.add(why);
    try { console.error(`[printful] PRINTFUL_PRODUCTS is set but unusable: ${why}. Want JSON like [{"key":"tee","id":71}].`); } catch { /* no console */ }
  }
  fail(500, `PRINTFUL_PRODUCTS is set but unusable: ${why}. A steward has to fix it: set the variable to JSON like [{"key":"tee","id":71}], or unset it for the eight defaults.`);
}
/** The curated list, checked. Throws (500) when PRINTFUL_PRODUCTS is set and wrong; never when it is unset. */
export function curated() {
  const raw = env('PRINTFUL_PRODUCTS');
  if (!raw) return DEFAULT_PRODUCTS;                       // unset or empty: the intended fallback
  let j;
  try { j = JSON.parse(raw); } catch { unusable(`it is not valid JSON (${raw.length} characters)`); }
  if (!Array.isArray(j)) unusable('it is not a JSON array');
  if (!j.length) unusable('it is an empty array');
  const seen = new Set();
  return j.map((e, i) => {
    const key = typeof e?.key === 'string' ? e.key.trim() : '';
    const id = Number(e?.id);
    if (!key || !Number.isInteger(id) || id <= 0) unusable(`entry ${i} is not {key, id} (got ${JSON.stringify(e)})`);
    if (seen.has(key)) unusable(`the key "${key}" appears twice`);
    seen.add(key);
    return { key, id };
  });
}

async function api(p, { method = 'GET', body } = {}) {
  if (!configured()) fail(503, "The print partner isn't connected yet.");
  const headers = { authorization: `Bearer ${env('PRINTFUL_TOKEN')}`, ...(body ? { 'content-type': 'application/json' } : {}) };
  if (env('PRINTFUL_STORE_ID')) headers['X-PF-Store-Id'] = env('PRINTFUL_STORE_ID');
  let r; try { r = await fetch(PIPES.printful.base() + p, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(25_000) }); }
  catch { transient(502, "Couldn't reach the print partner. Try again in a minute."); }
  const j = await r.json().catch(() => ({}));
  if (r.status === 429) transient(429, 'The print partner makes only a few mockups a minute. Try again in a minute.');
  if (r.status >= 500) transient(502, `The print partner had a problem (${r.status}). Try again in a minute.`);
  if (!r.ok) fail(502, `The print partner said no (${r.status}${j?.error?.message ? `: ${String(j.error.message).slice(0, 160)}` : ''}).`);
  return j.result ?? j;
}

// ------------------------------------------------------------------ the product list (cached 6 hours)
// Claude's review of #291, defect 1: a 429 or timeout on the first read used to cache [] for 6 hours and hide the panel.
// Now only a complete read is cached. If Printful had a passing problem, the last good list stays in use (if there is
// one) and the list is read again after RETRY_MS; with no good list yet, [] is returned and retried after RETRY_MS.
const FRESH_MS = 6 * 3600_000; export const RETRY_MS = 60_000;
let cache = null; let cacheAt = 0; let failAt = 0;
export function resetCache() { cache = null; cacheAt = 0; failAt = 0; tasks.clear(); recent.length = 0; }
export async function products() {
  const now = Date.now();
  if (cache && now - cacheAt < FRESH_MS) return cache;
  if (failAt && now - failAt < RETRY_MS) return cache || [];
  const out = []; let hiccup = false;
  for (const { key, id } of curated()) {
    try {
      const p = await api(`/products/${Number(id)}`);
      if (!p?.product || p.product.is_discontinued) continue;
      const pf = await api(`/mockup-generator/printfiles/${Number(id)}`);
      const placements = pf?.available_placements || {};
      const placement = placements.front ? 'front' : placements.default ? 'default' : Object.keys(placements)[0];
      if (!placement) continue;
      // Each variant's own print file: wall art (canvas, posters) is a different SHAPE per size, so the art is placed on
      // that size's print area, not one shared one (Geoffrey, 2026-11-23: wide art on a tall canvas).
      const pfById = new Map((pf.printfiles || []).map((x) => [x.printfile_id, x]));
      const pfOf = (vid) => pfById.get((pf.variant_printfiles || []).find((x) => x.variant_id === vid)?.placements?.[placement]);
      const variants = (p.variants || []).filter((v) => v.in_stock !== false).slice(0, 500)
        .map((v) => { const f = pfOf(v.id); return { id: v.id, name: v.name, color: v.color || null, color_code: v.color_code || null, size: v.size || null, price: Number(v.price) || 0,
          area: f?.width && f?.height ? { width: f.width, height: f.height } : null, dpi: Number(f?.dpi) || null }; });
      if (!variants.length) continue;
      const vp = (pf.variant_printfiles || []).find((x) => x.placements?.[placement]);
      const printfile = (pf.printfiles || []).find((x) => x.printfile_id === vp?.placements?.[placement]) || (pf.printfiles || [])[0];
      if (!printfile?.width || !printfile?.height) continue;
      out.push({ key, id: Number(id), title: p.product.title || p.product.model || key, image: p.product.image || null, currency: p.product.currency || 'USD',
        placement, placement_label: placements[placement] || placement, area: { width: printfile.width, height: printfile.height }, dpi: Number(printfile.dpi) || 150, variants,
        base_from: Math.min(...variants.map((v) => v.price).filter((n) => n > 0)) });
    } catch (e) { if (e?.status === 503) throw e; if (e?.transient) hiccup = true; /* a product Printful refuses is left out */ }
  }
  if (hiccup || !out.length) { failAt = Date.now(); return cache || out; }
  cache = out; cacheAt = Date.now(); failAt = 0;
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

/** Printful accepts PNG or JPG art and nothing else ("The image is in a format we do not accept. Use PNG or JPG.").
 *  The image library keeps a WebP or GIF exactly as it arrived (images.mjs never re-encodes), so a WebP picture
 *  uploads fine and the mockup is refused later, two steps from its cause (Geoffrey hit this live on the Aqua tee).
 *  The server converts, the maker does nothing (Setu, round 52): a WebP or GIF becomes a PNG, uploaded as the SAME
 *  maker's picture with the same alt, title and credit, and that new picture is the id Printful is handed — so the
 *  order later prints the PNG too. PNG and JPG art is returned untouched. Identical bytes never enter the library
 *  twice, so asking twice does not make two copies. */
const ART_OK = new Set(['png', 'jpg']);
export async function printableArt(member, it) {
  if (!it) fail(400, 'Pick one of your own pictures for the art.');
  if (ART_OK.has(it.ext)) return it.id;
  let buf;
  try {
    const sharp = (await import('sharp')).default;
    buf = await sharp(images.fileOf(it)).png().toBuffer();
  } catch (e) {
    if (e?.status) throw e; // an upload refusal keeps its own status and words
    fail(502, "Couldn't turn that picture into a PNG the print partner accepts. Try again, or upload the art as a PNG or JPG.");
  }
  if (!buf?.length || buf.subarray(0, 4).toString('hex') !== '89504e47') fail(502, "That picture couldn't be turned into a PNG.");
  const up = images.upload(member, { data: buf, alt: it.alt, title: it.title, credit: it.credit, made_by: it.maker?.kind || null, maker: it.maker?.name || null });
  return up.id;
}

export async function startMockup(member, { product, variant, art, scale, x, y, aspect } = {}, { publicUrl }) {
  if (!member) fail(401, 'Sign in to make a product.');
  const list = await products();
  const p = list.find((q) => q.key === product || q.id === Number(product)); if (!p) fail(400, 'Pick one of the products offered.');
  const v = p.variants.find((q) => q.id === Number(variant)) || p.variants[0];
  // Your own upload only (uploaded by you, or for you): a product carries the maker's rights, so no borrowing pictures.
  const it = images.get(art); if (!it) fail(400, 'Pick one of your own pictures for the art.');
  if (it.by !== member.id && it.for !== member.id) fail(403, 'Use art you uploaded yourself. A product is sold under your name, so the art has to be yours.');
  const artId = await printableArt(member, it); // WebP/GIF art becomes a PNG Printful accepts, as the maker's own picture
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

// ------------------------------------------------------------------ mockups for a merch set (merchsets.mjs)
// Geoffrey, 2026-11-23: one artwork, many products ("make the one image that's sitting there able to be applied to
// anything"). merchsets.mjs owns which products an artwork is on; these two calls are its only way to Printful. They use
// the same market-wide limiter as startMockup. The art check is the caller's: the art is the picture on the maker's own
// listing, which they attested they hold the rights to when they listed it.
/** Start one mockup. Returns Printful's task key, or null when this minute's quota is used (try again next tick). */
export async function queueMockup({ productId, variantId, placement, imageUrl, position }) {
  const now = Date.now(); while (recent.length && now - recent[0] > 60_000) recent.shift();
  if (recent.length >= PER_MINUTE()) return null;
  const r = await api(`/mockup-generator/create-task/${Number(productId)}`, { method: 'POST', body: { variant_ids: [Number(variantId)], format: 'jpg', files: [{ placement, image_url: imageUrl, position }] } });
  if (!r?.task_key) fail(502, "The print partner didn't start the mockup.");
  recent.push(now); return r.task_key;
}
/** Where a mockup task stands: pending, completed (with Printful's short-lived picture link) or failed. */
export async function taskResult(key, placement) {
  const r = await api(`/mockup-generator/task?task_key=${encodeURIComponent(key)}`);
  if (r?.status === 'failed') return { status: 'failed', error: String(r.error || 'the print partner could not make it').slice(0, 160) };
  if (r?.status !== 'completed') return { status: 'pending' };
  const m = (r.mockups || []).find((x) => x.placement === placement) || (r.mockups || [])[0];
  return m?.mockup_url ? { status: 'completed', url: m.mockup_url } : { status: 'failed', error: 'the print partner sent no picture' };
}
/** The last good product list without waiting on Printful (for rendering pages); [] until the first read. */
export const cachedProducts = () => cache || [];

// ------------------------------------------------------------------ templates: client-side positioning (maker panel)
// Printful's templates for a product "can be used for client-side positioning": a picture of the product with the exact
// print-area box on it. The maker drags the art on that in the browser, live, with no mockup call per move; the real
// Printful photo is made only when they ask for it (the mockup generator allows ~2 tasks a minute market-wide).
const tplCache = new Map(); // productId -> { at, value }
export async function template(productId, placement) {
  const id = Number(productId); const hit = tplCache.get(id);
  if (hit && Date.now() - hit.at < FRESH_MS) return pick(hit.value, placement);
  const r = await api(`/mockup-generator/templates/${id}`);
  const value = { min_dpi: Number(r?.min_dpi) || null, mapping: r?.variant_mapping || [], templates: (r?.templates || []).map((t) => ({
    id: t.template_id, image: t.image_url || null, background: t.background_url || null, background_color: t.background_color || null,
    width: Number(t.template_width) || 0, height: Number(t.template_height) || 0,
    area: { left: Number(t.print_area_left) || 0, top: Number(t.print_area_top) || 0, width: Number(t.print_area_width) || 0, height: Number(t.print_area_height) || 0 },
  })).filter((t) => t.width && t.height && t.area.width && t.area.height) };
  tplCache.set(id, { at: Date.now(), value });
  return pick(value, placement);
}
function pick(v, placement) {
  // Prefer the template the catalog maps to this placement; otherwise the first usable one.
  const ids = new Set(); for (const m of v.mapping || []) for (const t of m.templates || []) if (!placement || t.placement === placement) ids.add(t.template_id);
  const t = v.templates.find((x) => ids.has(x.id)) || v.templates[0] || null;
  return t ? { ...t, min_dpi: v.min_dpi } : null;
}

// Our pages only load images from our own address (Content Security Policy), so the panel can't show Printful's template
// picture straight from Printful's CDN. The server fetches ONLY the picture Printful's own template listing named for that
// product (never an address from the browser: no open proxy) and serves it from here, kept in memory for 6 hours.
const tplImg = new Map(); // `${productId}:${kind}` -> { at, buf, type }
export async function templateImage(productId, kind = 'image') {
  const id = Number(productId); const k = `${id}:${kind}`; const hit = tplImg.get(k);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit;
  const t = await template(id, null); const url = kind === 'background' ? t?.background : t?.image;
  if (!url || !/^https?:\/\//.test(url)) fail(404, 'No template picture for this product.');
  let r; try { r = await fetch(url, { signal: AbortSignal.timeout(20_000) }); } catch { transient(502, "Couldn't fetch the product picture. Try again in a minute."); }
  if (!r.ok) fail(502, `The product picture didn't load (${r.status}).`);
  const type = r.headers.get('content-type') || 'image/png'; if (!/^image\/(png|jpeg|webp|gif)/.test(type)) fail(502, 'The product picture is not an image.');
  const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 8 * 1024 * 1024) fail(502, 'The product picture is too large.');
  const v = { at: Date.now(), buf, type }; tplImg.set(k, v); return v;
}

/** Printful's own catalog photo of a product (the rail thumbnail before any real mockup exists). Same rules as the
 *  template picture: only the URL Printful's catalog gave us, fetched by the server, kept 6 hours. */
const catImg = new Map();
export async function productImage(productId) {
  const id = Number(productId); const hit = catImg.get(id); if (hit && Date.now() - hit.at < FRESH_MS) return hit;
  const p = (await products()).find((x) => x.id === id); const url = p?.image;
  if (!url || !/^https?:\/\//.test(url)) fail(404, 'No catalog picture for this product.');
  let r; try { r = await fetch(url, { signal: AbortSignal.timeout(20_000) }); } catch { transient(502, "Couldn't fetch the product picture."); }
  if (!r.ok) fail(502, `The product picture didn't load (${r.status}).`);
  const type = r.headers.get('content-type') || 'image/jpeg'; if (!/^image\/(png|jpeg|webp|gif)/.test(type)) fail(502, 'Not an image.');
  const buf = Buffer.from(await r.arrayBuffer()); if (buf.length > 8 * 1024 * 1024) fail(502, 'Too large.');
  const v = { at: Date.now(), buf, type }; catImg.set(id, v); return v;
}

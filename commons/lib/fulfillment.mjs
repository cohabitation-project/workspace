/**
 * fulfillment.mjs — the wiring for who makes and ships what a maker sells (Geoffrey, 2026-11-14: "drop shipping and
 * our publishing and our distribution... we have to wire that all in"). Pipes chosen in Ash's spec (c_mwgw6dj81v036621):
 *   merch  → Printful and Printify (print-on-demand: they print and ship each order; the artist designs in their tool)
 *   books  → Lulu Print API (prints and ships paperbacks; ebooks are downloads)
 *   music  → DistroKid (streaming services). DistroKid has NO public API, so a release is a tracked checklist that the
 *            label account holder works through by hand; nothing here pretends to automate it.
 * What is live today: the shapes. A maker can link a listing to a provider product; anyone can see each pipe's status.
 * What is NOT live: sending an order to a printer. That happens only after a paid order exists, which needs payments
 * open (checkout.mjs). The send functions are written and tested against a fake server, and refuse to run otherwise.
 * Accounts and keys: held by the cooperative, set by the operator in the server .env, never in git.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as store from './store.mjs';
import * as market from './market.mjs';
import { CommonsError } from './core.mjs';
import { paymentsOpen } from './checkout.mjs';

const fail = (s, m) => { throw new CommonsError(s, m); };
const env = (k) => (process.env[k] || '').trim();
let DIR = null;
const linksFile = () => path.join(DIR, 'links.json');
const releasesFile = () => path.join(DIR, 'releases.json');
let links = {}; let releases = {};
const save = (f, o) => { const t = f + '.tmp'; fs.writeFileSync(t, JSON.stringify(o, null, 1), { mode: 0o600 }); fs.renameSync(t, f); };

export const PIPES = {
  printful: { what: 'Merch: shirts, mugs, posters, prints', kind: 'merch', mode: 'api', keys: ['PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID'], base: () => env('PRINTFUL_API_URL') || 'https://api.printful.com' },
  printify: { what: 'Merch from 90+ print partners, cheapest base prices', kind: 'merch', mode: 'api', keys: ['PRINTIFY_TOKEN', 'PRINTIFY_SHOP_ID'], base: () => env('PRINTIFY_API_URL') || 'https://api.printify.com' },
  lulu: { what: 'Books: paperbacks printed and shipped per order', kind: 'books', mode: 'api', keys: ['LULU_CLIENT_KEY', 'LULU_CLIENT_SECRET'], base: () => env('LULU_API_URL') || (env('LULU_LIVE') === '1' ? 'https://api.lulu.com' : 'https://api.sandbox.lulu.com') },
  distrokid: { what: 'Music to Spotify, Apple Music and 150+ services', kind: 'music', mode: 'manual', keys: [] },
};

export function init(dataDir) {
  DIR = path.join(dataDir, 'fulfillment'); fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  try { links = JSON.parse(fs.readFileSync(linksFile(), 'utf8')) || {}; } catch { links = {}; }
  try { releases = JSON.parse(fs.readFileSync(releasesFile(), 'utf8')) || {}; } catch { releases = {}; }
  try { merch = JSON.parse(fs.readFileSync(merchFile(), 'utf8')) || {}; } catch { merch = {}; }
}

/** Which pipes are connected. Says only configured or not: never a key. */
export function status() {
  return Object.fromEntries(Object.entries(PIPES).map(([id, p]) => [id, {
    what: p.what, kind: p.kind, mode: p.mode,
    connected: p.mode === 'manual' ? null : p.keys.every((k) => !!env(k)),
    ...(id === 'lulu' ? { sandbox: env('LULU_LIVE') !== '1' } : {}),
    ...(p.mode === 'manual' ? { note: 'No public API: releases go through a tracked checklist by the label account holder.' } : {}),
  }]));
}

const ownerOf = (member, listingId) => {
  const l = market.get(listingId); if (!l) fail(404, 'no such listing');
  if (!member || l.by?.id !== member.id) fail(403, 'only the maker of this listing can connect it');
  return l;
};

/** A maker links their listing to the product they designed in a provider's own tool. */
export function link(member, listingId, { provider, product_id, variant_ids = [], sku = '' } = {}) {
  const l = ownerOf(member, listingId);
  const p = PIPES[provider]; if (!p || p.mode !== 'api') fail(400, `provider must be one of: ${Object.keys(PIPES).filter((k) => PIPES[k].mode === 'api').join(', ')}`);
  const id = String(product_id || '').trim().slice(0, 80); if (!/^[\w.-]{1,80}$/.test(id)) fail(400, "product_id: the product's id from the provider (letters, numbers, - . _)");
  const vids = (Array.isArray(variant_ids) ? variant_ids : []).map((v) => String(v).trim()).filter((v) => /^[\w.-]{1,80}$/.test(v)).slice(0, 100);
  links[l.id] = { provider, product_id: id, variant_ids: vids, sku: String(sku || '').slice(0, 120), by: member.id, ts: new Date().toISOString() };
  save(linksFile(), links); return { listing: l.id, ...links[l.id], connected: status()[provider].connected };
}
// ------------------------------------------------------------------------------------------ art on products
// Geoffrey, 2026-11-21: "if somebody wants to make a t-shirt design or a coffee cup or just list their art, then have
// a list of what it can be put onto. Not just a simple form." A maker picks products in the feed composer, sees their
// own art on each, and sets each price. The choices are kept here with the listing; the cooperative's print partner
// (Printful or Printify) makes and ships each order once payments are open. Nothing is printed or sent before that,
// and no base cost is invented here: the maker sets the price.
export const MERCH = {
  tshirt: { name: 'T-shirt', area: [0.33, 0.27, 0.34, 0.36] },
  hoodie: { name: 'Hoodie', area: [0.34, 0.33, 0.32, 0.3] },
  mug: { name: 'Mug', area: [0.24, 0.3, 0.38, 0.42] },
  poster: { name: 'Poster', area: [0.2, 0.12, 0.6, 0.76] },
  canvas: { name: 'Canvas print', area: [0.16, 0.16, 0.68, 0.68] },
  tote: { name: 'Tote bag', area: [0.3, 0.42, 0.4, 0.4] },
  sticker: { name: 'Sticker', area: [0.22, 0.22, 0.56, 0.56] },
  phonecase: { name: 'Phone case', area: [0.33, 0.12, 0.34, 0.76] },
};
/** Simple product outlines (our own drawing, 100x100) the maker's art is previewed on. */
export const MERCH_SHAPE = {
  tshirt: '<path d="M30 8 18 14 6 28l11 9 6-6v61h54V31l6 6 11-9-12-14-12-6c-3 7-10 11-18 11S33 15 30 8z"/>',
  hoodie: '<path d="M34 6c4-3 28-3 32 0l4 9 12 7 12 20-10 6-5-8v62H21V40l-5 8-10-6 12-20 12-7z"/><path d="M38 8c2 9 22 9 24 0" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="2"/>',
  mug: '<rect x="14" y="20" width="56" height="66" rx="6"/><path d="M70 34h8a11 11 0 0 1 0 22h-8v-8h7a3 3 0 0 0 0-6h-7z"/>',
  poster: '<rect x="16" y="8" width="68" height="84" rx="2"/>',
  canvas: '<rect x="12" y="12" width="76" height="76" rx="2"/><path d="M12 12l6 6v64l-6 6" fill="rgba(0,0,0,.12)"/>',
  tote: '<path d="M38 30v-8a12 12 0 0 1 24 0v8h-5v-8a7 7 0 0 0-14 0v8z"/><rect x="22" y="30" width="56" height="62" rx="3"/>',
  sticker: '<circle cx="50" cy="50" r="38"/>',
  phonecase: '<rect x="30" y="8" width="40" height="84" rx="9"/>',
};
let merch = {};
const merchFile = () => path.join(DIR, 'merch.json');
/** Check a maker's product choices without writing anything (lib/sellpost.mjs checks before it publishes). */
export function checkMerch({ art, products } = {}, imageIds = []) {
  const a = String(art || ''); if (!a || !imageIds.includes(a)) fail(400, 'merch: choose which of your post\'s photos is the art to print');
  const list = Array.isArray(products) ? products : [];
  if (!list.length || list.length > Object.keys(MERCH).length) fail(400, `merch: choose one to ${Object.keys(MERCH).length} products`);
  const seen = new Set();
  return { art: a, products: list.map((x, i) => {
    const kind = String(x?.kind || ''); if (!MERCH[kind]) fail(400, `merch product ${i + 1}: one of ${Object.keys(MERCH).join(', ')}`);
    if (seen.has(kind)) fail(400, `merch: ${MERCH[kind].name} is chosen twice`); seen.add(kind);
    const price = Math.round(Number(x?.price) * 100) / 100; if (!Number.isFinite(price) || price < 1 || price > 100000) fail(400, `merch: ${MERCH[kind].name} needs a price from $1 to $100000`);
    return { kind, name: MERCH[kind].name, price };
  }) };
}
export function setMerch(member, listingId, choice) {
  const l = ownerOf(member, listingId);
  const m = checkMerch(choice, (l.images || []).map((i) => i.id || i));
  merch[l.id] = { ...m, by: member.id, ts: new Date().toISOString(), status: 'requested' };
  save(merchFile(), merch); return { listing: l.id, ...merch[l.id] };
}
export const merchFor = (listingId) => merch[listingId] || null;

export function unlink(member, listingId) { const l = ownerOf(member, listingId); delete links[l.id]; save(linksFile(), links); return { listing: l.id, linked: false }; }
export const linkFor = (listingId) => links[listingId] || null;

/** What would be sent to the printer for a paid order, without sending it. */
export function plan(order) {
  const lk = links[order.listing]; if (!lk) return { provider: null, why: 'this listing has no print or fulfillment link: the maker ships it' };
  const p = PIPES[lk.provider];
  const req = lk.provider === 'printful'
    ? { method: 'POST', url: `${p.base()}/orders`, body: { external_id: order.id, recipient: order.ship_to, items: [{ sync_variant_id: Number(lk.variant_ids[0]) || lk.variant_ids[0], quantity: order.quantity || 1 }] } }
    : lk.provider === 'printify'
      ? { method: 'POST', url: `${p.base()}/v1/shops/${env('PRINTIFY_SHOP_ID') || '<shop>'}/orders.json`, body: { external_id: order.id, line_items: [{ product_id: lk.product_id, variant_id: Number(lk.variant_ids[0]) || lk.variant_ids[0], quantity: order.quantity || 1 }], address_to: order.ship_to } }
      : { method: 'POST', url: `${p.base()}/print-jobs/`, body: { external_id: order.id, line_items: [{ external_id: lk.product_id, title: order.title, printable_normalization: { pod_package_id: lk.sku }, quantity: order.quantity || 1 }], shipping_address: order.ship_to, shipping_level: 'MAIL' } };
  return { provider: lk.provider, request: req };
}

/** Send a PAID order to its printer. Refuses unless payments are open, the order is paid and the pipe is connected. */
export async function send(order, { fetchImpl = fetch } = {}) {
  if (!paymentsOpen()) fail(503, "Payments aren't open yet, so no order goes to a printer.");
  if (order?.status !== 'paid') fail(409, 'only a paid order goes to the printer');
  const pl = plan(order); if (!pl.provider) fail(409, pl.why);
  if (!status()[pl.provider].connected) fail(503, `${pl.provider} isn't connected yet`);
  const headers = { 'content-type': 'application/json' };
  if (pl.provider === 'printful') { headers.authorization = `Bearer ${env('PRINTFUL_TOKEN')}`; headers['X-PF-Store-Id'] = env('PRINTFUL_STORE_ID'); }
  if (pl.provider === 'printify') headers.authorization = `Bearer ${env('PRINTIFY_TOKEN')}`;
  if (pl.provider === 'lulu') headers.authorization = `Bearer ${await luluToken(fetchImpl)}`;
  const r = await fetchImpl(pl.request.url, { method: 'POST', headers, body: JSON.stringify(pl.request.body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) fail(502, `${pl.provider} refused the order (${r.status})`);
  return { provider: pl.provider, provider_order: j.result?.id || j.id || null };
}
async function luluToken(fetchImpl) {
  const base = PIPES.lulu.base();
  const r = await fetchImpl(`${base}/auth/realms/glasstree/protocol/openid-connect/token`, { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: 'Basic ' + Buffer.from(`${env('LULU_CLIENT_KEY')}:${env('LULU_CLIENT_SECRET')}`).toString('base64') }, body: 'grant_type=client_credentials' });
  const j = await r.json().catch(() => ({})); if (!r.ok || !j.access_token) fail(502, 'Lulu sign-in failed'); return j.access_token;
}

// ---------------------------------------------------------------- music releases (DistroKid, by hand)
export const RELEASE_STEPS = [
  ['files', 'Final audio (WAV) and cover art (3000×3000) ready'],
  ['rights', 'Every writer and performer has agreed in writing; splits written down'],
  ['pro', 'Songwriters registered with a performing rights organization (ASCAP or BMI)'],
  ['mlc', 'Songs registered with The MLC (mechanical royalties)'],
  ['upload', 'Uploaded through the cooperative label DistroKid account, with a release date'],
  ['legacy', '"Leave a Legacy" bought for the release, so it stays up if the account ever lapses'],
  ['live', 'Live on the streaming services; links added to the listing'],
];
export function release(listingId) { const r = releases[listingId] || {}; return { listing: listingId, steps: RELEASE_STEPS.map(([k, t]) => ({ step: k, what: t, done: !!r[k], when: r[k] || null })) }; }
export function markRelease(member, listingId, step, done = true) {
  const l = ownerOf(member, listingId);
  if (l.category !== 'music') fail(400, 'release steps are for music listings');
  if (!RELEASE_STEPS.some(([k]) => k === step)) fail(400, `step must be one of: ${RELEASE_STEPS.map(([k]) => k).join(', ')}`);
  releases[l.id] = { ...(releases[l.id] || {}) }; if (done) releases[l.id][step] = new Date().toISOString(); else delete releases[l.id][step];
  save(releasesFile(), releases); return release(l.id);
}

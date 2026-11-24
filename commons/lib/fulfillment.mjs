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
import * as images from './images.mjs';

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
export function link(member, listingId, { provider, product_id, variant_ids = [], sku = '', design = null } = {}) {
  const l = ownerOf(member, listingId);
  const p = PIPES[provider]; if (!p || p.mode !== 'api') fail(400, `provider must be one of: ${Object.keys(PIPES).filter((k) => PIPES[k].mode === 'api').join(', ')}`);
  const id = String(product_id || '').trim().slice(0, 80); if (!/^[\w.-]{1,80}$/.test(id)) fail(400, "product_id: the product's id from the provider (letters, numbers, - . _)");
  const vids = (Array.isArray(variant_ids) ? variant_ids : []).map((v) => String(v).trim()).filter((v) => /^[\w.-]{1,80}$/.test(v)).slice(0, 100);
  // A print order can't be placed without these, and silently dropping the field is worse than saying no here:
  // Printful and Printify address the exact variant; Lulu the exact print package (see plan() and each provider's docs).
  if ((provider === 'printful' || provider === 'printify') && !vids.length) {
    fail(400, `${provider} needs at least one variant id: the variant you sell, from the product you made in their tool`);
  }
  const pkg = String(sku || '').trim().slice(0, 120);
  if (provider === 'lulu' && !pkg) fail(400, 'lulu needs the print package id (its sku) of the book you made');
  // design: where the maker's art sits on the product (set by printful.mjs from a finished mockup), needed to print it later
  // Defect 3 (PR #291): a design is kept only when its art is a picture this member owns (they uploaded it, or another
  // member gave it to them). Another member's picture, or an unknown id, means the link is made without a design: we
  // never hand the printer an address we have no right to print. NOT images.ownedBy(): that one deliberately allows any
  // library picture that isn't "uploaded for" someone else and isn't another member's portrait, so it is a
  // may-I-wear-this check, not an ownership check.
  const artId = design && typeof design === 'object' ? String(design.art || '').trim().slice(0, 40) : '';
  const art = artId ? images.get(artId) : null;
  const ownsArt = !!art && (art.by === member.id || art.for === member.id);
  const d = design && typeof design === 'object' && ownsArt ? { placement: String(design.placement || '').slice(0, 40), art: artId, position: design.position && typeof design.position === 'object' ? Object.fromEntries(['area_width', 'area_height', 'width', 'height', 'top', 'left'].map((k) => [k, Math.round(Number(design.position[k]) || 0)])) : null, base_price: Number(design.base_price) || null } : null;
  links[l.id] = { provider, product_id: id, variant_ids: vids, sku: pkg, ...(d ? { design: d } : {}), by: member.id, ts: new Date().toISOString() };
  save(linksFile(), links); return { listing: l.id, ...links[l.id], connected: status()[provider].connected };
}
export function unlink(member, listingId) { const l = ownerOf(member, listingId); delete links[l.id]; save(linksFile(), links); return { listing: l.id, linked: false }; }
export const linkFor = (listingId) => links[listingId] || null;

const txt = (v) => (v == null ? '' : String(v).trim().slice(0, 200));
/** The address a printer is sent, in that printer's own shape. checkout stores Stripe's shape:
 *  { name, address: { line1, line2, city, state, postal_code, country } }; each printer names those fields differently
 *  and refuses one in another's names. Nothing is invented here: no email, no phone. */
const addressOf = (ship_to) => {
  if (!ship_to || typeof ship_to !== 'object') return null;
  const a = ship_to.address && typeof ship_to.address === 'object' ? ship_to.address : ship_to;
  return String(a.line1 || '').trim() ? a : null;
};
export const hasAddress = (ship_to) => !!addressOf(ship_to);
export function recipientFor(provider, ship_to) {
  // undefined, not null: JSON.stringify then drops the key, so a plan with no address carries no address key at all
  // (the fact fulfillment-plan-providers case 7 pins). null would post "address_to": null to a printer. send() refuses
  // a no-address order on its own, with hasAddress.
  const a = addressOf(ship_to); if (!a) return undefined;
  const name = txt(ship_to.name);
  const city = txt(a.city), postal = txt(a.postal_code), state = txt(a.state), country = txt(a.country);
  if (provider === 'printful') return { name, address1: txt(a.line1), address2: txt(a.line2), city, state_code: state, country_code: country, zip: postal };
  if (provider === 'printify') {
    const i = name.lastIndexOf(' ');
    return { first_name: i > 0 ? name.slice(0, i) : name, last_name: i > 0 ? name.slice(i + 1) : '', address1: txt(a.line1), address2: txt(a.line2), city, region: state, country, zip: postal };
  }
  if (provider === 'lulu') return { name, street1: txt(a.line1), street2: txt(a.line2), city, state_code: state, country_code: country, postcode: postal };
  return undefined;
}

/** What would be sent to the printer for a paid order, without sending it. */
export function plan(order) {
  const lk = links[order.listing]; if (!lk) return { provider: null, why: 'this listing has no print or fulfillment link: the maker ships it' };
  const p = PIPES[lk.provider];
  const req = lk.provider === 'printful'
    // Two honest cases, one per Printful order shape (https://developers.printful.com/docs/ — order items take either):
    //  - the maker designed it HERE (PR #291: a design with their own art): the item is the catalog `variant_id` plus
    //    the design's file, printed on the fly — a store variant id would print nothing;
    //  - the maker made the product in Printful's own tool and pasted its id (no design here): the item is that store
    //    product's `sync_variant_id`, whose art Printful already holds (round 42, DeepSeek).
    // Merged 2026-11-23 by Setu when #291 met round 42; both tests hold.
    ? { method: 'POST', url: `${p.base()}/orders`, body: { external_id: order.id, recipient: recipientFor('printful', order.ship_to), items: [
      lk.design?.art && lk.design.placement
        ? { variant_id: Number(lk.variant_ids[0]) || lk.variant_ids[0], quantity: order.quantity || 1,
          files: [{ type: lk.design.placement, url: `${env('COMMONS_PUBLIC_URL') || 'https://cohabi.org'}/images/${lk.design.art}`, ...(lk.design.position ? { position: lk.design.position } : {}) }] }
        : { sync_variant_id: Number(lk.variant_ids[0]) || lk.variant_ids[0], quantity: order.quantity || 1 },
    ] } }
    : lk.provider === 'printify'
      ? { method: 'POST', url: `${p.base()}/v1/shops/${env('PRINTIFY_SHOP_ID') || '<shop>'}/orders.json`, body: { external_id: order.id, line_items: [{ product_id: lk.product_id, variant_id: Number(lk.variant_ids[0]) || lk.variant_ids[0], quantity: order.quantity || 1 }], address_to: recipientFor('printify', order.ship_to) } }
      : { method: 'POST', url: `${p.base()}/print-jobs/`, body: { external_id: order.id, line_items: [{ external_id: lk.product_id, title: order.title, printable_normalization: { pod_package_id: lk.sku }, quantity: order.quantity || 1 }], shipping_address: recipientFor('lulu', order.ship_to), shipping_level: 'MAIL' } };
  return { provider: lk.provider, request: req };
}

/** Send a PAID order to its printer. Refuses unless payments are open, the order is paid and the pipe is connected. */
export async function send(order, { fetchImpl = fetch } = {}) {
  if (!paymentsOpen()) fail(503, "Payments aren't open yet, so no order goes to a printer.");
  if (order?.status !== 'paid') fail(409, 'only a paid order goes to the printer');
  const pl = plan(order); if (!pl.provider) fail(409, pl.why);
  // An order with no shipping address stops HERE: after plan() has said which printer it is, or that the maker ships
  // it, and before any provider fetch (Lulu's sign-in is a fetch too). Nothing is invented; no printer gets a blank address.
  if (!hasAddress(order?.ship_to)) fail(409, 'this order has no shipping address');
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

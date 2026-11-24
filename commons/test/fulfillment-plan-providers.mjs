// fulfillment-plan-providers.mjs — what plan() would put on the wire for Printify and Lulu.
// Round 40, DeepSeek's marketplace job (Setu, 2026-11-23). Only Printful had been checked against its docs (#291).
// `plan(order)` in commons/lib/fulfillment.mjs builds the request for the linked provider without sending it; this file
// asserts exactly what it builds today (method, URL, every body field), against the two providers' own docs:
//   Printify: https://developers.printify.com/#create-an-order   (POST /v1/shops/{shop_id}/orders.json)
//   Lulu:     https://api.lulu.com/docs/  (spec: https://api.lulu.com/api-docs/openapi-specs/openapi_public.yml)
// Every field a doc requires that plan() does not send is a `test.todo` naming the field and the doc — nothing here
// patches commons/lib. No server, no network, no real key: plan() is pure, and that is asserted too.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Start from "nothing configured" (a plain delete at the top is safe: no case below depends on a case above).
for (const k of ['COMMONS_PAYMENTS', 'STRIPE_SECRET_KEY', 'STRIPE_RESTRICTED_KEY',
  'PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID', 'PRINTFUL_API_URL',
  'PRINTIFY_TOKEN', 'PRINTIFY_SHOP_ID', 'PRINTIFY_API_URL',
  'LULU_CLIENT_KEY', 'LULU_CLIENT_SECRET', 'LULU_API_URL', 'LULU_LIVE']) delete process.env[k];

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'ful-plan-'));
const store = await import('../lib/store.mjs'); store.init(D);
const market = await import('../lib/market.mjs'); market.init(D);
const ful = await import('../lib/fulfillment.mjs'); ful.init(D);

test.after(() => fs.rmSync(D, { recursive: true, force: true }));

const mk = (id, name) => { const m = { id, kind: 'human', name, created: new Date().toISOString() }; store.addMember?.(m) ?? store.putMember?.(m); return store.getMember(id) || m; };
const maker = mk('h_plan_maker', 'Inkwell Maker');

const listIt = (title, category = 'art') => market.create(maker, {
  title, text: 'A thing I made.', category, type: 'product',
  price: { mode: 'fixed', amount: 25 }, license: 'all-rights', rights: true,
});

// One listing per provider: link() stores one link per listing, so each pipe gets its own.
const prListing = listIt('Printify poster');
const luListing = listIt('Lulu paperback', 'writing');
const prLink = ful.link(maker, prListing.id, { provider: 'printify', product_id: '60f1a2b3c4d5e6f708192a3b', variant_ids: ['4012'] });
const luLink = ful.link(maker, luListing.id, { provider: 'lulu', product_id: 'item_9b2c', variant_ids: [], sku: '0600X0900.BW.STD.PB.060UW444.MXX' });

// A paid order as the rest of the code would hand it over. ship_to is spelled the way a provider-neutral address
// should be; note (see the "no shipping address exists yet" case below) that nothing in commons/lib builds this field.
const addr = { name: 'Ada Buyer', address: { line1: '1 Long Street', city: 'Tucson', state: 'AZ', postal_code: '85701', country: 'US' } };
const order = (listing, over = {}) => ({ id: 'ord_plan_1', listing, title: 'Printify poster', status: 'paid', quantity: 2, ship_to: { ...addr }, ...over });
const wire = (pl) => JSON.parse(JSON.stringify(pl.request.body)); // what JSON.stringify actually puts on the wire

test('the fixture is honest: both listings are linked, no pipe has a key, and plan() sends nothing by itself', () => {
  assert.equal(ful.linkFor(prListing.id).provider, 'printify');
  assert.equal(ful.linkFor(luListing.id).provider, 'lulu');
  const s = ful.status();
  assert.equal(s.printify.connected, false);
  assert.equal(s.lulu.connected, false);
  // plan() must never call the network: no provider is contacted to work out a plan.
  const realFetch = globalThis.fetch; let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('plan() must not fetch'); };
  try {
    ful.plan(order(prListing.id)); ful.plan(order(luListing.id)); ful.plan(order('no_such_listing'));
  } finally { globalThis.fetch = realFetch; }
  assert.equal(calls, 0, 'plan() must not call fetch');
});

test('printify: POST to /v1/shops/{shop}/orders.json with line_items and address_to', () => {
  Object.assign(process.env, { PRINTIFY_API_URL: 'https://printify.invalid', PRINTIFY_SHOP_ID: '1234567' });
  try {
    const pl = ful.plan(order(prListing.id));
    assert.equal(pl.provider, 'printify');
    assert.equal(pl.request.method, 'POST');
    assert.equal(pl.request.url, 'https://printify.invalid/v1/shops/1234567/orders.json');
    const b = wire(pl);
    assert.deepEqual(Object.keys(b).sort(), ['address_to', 'external_id', 'line_items']);
    assert.equal(b.external_id, 'ord_plan_1', 'external_id is accepted by Printify and read back on the order');
    assert.equal(b.line_items.length, 1);
    assert.deepEqual(Object.keys(b.line_items[0]).sort(), ['product_id', 'quantity', 'variant_id']);
    assert.equal(b.line_items[0].product_id, '60f1a2b3c4d5e6f708192a3b');
    assert.equal(b.line_items[0].variant_id, 4012, 'a numeric variant id is sent as a number');
    assert.equal(b.line_items[0].quantity, 2);
    assert.deepEqual(b.address_to, { first_name: 'Ada', last_name: 'Buyer', address1: '1 Long Street', address2: '', city: 'Tucson', region: 'AZ', country: 'US', zip: '85701' }, "the stored Stripe address is translated into Printify's own field names");
  } finally { delete process.env.PRINTIFY_API_URL; delete process.env.PRINTIFY_SHOP_ID; }
});

test('printify: without PRINTIFY_SHOP_ID the URL keeps a visible <shop> placeholder (no silent wrong shop)', () => {
  const pl = ful.plan(order(prListing.id));
  assert.equal(pl.request.url, 'https://api.printify.com/v1/shops/<shop>/orders.json');
});

test('lulu: POST to /print-jobs/ on the sandbox by default, with the fields plan() sends today', () => {
  Object.assign(process.env, { LULU_API_URL: 'https://lulu.invalid' });
  try {
    const pl = ful.plan(order(luListing.id, { title: 'A Small Book' }));
    assert.equal(pl.provider, 'lulu');
    assert.equal(pl.request.method, 'POST');
    assert.equal(pl.request.url, 'https://lulu.invalid/print-jobs/');
    const b = wire(pl);
    assert.deepEqual(Object.keys(b).sort(), ['external_id', 'line_items', 'shipping_address', 'shipping_level']);
    assert.equal(b.external_id, 'ord_plan_1');
    assert.equal(b.shipping_level, 'MAIL', 'a valid Lulu shipping level');
    assert.deepEqual(b.shipping_address, { name: 'Ada Buyer', street1: '1 Long Street', street2: '', city: 'Tucson', state_code: 'AZ', country_code: 'US', postcode: '85701' });
    assert.equal(b.line_items.length, 1);
    assert.deepEqual(Object.keys(b.line_items[0]).sort(), ['external_id', 'printable_normalization', 'quantity', 'title']);
    assert.equal(b.line_items[0].external_id, luLink.product_id, 'the provider item id, not the listing id');
    assert.equal(b.line_items[0].title, 'A Small Book');
    assert.equal(b.line_items[0].quantity, 2);
    assert.deepEqual(b.line_items[0].printable_normalization, { pod_package_id: '0600X0900.BW.STD.PB.060UW444.MXX' });
  } finally { delete process.env.LULU_API_URL; }
});

test('lulu: with no LULU_LIVE=1 the default base is the sandbox, never the live API', () => {
  const pl = ful.plan(order(luListing.id));
  assert.equal(pl.request.url, 'https://api.sandbox.lulu.com/print-jobs/');
  assert.equal(ful.status().lulu.sandbox, true);
});

test('no key or secret reaches a plan: a configured token is not in the request body', () => {
  Object.assign(process.env, { PRINTIFY_TOKEN: 'not-a-real-token', LULU_CLIENT_KEY: 'not-a-real-key', LULU_CLIENT_SECRET: 'not-a-real-secret' });
  try {
    const text = JSON.stringify([ful.plan(order(prListing.id)), ful.plan(order(luListing.id))]);
    assert.equal(/not-a-real/.test(text), false, 'plan() is buyer-visible: no token, key or secret in it');
  } finally { delete process.env.PRINTIFY_TOKEN; delete process.env.LULU_CLIENT_KEY; delete process.env.LULU_CLIENT_SECRET; }
});

// The strongest measured fact in this file: `order.ship_to` has no producer. checkout.mjs:162 builds the order
// ({ id, listing, title, buyer, seller, amount, currency, fee_cents, mode, status, ts }) with no shipping address, and
// no other file in commons/lib sets ship_to (grep, 2026-11-23). So for a real order today JSON.stringify drops the
// address key entirely and the provider is asked to ship to nobody.
test('measured: an order with no ship_to produces a body with no address key at all', () => {
  const pr = wire(ful.plan(order(prListing.id, { ship_to: undefined })));
  assert.equal('address_to' in pr, false, 'JSON.stringify drops undefined: Printify gets no address_to');
  const lu = wire(ful.plan(order(luListing.id, { ship_to: undefined })));
  assert.equal('shipping_address' in lu, false, 'Lulu gets no shipping_address');
});

// ---- Fields the providers' docs require and plan() does not send. Not fixed here: this job is a test only. ----
test.todo('lulu: send contact_email — required on a Print-Job (required: line_items, shipping_address, contact_email, shipping_level; https://api.lulu.com/docs/, POST /print-jobs/)');
test.todo('lulu: send line_items[].printable_normalization.cover.source_url — "Interior and cover files have to be specified with a URL from which Lulu can download the files" (https://api.lulu.com/docs/, File Handling and Normalization)');
test.todo('lulu: send line_items[].printable_normalization.interior.source_url — same doc section; today only pod_package_id is sent, so Lulu has no file to print');
test.todo('lulu: map the address to Lulu shipping_address keys name, street1, city, country_code, postcode, phone_number, email (required per https://api.lulu.com/docs/); plan() forwards order.ship_to unchanged and nothing guarantees those keys');
test.todo('printify: map the address to address_to keys first_name, last_name, email, phone, country, region, address1, address2, city, zip (required per https://developers.printify.com/#create-an-order); plan() forwards order.ship_to unchanged and nothing guarantees those keys');
test.todo('both: give an order a real shipping address — no code in commons/lib sets order.ship_to today (checkout.mjs:162), so every provider request is missing its recipient');

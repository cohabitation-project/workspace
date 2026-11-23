// fulfillment-plan-providers.mjs — what a PAID order would send to a print provider, field by field (Round 41,
// DeepSeek, 2026-11-23). Test only: nothing in commons/lib is changed. Everything asserted here is read from
// commons/lib/fulfillment.mjs as it stands on main; the three test.todo lines at the end are fields the Lulu
// branch does NOT send today, named so they can't be forgotten.
//
// What plan() is for: it builds the request without sending it. send() is what talks to a printer, and it refuses
// unless payments are open, the order is paid and the pipe is connected (covered in fulfillment-send-refusals.mjs).
// This file is about the request body, so it never opens a socket.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'ful-plan-'));

// A stable base so the URL can be asserted exactly, and a token that must never appear in a plan.
process.env.PRINTIFY_API_URL = 'http://printify.test';
process.env.PRINTIFY_SHOP_ID = 'shop-42';
process.env.PRINTIFY_TOKEN = 'printify-token-do-not-leak';
process.env.LULU_API_URL = 'http://lulu.test';
delete process.env.PRINTFUL_TOKEN; delete process.env.PRINTFUL_STORE_ID;
delete process.env.LULU_CLIENT_KEY; delete process.env.LULU_CLIENT_SECRET;

const store = await import('../lib/store.mjs'); store.init(D);
const market = await import('../lib/market.mjs'); market.init(D);
const ful = await import('../lib/fulfillment.mjs'); ful.init(D);

const mk = (id, name) => { const m = { id, kind: 'human', name, created: new Date().toISOString() }; store.addMember?.(m) ?? store.putMember?.(m); return store.getMember(id) || m; };
const maker = mk('h_print_maker', 'Print Maker');

const listIt = (title) => market.create(maker, { title, text: 'Made to order.', category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 }, license: 'all-rights', rights: true });

// The shape the checkout side hands over: an order record plus the buyer's address, untouched by plan().
const SHIP = { first_name: 'Ana', last_name: 'Buyer', email: 'ana@example.com', phone: '555-0100', country: 'US', region: 'AZ', address1: '1 Main St', address2: '', city: 'Tucson', zip: '85701' };
const orderFor = (listing, extra = {}) => ({ id: 'ord_plan_1', listing, status: 'paid', quantity: 2, title: 'Desert tee', ship_to: SHIP, ...extra });

test('a maker links their listing to a Printify product; the pipe reports connected', () => {
  const l = listIt('Printify tee');
  const link = ful.link(maker, l.id, { provider: 'printify', product_id: 'prod-9', variant_ids: ['12345'], sku: 'SKU-1' });
  assert.equal(link.provider, 'printify');
  assert.equal(link.product_id, 'prod-9');
  assert.equal(link.connected, true, 'PRINTIFY_TOKEN and PRINTIFY_SHOP_ID are both set in this test');
  assert.equal(ful.linkFor(l.id).variant_ids[0], '12345');
});

test('plan() for a Printify listing: POST to /v1/shops/<shop>/orders.json', () => {
  const l = listIt('Printify mug');
  ful.link(maker, l.id, { provider: 'printify', product_id: 'prod-77', variant_ids: ['987'], sku: '' });
  const pl = ful.plan(orderFor(l.id));
  assert.equal(pl.provider, 'printify');
  assert.equal(pl.request.method, 'POST');
  assert.equal(pl.request.url, 'http://printify.test/v1/shops/shop-42/orders.json');
  assert.equal(pl.request.body.external_id, 'ord_plan_1', 'our order id goes out as external_id');
});

test('plan() body sends exactly these fields today: external_id, line_items, address_to', () => {
  const l = listIt('Printify poster');
  ful.link(maker, l.id, { provider: 'printify', product_id: 'prod-5', variant_ids: ['4321'], sku: '' });
  const body = ful.plan(orderFor(l.id)).request.body;
  assert.deepEqual(Object.keys(body).sort(), ['address_to', 'external_id', 'line_items']);
  assert.equal(body.line_items.length, 1);
  assert.deepEqual(Object.keys(body.line_items[0]).sort(), ['product_id', 'quantity', 'variant_id']);
  assert.equal(body.line_items[0].product_id, 'prod-5');
  assert.equal(body.line_items[0].variant_id, 4321, 'a numeric variant id is sent as a number');
  assert.equal(body.line_items[0].quantity, 2, 'the order quantity is carried through');
  assert.deepEqual(body.address_to, SHIP, 'the buyer address is passed through untouched');
});

test('a plan carries no token, key, env name or raw JSON', () => {
  const l = listIt('Printify hoodie');
  ful.link(maker, l.id, { provider: 'printify', product_id: 'prod-6', variant_ids: ['1'], sku: '' });
  const text = JSON.stringify(ful.plan(orderFor(l.id)));
  for (const leak of ['printify-token-do-not-leak', 'PRINTIFY_TOKEN', 'PRINTIFY_SHOP_ID']) assert.ok(!text.includes(leak), `plan must not include ${leak}`);
});

test('an unlinked listing plans no request at all: the maker ships it', () => {
  const l = listIt('Maker ships this one');
  const pl = ful.plan(orderFor(l.id));
  assert.equal(pl.provider, null);
  assert.equal(pl.request, undefined);
  assert.match(pl.why, /maker ships it/);
});

test('with PRINTIFY_API_URL unset the base is api.printify.com', () => {
  const l = listIt('Printify default base');
  ful.link(maker, l.id, { provider: 'printify', product_id: 'prod-8', variant_ids: ['5'], sku: '' });
  const keep = process.env.PRINTIFY_API_URL; delete process.env.PRINTIFY_API_URL;
  try { assert.equal(ful.plan(orderFor(l.id)).request.url, 'https://api.printify.com/v1/shops/shop-42/orders.json'); }
  finally { process.env.PRINTIFY_API_URL = keep; }
});

// FINDING, asserted as today's behaviour rather than left to chance: Printify's own docs require variant_id on every
// line item, but a link saved without variant_ids sends the line item with no variant_id key at all
// (Number(undefined) || undefined). That is a defect in link()/plan() for that case, not in this test; it is recorded
// in teams/build/outputs/round41-deepseek-plan-providers.md and left for a job that may touch the lib.
test('finding: a Printify link with no variant_ids plans a line item with no variant_id', () => {
  const l = listIt('Printify no variants');
  ful.link(maker, l.id, { provider: 'printify', product_id: 'prod-0', variant_ids: [], sku: '' });
  const item = ful.plan(orderFor(l.id)).request.body.line_items[0];
  assert.equal(item.variant_id, undefined);
  assert.deepEqual(Object.keys(item).sort(), ['product_id', 'quantity', 'variant_id'], 'the key is always built, with an undefined value');
  assert.equal(JSON.stringify(item), '{"product_id":"prod-0","quantity":2}', 'so on the wire the line item has no variant_id at all');
});

test('plan() for a Lulu listing sends the three fields the job list said were missing, plus title and quantity', () => {
  const l = listIt('Paperback');
  ful.link(maker, l.id, { provider: 'lulu', product_id: 'print-job-src', variant_ids: [], sku: '0608344' });
  const pl = ful.plan(orderFor(l.id));
  assert.equal(pl.provider, 'lulu');
  assert.equal(pl.request.method, 'POST');
  assert.equal(pl.request.url, 'http://lulu.test/print-jobs/');
  const body = pl.request.body;
  assert.equal(body.line_items[0].printable_normalization.pod_package_id, '0608344', 'pod_package_id comes from the saved sku');
  assert.deepEqual(body.shipping_address, SHIP);
  assert.equal(body.shipping_level, 'MAIL');
  assert.equal(body.external_id, 'ord_plan_1');
  assert.equal(body.line_items[0].title, 'Desert tee');
  assert.equal(body.line_items[0].quantity, 2);
});

// These three are NOT sent by the Lulu branch of plan() on main (commons/lib/fulfillment.mjs, the last branch).
// A real Lulu print job needs them; the job that fixes it should turn each todo into an assertion.
test.todo('Lulu plan() sends contact_email (a print job has no buyer address without it)');
test.todo('Lulu plan() sends line_items[].printable_normalization.cover.source_url');
test.todo('Lulu plan() sends line_items[].printable_normalization.interior.source_url');

test.after(() => fs.rmSync(D, { recursive: true, force: true }));

// fulfillment-send-refusals.mjs — a printer is only called once, and only when every gate is open.
// Round 39, DeepSeek's marketplace job (Setu, 2026-11-23). commons/lib/fulfillment.mjs:82 `send(order, { fetchImpl })`
// refuses in four situations that must never reach a provider:
//   (a) the listing has no fulfillment link  -> the maker ships it; there is nothing to send
//   (b) the order is not paid               -> printers are paid up front, never on a promise
//   (c) payments are closed                 -> no paid order can exist yet
//   (d) the linked pipe has no key          -> the cooperative's account isn't connected
// In all four the fake fetch must be called 0 times. A fifth case is the control: with every gate open the same fake
// fetch is called exactly once, so "0 calls" above means "refused", not "the harness was dead".
// No server, no network, no real provider: fetchImpl is always ours, and no key here is real.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Start from "nothing configured": every provider key absent, payments closed.
for (const k of ['COMMONS_PAYMENTS', 'STRIPE_SECRET_KEY', 'STRIPE_RESTRICTED_KEY',
  'PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID', 'PRINTFUL_API_URL',
  'PRINTIFY_TOKEN', 'PRINTIFY_SHOP_ID', 'PRINTIFY_API_URL',
  'LULU_CLIENT_KEY', 'LULU_CLIENT_SECRET', 'LULU_API_URL', 'LULU_LIVE']) delete process.env[k];

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'ful-send-'));
const store = await import('../lib/store.mjs'); store.init(D);
const market = await import('../lib/market.mjs'); market.init(D);
const ful = await import('../lib/fulfillment.mjs'); ful.init(D);
const checkout = await import('../lib/checkout.mjs');

test.after(() => fs.rmSync(D, { recursive: true, force: true }));

// A fetch that records every call and answers like a calm provider. Nothing leaves this process.
let calls = [];
const fakeFetch = async (url, opts = {}) => {
  calls.push({ url: String(url), method: opts.method, body: opts.body ? JSON.parse(opts.body) : null });
  return { ok: true, status: 200, json: async () => ({ result: { id: 'prov_order_1' } }) };
};
const called = () => calls.length;
const reset = () => { calls = []; };

const mk = (id, name) => { const m = { id, kind: 'human', name, created: new Date().toISOString() }; store.addMember?.(m) ?? store.putMember?.(m); return store.getMember(id) || m; };
const maker = mk('h_maker', 'Inkwell Maker');

const listIt = (title) => market.create(maker, {
  title, text: 'A thing I made.', category: 'art', type: 'product',
  price: { mode: 'fixed', amount: 25 }, license: 'all-rights', rights: true,
});

const linked = listIt('Linked desert tee');
const unlinked = listIt('Unlinked ceramic mug');
// The maker connects the linked listing to a product they designed in Printful's own tool.
const link = ful.link(maker, linked.id, { provider: 'printful', product_id: 'pf-123', variant_ids: ['4012'] });
assert.equal(link.connected, false, 'fixture starts disconnected');

const order = (over = {}) => ({ id: 'ord_1', listing: linked.id, status: 'paid', quantity: 1, title: 'Desert tee', ship_to: { name: 'Ada Buyer', address: { line1: '1 Long St', city: 'Tucson', state: 'AZ', postal_code: '85701', country: 'US' } }, ...over });
const statusOf = (e) => e?.status;
const trySend = async (o) => { reset(); try { const r = await ful.send(o, { fetchImpl: fakeFetch }); return { ok: true, result: r }; } catch (e) { return { ok: false, error: e }; } };

test('the fixture is honest: payments are closed and no pipe is connected', () => {
  assert.equal(checkout.paymentsOpen(), false);
  const s = ful.status();
  assert.equal(s.printful.connected, false);
  assert.equal(s.printify.connected, false);
  assert.equal(s.lulu.connected, false);
  assert.equal(ful.linkFor(linked.id).provider, 'printful');
});

test('(c) payments closed: no order goes to a printer, and nobody is called', async () => {
  const r = await trySend(order());
  assert.equal(r.ok, false, 'must refuse');
  assert.equal(statusOf(r.error), 503);
  assert.match(r.error.message, /Payments aren't open yet/);
  assert.equal(r.error.message, "Payments aren't open yet, so no order goes to a printer.");
  assert.equal(called(), 0, 'fetch must not be called while payments are closed');
});

// Payments open in TEST mode only (a fake test key, so nothing can be charged). This is a test, not top-level code:
// node:test evaluates the whole module before running any case, so top-level env changes would already be in effect
// for case (c) above. Cases run in the order they are declared, so this sits between (c) and the rest.
test('open payments in test mode, for the remaining cases', () => {
  Object.assign(process.env, { COMMONS_PAYMENTS: 'stripe', STRIPE_SECRET_KEY: 'sk_test_fulfillment_refusals_only' });
  assert.equal(checkout.paymentsOpen(), true);
});

test('(b) an unpaid order is refused before anything else, and nobody is called', async () => {
  for (const status of ['pending', 'unpaid', 'refunded', undefined]) {
    const r = await trySend(order({ status }));
    assert.equal(r.ok, false, `status ${String(status)} must refuse`);
    assert.equal(statusOf(r.error), 409);
    assert.equal(r.error.message, 'only a paid order goes to the printer');
    assert.equal(called(), 0, `fetch must not be called for an unpaid order (${String(status)})`);
  }
});

test('(a) a listing with no link says the maker ships it, and nobody is called', async () => {
  const r = await trySend(order({ listing: unlinked.id }));
  assert.equal(r.ok, false, 'must refuse');
  assert.equal(statusOf(r.error), 409);
  assert.equal(r.error.message, 'this listing has no print or fulfillment link: the maker ships it');
  assert.equal(called(), 0, 'fetch must not be called for a listing the maker ships');
});

test('(d) a linked pipe with no key is refused, and nobody is called', async () => {
  assert.equal(ful.status().printful.connected, false);
  const r = await trySend(order());
  assert.equal(r.ok, false, 'must refuse');
  assert.equal(statusOf(r.error), 503);
  assert.equal(r.error.message, "printful isn't connected yet");
  assert.equal(called(), 0, 'fetch must not be called when the pipe has no key');
});

test('(d) a pipe with only half its keys is still not connected', async () => {
  process.env.PRINTFUL_TOKEN = 'not-a-real-token';
  try {
    assert.equal(ful.status().printful.connected, false, 'store id is still missing');
    const r = await trySend(order());
    assert.equal(r.ok, false);
    assert.equal(statusOf(r.error), 503);
    assert.equal(called(), 0);
  } finally { delete process.env.PRINTFUL_TOKEN; }
});

test('control: with every gate open the provider is called exactly once, with a Printful order', async () => {
  Object.assign(process.env, { PRINTFUL_TOKEN: 'not-a-real-token', PRINTFUL_STORE_ID: 'not-a-real-store', PRINTFUL_API_URL: 'https://printful.invalid' });
  try {
    assert.equal(ful.status().printful.connected, true);
    const r = await trySend(order());
    assert.equal(r.ok, true, r.error?.message || 'should have sent');
    assert.equal(r.result.provider, 'printful');
    assert.equal(r.result.provider_order, 'prov_order_1');
    assert.equal(called(), 1, 'exactly one call');
    assert.equal(calls[0].url, 'https://printful.invalid/orders');
    assert.equal(calls[0].method, 'POST');
    assert.equal(calls[0].body.external_id, 'ord_1');
    assert.equal(calls[0].body.items[0].quantity, 1);
  } finally {
    delete process.env.PRINTFUL_TOKEN; delete process.env.PRINTFUL_STORE_ID; delete process.env.PRINTFUL_API_URL;
  }
  // ...and with the keys gone again, the same order is refused: the zero-call cases above are real refusals.
  const again = await trySend(order());
  assert.equal(again.ok, false);
  assert.equal(called(), 0);
});

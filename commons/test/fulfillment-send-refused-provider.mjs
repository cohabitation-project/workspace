// fulfillment-send-refused-provider.mjs — what happens when a printer says no.
// Round 42, DeepSeek's marketplace lane (continuity/deepseek/ACTIVE.md: "still untested: send()'s 502 when a provider
// refuses (r.ok === false), and luluToken()'s auth failure"). commons/lib/fulfillment.mjs `send()` has two failure
// paths after every gate is open, and until now neither was exercised:
//   (1) the provider answers, but not with 2xx  -> 502 "<provider> refused the order (<status>)"
//   (2) Lulu's token endpoint refuses          -> 502 "Lulu sign-in failed", and NO print job is attempted
// In both, the error must be plain: no provider key, no bearer header, no raw provider body, no stack text. A refused
// order is not a sent order, so provider_order is never returned.
// No server, no network, no real key: fetchImpl is always ours and every host is *.invalid.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Start from "nothing configured". Case order below turns gates on one at a time, inside declared tests, because
// node:test evaluates this whole module before it runs any case.
for (const k of ['COMMONS_PAYMENTS', 'STRIPE_SECRET_KEY', 'STRIPE_RESTRICTED_KEY',
  'PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID', 'PRINTFUL_API_URL',
  'PRINTIFY_TOKEN', 'PRINTIFY_SHOP_ID', 'PRINTIFY_API_URL',
  'LULU_CLIENT_KEY', 'LULU_CLIENT_SECRET', 'LULU_API_URL', 'LULU_LIVE']) delete process.env[k];

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'ful-refused-'));
const store = await import('../lib/store.mjs'); store.init(D);
const market = await import('../lib/market.mjs'); market.init(D);
const ful = await import('../lib/fulfillment.mjs'); ful.init(D);
const checkout = await import('../lib/checkout.mjs');

test.after(() => fs.rmSync(D, { recursive: true, force: true }));

// A fetch we control completely. `answer(url, opts)` returns the response for each call; every call is recorded.
let calls = [];
let answer = async () => ({ ok: true, status: 200, json: async () => ({}) });
const fakeFetch = async (url, opts = {}) => {
  calls.push({ url: String(url), method: opts.method, headers: opts.headers || {}, body: opts.body });
  return answer(String(url), opts);
};
const reset = (fn) => { calls = []; answer = fn; };
const called = () => calls.length;

const mk = (id, name) => { const m = { id, kind: 'human', name, created: new Date().toISOString() }; store.addMember?.(m) ?? store.putMember?.(m); return store.getMember(id) || m; };
const maker = mk('h_maker', 'Inkwell Maker');
const listIt = (title, category = 'art') => market.create(maker, {
  title, text: 'A thing I made.', category, type: 'product',
  price: { mode: 'fixed', amount: 25 }, license: 'all-rights', rights: true,
});

const pfListing = listIt('Refused desert tee');
const pyListing = listIt('Refused ceramic mug');
const luListing = listIt('Refused paperback', 'writing'); // Lulu prints books; the market category for those is writing
ful.link(maker, pfListing.id, { provider: 'printful', product_id: 'pf-123', variant_ids: ['4012'] });
ful.link(maker, pyListing.id, { provider: 'printify', product_id: 'pr-9', variant_ids: ['88211'] });
ful.link(maker, luListing.id, { provider: 'lulu', product_id: 'pod-500', sku: 'PB-500' });

const order = (listing, over = {}) => ({ id: 'ord_' + listing.id, listing, status: 'paid', quantity: 1, title: 'A thing', ship_to: { name: 'Ada Buyer', address1: '1 Long St', city: 'Tucson', country_code: 'US' }, ...over });
const trySend = async (o) => { try { return { ok: true, result: await ful.send(o, { fetchImpl: fakeFetch }) }; } catch (e) { return { ok: false, error: e }; } };

const TOKEN = 'not-a-real-token-please';
const SECRET = 'not-a-real-secret-please';

test('the fixture is honest: payments closed, no pipe connected', () => {
  assert.equal(checkout.paymentsOpen(), false);
  const s = ful.status();
  assert.equal(s.printful.connected, false);
  assert.equal(s.printify.connected, false);
  assert.equal(s.lulu.connected, false);
  assert.equal(ful.linkFor(pfListing.id).provider, 'printful');
  assert.equal(ful.linkFor(luListing.id).provider, 'lulu');
});

test('open payments in test mode and configure all three pipes, for the remaining cases', () => {
  Object.assign(process.env, {
    COMMONS_PAYMENTS: 'stripe', STRIPE_SECRET_KEY: 'sk_test_refused_provider_only',
    PRINTFUL_TOKEN: TOKEN, PRINTFUL_STORE_ID: 'not-a-real-store', PRINTFUL_API_URL: 'https://printful.invalid',
    PRINTIFY_TOKEN: TOKEN, PRINTIFY_SHOP_ID: 'not-a-real-shop', PRINTIFY_API_URL: 'https://printify.invalid',
    LULU_CLIENT_KEY: TOKEN, LULU_CLIENT_SECRET: SECRET, LULU_API_URL: 'https://lulu.invalid',
  });
  assert.equal(checkout.paymentsOpen(), true);
  const s = ful.status();
  assert.equal(s.printful.connected, true);
  assert.equal(s.printify.connected, true);
  assert.equal(s.lulu.connected, true);
});

test('(1) Printful refuses: 502 with a plain message, one call, nothing leaked', async () => {
  // A hostile-ish provider body: it echoes the bearer token we sent and carries JSON noise. None of it may surface.
  reset(async () => ({ ok: false, status: 400, json: async () => ({ code: 400, error: { message: `bad token ${TOKEN}` }, result: { id: 'should_not_leak' } }) }));
  const r = await trySend(order(pfListing.id));
  assert.equal(r.ok, false, 'a refused order must not look sent');
  assert.equal(r.error.status, 502);
  assert.equal(r.error.message, 'printful refused the order (400)');
  assert.equal(called(), 1, 'the provider is called once, not retried');
  assert.equal(calls[0].url, 'https://printful.invalid/orders');
  const surface = `${r.error.message} ${r.error.stack || ''}`;
  assert.equal(surface.includes(TOKEN), false, 'no provider key in the error');
  assert.equal(surface.includes('should_not_leak'), false, 'no provider body in the error');
  assert.equal(surface.includes('Bearer'), false, 'no auth header in the error');
  assert.equal('result' in r, false, 'no provider_order is returned for a refused order');
});

test('(1) Printify answers 500 with a body that is not JSON: still 502, no crash', async () => {
  reset(async () => ({ ok: false, status: 500, json: async () => { throw new SyntaxError('Unexpected token < in JSON'); } }));
  const r = await trySend(order(pyListing.id));
  assert.equal(r.ok, false);
  assert.equal(r.error.status, 502);
  assert.equal(r.error.message, 'printify refused the order (500)');
  assert.equal(called(), 1);
  assert.equal(calls[0].url, 'https://printify.invalid/v1/shops/not-a-real-shop/orders.json');
  const surface = `${r.error.message} ${r.error.stack || ''}`;
  assert.equal(surface.includes('Unexpected token'), false, 'a body parse failure is not surfaced as the reason');
  assert.equal(surface.includes(TOKEN), false, 'no provider key in the error');
});

test('(2) Lulu sign-in refuses: 502 "Lulu sign-in failed" and no print job is attempted', async () => {
  reset(async (url) => {
    assert.match(url, /\/auth\/realms\/glasstree\/protocol\/openid-connect\/token$/);
    return { ok: false, status: 401, json: async () => ({ error: 'invalid_client' }) };
  });
  const r = await trySend(order(luListing.id));
  assert.equal(r.ok, false, 'no token means no order');
  assert.equal(r.error.status, 502);
  assert.equal(r.error.message, 'Lulu sign-in failed');
  assert.equal(called(), 1, 'only the token endpoint is called');
  assert.equal(calls.some((c) => c.url.includes('/print-jobs/')), false, 'the print job must never be attempted');
  const surface = `${r.error.message} ${r.error.stack || ''}`;
  assert.equal(surface.includes(TOKEN), false, 'no client key in the error');
  assert.equal(surface.includes(SECRET), false, 'no client secret in the error');
  assert.equal(surface.includes('invalid_client'), false, 'no provider body in the error');
});

test('(2) Lulu sign-in answers 200 but without an access_token: refused the same way', async () => {
  reset(async () => ({ ok: true, status: 200, json: async () => ({ token_type: 'bearer' }) }));
  const r = await trySend(order(luListing.id));
  assert.equal(r.ok, false);
  assert.equal(r.error.status, 502);
  assert.equal(r.error.message, 'Lulu sign-in failed');
  assert.equal(called(), 1);
  assert.equal(calls.some((c) => c.url.includes('/print-jobs/')), false);
});

test('(1)+(2) Lulu signs in, then refuses the print job: 502 names Lulu, not the token step', async () => {
  reset(async (url) => (url.endsWith('/token')
    ? { ok: true, status: 200, json: async () => ({ access_token: 'lulu-token-1' }) }
    : { ok: false, status: 422, json: async () => ({ detail: 'pod_package_id is required' }) }));
  const r = await trySend(order(luListing.id));
  assert.equal(r.ok, false);
  assert.equal(r.error.status, 502);
  assert.equal(r.error.message, 'lulu refused the order (422)');
  assert.equal(called(), 2, 'one token call, one print-job call');
  assert.match(calls[0].url, /\/token$/);
  assert.equal(calls[1].url, 'https://lulu.invalid/print-jobs/');
  assert.equal(calls[1].method, 'POST');
  assert.equal(calls[1].headers.authorization, 'Bearer lulu-token-1', 'the token from step one is used, once');
  assert.equal(`${r.error.message} ${r.error.stack || ''}`.includes('lulu-token-1'), false, 'no bearer token in the error');
  assert.equal(`${r.error.message} ${r.error.stack || ''}`.includes('pod_package_id is required'), false, 'no provider body in the error');
});

test('control: the same Lulu pipe, accepted, returns the provider order and calls twice', async () => {
  reset(async (url) => (url.endsWith('/token')
    ? { ok: true, status: 200, json: async () => ({ access_token: 'lulu-token-2' }) }
    : { ok: true, status: 201, json: async () => ({ id: 'lulu_order_7' }) }));
  const r = await trySend(order(luListing.id));
  assert.equal(r.ok, true, r.error?.message || 'should have been accepted');
  assert.equal(r.result.provider, 'lulu');
  assert.equal(r.result.provider_order, 'lulu_order_7');
  assert.equal(called(), 2, 'token, then the job');
  assert.equal(calls[1].headers.authorization, 'Bearer lulu-token-2');
  // The body is the one plan() describes; this file asserts the failure paths, not the provider field list
  // (fulfillment-plan-providers.mjs owns that).
  const body = JSON.parse(calls[1].body);
  assert.equal(body.external_id, 'ord_' + luListing.id);
  assert.equal(body.shipping_level, 'MAIL');
});

test.todo('link() should refuse an empty variant_ids list for printful/printify (plan() then sends variant_id: undefined, which JSON drops; Printify requires variant_id)', () => {
  // Found in round 41 (teams/build/outputs/round41-deepseek-plan-providers.md) and not fixed here: link() lives in
  // commons/lib/fulfillment.mjs and needs its own job. Lulu is a different shape: it plans pod_package_id from `sku`,
  // so the same hole there is an empty sku. https://developers.printify.com/#create-an-order (line_items.variant_id required)
});

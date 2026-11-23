// fulfillment-send-refused-provider.mjs — what happens when a printer says NO, and when a link is too thin to send.
// Round 42, DeepSeek's marketplace job (Setu, 2026-11-23), rebuilt after round 41's branch went red.
// commons/lib/fulfillment.mjs `send()` refuses before calling anyone (round 39's file, fulfillment-send-refusals.mjs,
// covers those four gates). THIS file covers the other half: the provider is reached and refuses, or the provider's
// sign-in fails. In every such case:
//   - the caller gets a 502 with plain words and the provider's status code,
//   - exactly the calls that had to happen happened (a failed Lulu sign-in never reaches /print-jobs/),
//   - the error text and stack carry no key, no token, no `Bearer`, and no provider body: a provider that echoes the
//     token back cannot get it into our logs through an error message,
//   - no `provider_order` is reported, because no order exists.
// Plus the round-41 defect, now fixed in link(): a Printify/Printful link with no variant id, or a Lulu link with no
// print package (sku), is refused at link time with a 400 instead of building a request that drops the field.
// No server, no network (every host is *.invalid), no real key.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

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

const TOKEN = 'not-a-real-token-77';
const clearEnv = (keys) => { for (const k of keys) delete process.env[k]; };
const PF = ['PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID', 'PRINTFUL_API_URL'];
const PY = ['PRINTIFY_TOKEN', 'PRINTIFY_SHOP_ID', 'PRINTIFY_API_URL'];
const LU = ['LULU_CLIENT_KEY', 'LULU_CLIENT_SECRET', 'LULU_API_URL', 'LULU_LIVE'];

const mk = (id, name) => { const m = { id, kind: 'human', name, created: new Date().toISOString() }; store.addMember?.(m) ?? store.putMember?.(m); return store.getMember(id) || m; };
const maker = mk('h_maker2', 'Inkwell Maker Two');
const listIt = (title, category = 'art') => market.create(maker, {
  title, text: 'A thing I made.', category, type: 'product',
  price: { mode: 'fixed', amount: 25 }, license: 'all-rights', rights: true,
});

const tee = listIt('Refused-lane desert tee');
const mug = listIt('Refused-lane ceramic mug');
const book = listIt('Refused-lane paperback', 'writing');

ful.link(maker, tee.id, { provider: 'printful', product_id: 'pf-123', variant_ids: ['4012'] });
ful.link(maker, mug.id, { provider: 'printify', product_id: 'pr-9', variant_ids: ['5100'] });
ful.link(maker, book.id, { provider: 'lulu', product_id: 'lulu-item-1', sku: '0608340' });

// One fake provider per case: it records the call and answers with the given status and body.
function provider(status, body, bodyText = null) {
  const reply = body; // captured first: the request body below must never shadow the answer
  const calls = [];
  const fetchImpl = async (url, opts = {}) => {
    // The Lulu sign-in body is form-encoded, not JSON: keep whatever we are handed rather than assume.
    let sent = null;
    if (opts.body) { try { sent = JSON.parse(opts.body); } catch { sent = String(opts.body); } }
    calls.push({ url: String(url), method: opts.method, headers: { ...(opts.headers || {}) }, body: sent });
    return { ok: status >= 200 && status < 300, status, json: async () => { if (bodyText !== null) throw new SyntaxError('Unexpected token <'); return reply; }, text: async () => bodyText ?? JSON.stringify(reply) };
  };
  return { calls, fetchImpl };
}
const order = (over = {}) => ({
  id: 'ord_refused_1', listing: tee.id, status: 'paid', quantity: 1, title: 'Desert tee',
  ship_to: { name: 'Ada Buyer', address1: '1 Long St', city: 'Tucson', country_code: 'US' },
  ...over,
});
const trySend = async (o, p) => { try { return { ok: true, result: await ful.send(o, { fetchImpl: p.fetchImpl }) }; } catch (e) { return { ok: false, error: e }; } };
const leaks = (e) => {
  const s = `${e?.message || ''}\n${e?.stack || ''}`;
  for (const bad of [TOKEN, 'Bearer', 'access_token', 'provider_order', '<html>']) {
    assert.equal(s.includes(bad), false, `the refusal must not carry "${bad}": ${s}`);
  }
};

test('the fixture is honest: payments are closed, every link is in place, nothing is connected', () => {
  assert.equal(checkout.paymentsOpen(), false);
  const s = ful.status();
  assert.equal(s.printful.connected, false);
  assert.equal(s.printify.connected, false);
  assert.equal(s.lulu.connected, false);
  assert.equal(ful.linkFor(tee.id).provider, 'printful');
  assert.equal(ful.linkFor(book.id).provider, 'lulu');
});

test('payments closed: a paid order still reaches no printer and no fetch happens', async () => {
  const p = provider(200, { result: { id: 'prov_1' } });
  const r = await trySend(order(), p);
  assert.equal(r.ok, false);
  assert.equal(r.error.status, 503);
  assert.match(r.error.message, /Payments aren't open yet/);
  assert.equal(p.calls.length, 0);
});

// Payments open in TEST mode only (a fake test key, nothing can be charged). Declared as a test because node:test
// evaluates the whole module before running any case: a top-level env change would already apply to the case above.
test('open payments in test mode, for the remaining cases', () => {
  Object.assign(process.env, { COMMONS_PAYMENTS: 'stripe', STRIPE_SECRET_KEY: 'sk_test_refused_provider_only' });
  assert.equal(checkout.paymentsOpen(), true);
});

test('printful answers 400 and echoes the token: 502, one call, and the token never surfaces', async () => {
  Object.assign(process.env, { PRINTFUL_TOKEN: TOKEN, PRINTFUL_STORE_ID: 'not-a-real-store', PRINTFUL_API_URL: 'https://printful.invalid' });
  try {
    assert.equal(ful.status().printful.connected, true);
    const p = provider(400, { error: { message: `bad request for ${TOKEN}` } });
    const r = await trySend(order(), p);
    assert.equal(r.ok, false, 'must refuse');
    assert.equal(r.error.status, 502);
    assert.equal(r.error.message, 'printful refused the order (400)');
    assert.equal(p.calls.length, 1, 'exactly one call');
    assert.equal(p.calls[0].url, 'https://printful.invalid/orders');
    assert.equal(p.calls[0].headers.authorization, `Bearer ${TOKEN}`);
    assert.equal(r.result, undefined, 'no provider_order is reported for a refused order');
    leaks(r.error);
  } finally { clearEnv(PF); }
});

test('printify answers 500 with a non-JSON body: still a plain 502, and the parse error is not surfaced', async () => {
  Object.assign(process.env, { PRINTIFY_TOKEN: TOKEN, PRINTIFY_SHOP_ID: '12345', PRINTIFY_API_URL: 'https://printify.invalid' });
  try {
    const p = provider(500, null, '<html>oops</html>');
    const r = await trySend(order({ listing: mug.id }), p);
    assert.equal(r.ok, false);
    assert.equal(r.error.status, 502);
    assert.equal(r.error.message, 'printify refused the order (500)');
    assert.equal(p.calls.length, 1);
    assert.equal(p.calls[0].url, 'https://printify.invalid/v1/shops/12345/orders.json');
    leaks(r.error);
  } finally { clearEnv(PY); }
});

test('lulu sign-in fails: 502 "Lulu sign-in failed", one call, and /print-jobs/ is never attempted', async () => {
  Object.assign(process.env, { LULU_CLIENT_KEY: 'k', LULU_CLIENT_SECRET: 's', LULU_API_URL: 'https://lulu.invalid' });
  try {
    for (const [status, body] of [[401, { error: 'invalid_client' }], [200, { token_type: 'Bearer' }]]) {
      const p = provider(status, body);
      const r = await trySend(order({ listing: book.id, id: 'ord_book_1' }), p);
      assert.equal(r.ok, false, `lulu token status ${status} must refuse`);
      assert.equal(r.error.status, 502);
      assert.equal(r.error.message, 'Lulu sign-in failed');
      assert.equal(p.calls.length, 1, 'only the token endpoint is called');
      assert.equal(p.calls[0].url, 'https://lulu.invalid/auth/realms/glasstree/protocol/openid-connect/token');
      assert.equal(p.calls.some((c) => c.url.includes('/print-jobs/')), false, 'no print job without a token');
      leaks(r.error);
    }
  } finally { clearEnv(LU); }
});

test('control: an accepted lulu order is sent once, with the book, the address and the signed-in token', async () => {
  Object.assign(process.env, { LULU_CLIENT_KEY: 'k', LULU_CLIENT_SECRET: 's', LULU_API_URL: 'https://lulu.invalid' });
  try {
    const p = provider(200, { id: 'prov_lulu_1', status: 'CREATED' });
    const pToken = provider(200, { access_token: 'lulu-token-1' });
    const fetchImpl = async (url, opts = {}) => (String(url).includes('/token') ? pToken.fetchImpl(url, opts) : p.fetchImpl(url, opts));
    const o = order({ listing: book.id, id: 'ord_book_1', quantity: 2 });
    const r = await ful.send(o, { fetchImpl });
    assert.equal(r.provider, 'lulu');
    assert.equal(r.provider_order, 'prov_lulu_1');
    assert.equal(pToken.calls.length, 1);
    assert.equal(p.calls.length, 1);
    assert.equal(p.calls[0].url, 'https://lulu.invalid/print-jobs/');
    assert.equal(p.calls[0].headers.authorization, 'Bearer lulu-token-1');
    assert.equal(p.calls[0].body.external_id, 'ord_book_1');
    assert.equal(p.calls[0].body.line_items[0].external_id, 'lulu-item-1');
    assert.equal(p.calls[0].body.line_items[0].printable_normalization.pod_package_id, '0608340');
    assert.equal(p.calls[0].body.line_items[0].quantity, 2);
    assert.deepEqual(p.calls[0].body.shipping_address, o.ship_to);
    assert.equal(p.calls[0].body.shipping_level, 'MAIL');
  } finally { clearEnv(LU); }
});

test('lulu signs in and then refuses the print job: 502, two calls, and the token is not echoed', async () => {
  Object.assign(process.env, { LULU_CLIENT_KEY: 'k', LULU_CLIENT_SECRET: 's', LULU_API_URL: 'https://lulu.invalid' });
  try {
    const p = provider(422, { detail: 'pod_package_id not available for this page count, token lulu-token-1' });
    let n = 0;
    const fetchImpl = async (url, opts = {}) => (++n === 1
      ? { ok: true, status: 200, json: async () => ({ access_token: 'lulu-token-1' }) }
      : p.fetchImpl(url, opts));
    let err = null;
    try { await ful.send(order({ listing: book.id }), { fetchImpl }); } catch (e) { err = e; }
    assert.ok(err, 'must refuse');
    assert.equal(err.status, 502);
    assert.equal(err.message, 'lulu refused the order (422)');
    assert.equal(n, 2, 'sign-in, then exactly one print job');
    assert.equal(err.message.includes('lulu-token-1'), false, 'the token is never echoed');
    leaks(err);
  } finally { clearEnv(LU); }
});

test('link() refuses a variant-less print link and a sku-less lulu link, and keeps the good ones', () => {
  const before = ful.linkFor(tee.id).variant_ids.slice();
  for (const provider of ['printful', 'printify']) {
    assert.throws(() => ful.link(maker, tee.id, { provider, product_id: 'x-1', variant_ids: [] }),
      (e) => e.status === 400 && /variant/i.test(e.message), `${provider} with no variant id must be refused`);
  }
  assert.throws(() => ful.link(maker, book.id, { provider: 'lulu', product_id: 'lulu-item-2' }),
    (e) => e.status === 400 && /sku|print package/i.test(e.message), 'lulu with no sku must be refused');
  assert.throws(() => ful.link(maker, book.id, { provider: 'lulu', product_id: 'lulu-item-2', sku: '   ' }),
    (e) => e.status === 400, 'a blank sku is no sku');
  assert.deepEqual(ful.linkFor(tee.id).variant_ids, before, 'a refused link changes nothing');
  assert.equal(ful.linkFor(book.id).product_id, 'lulu-item-1');
  const ok = ful.link(maker, tee.id, { provider: 'printful', product_id: 'pf-124', variant_ids: ['4012'] });
  assert.deepEqual(ok.variant_ids, ['4012']);
  // ...and the thin-link defect is gone at the wire level: a linked order now always carries its variant id.
  const pl = ful.plan({ id: 'ord_x', listing: tee.id, quantity: 1 });
  assert.equal(pl.request.body.items[0].sync_variant_id, 4012);
});

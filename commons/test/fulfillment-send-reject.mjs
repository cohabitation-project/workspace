// fulfillment-send-reject.mjs — a printer that cannot be reached gets the short sentence, never the raw error.
// Round 80, Claude. fulfillment.send() used to await its print-job fetch with no catch: a dropped connection reached
// the caller as the raw network error (checkout.sendToPrinter then stored String(e.message) in the order record).
// Same sentence shape the quote path uses ("... could not be reached"). Fake fetch only: nothing leaves this process.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

for (const k of ['COMMONS_PAYMENTS', 'STRIPE_SECRET_KEY', 'STRIPE_RESTRICTED_KEY', 'PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID', 'PRINTFUL_API_URL',
  'PRINTIFY_TOKEN', 'PRINTIFY_SHOP_ID', 'PRINTIFY_API_URL', 'LULU_CLIENT_KEY', 'LULU_CLIENT_SECRET', 'LULU_API_URL', 'LULU_LIVE']) delete process.env[k];
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'ful-reject-'));
const store = await import('../lib/store.mjs'); store.init(D);
const market = await import('../lib/market.mjs'); market.init(D);
const ful = await import('../lib/fulfillment.mjs'); ful.init(D);
test.after(() => fs.rmSync(D, { recursive: true, force: true }));

const maker = { id: 'h_maker', kind: 'human', name: 'Inkwell Maker', created: new Date().toISOString() };
store.addMember?.(maker) ?? store.putMember?.(maker);
const listIt = (title) => market.create(maker, { title, text: 'A thing I made.', category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 }, license: 'all-rights', rights: true });
const lf = listIt('Printful tee'), ly = listIt('Printify tee'), ll = listIt('Lulu book');
ful.link(maker, lf.id, { provider: 'printful', product_id: 'pf-1', variant_ids: ['4012'] });
ful.link(maker, ly.id, { provider: 'printify', product_id: 'py-1', variant_ids: ['77'] });
ful.link(maker, ll.id, { provider: 'lulu', product_id: 'lu-1', sku: '0600X0900BWSTDPB060UW444MXX' });
const order = (listing) => ({ id: 'ord_r', listing, status: 'paid', quantity: 1, title: 'Thing', ship_to: { name: 'Ada Buyer', address: { line1: '1 Long St', city: 'Tucson', state: 'AZ', postal_code: '85701', country: 'US' } } });

// The raw text a dropped connection carries: an address, and something that looks like a secret. None of it may come out.
const RAW = 'connect ECONNREFUSED 10.9.8.7:443 Authorization: Bearer sk-live-RAWSECRET';
const tokenOk = { ok: true, status: 200, json: async () => ({ access_token: 'tok-not-real' }) };
let mode = 'reject'; let calls = [];
// Lulu signs in first (a fetch to the token URL), THEN posts the job; reject only the job so the new catch is what's tested.
const fetchImpl = async (url, opts = {}) => {
  calls.push(String(url));
  if (/openid-connect\/token/.test(String(url))) return tokenOk;
  if (mode === 'reject') throw new Error(RAW);
  if (mode === 'badjson') return { ok: true, status: 200, json: async () => { throw new Error('bad json'); } };
  return { ok: true, status: 200, json: async () => ({ result: { id: 'prov_ok' }, id: 'prov_ok' }) };
};
const errLines = []; const realErr = console.error; const realWarn = console.warn;
const quiet = async (fn) => { console.error = (...a) => errLines.push(a.join(' ')); console.warn = (...a) => errLines.push(a.join(' ')); try { return await fn(); } finally { console.error = realErr; console.warn = realWarn; } };
const attempt = async (o) => { calls = []; try { return { ok: true, r: await quiet(() => ful.send(o, { fetchImpl })) }; } catch (e) { return { ok: false, e }; } };

test('open payments in test mode and connect the three pipes with fake keys', () => {
  Object.assign(process.env, { COMMONS_PAYMENTS: 'stripe', STRIPE_SECRET_KEY: 'sk_test_reject_only',
    PRINTFUL_TOKEN: 'x', PRINTFUL_STORE_ID: 'x', PRINTFUL_API_URL: 'https://printful.invalid',
    PRINTIFY_TOKEN: 'x', PRINTIFY_SHOP_ID: 'x', PRINTIFY_API_URL: 'https://printify.invalid',
    LULU_CLIENT_KEY: 'x', LULU_CLIENT_SECRET: 'x', LULU_API_URL: 'https://lulu.invalid' });
  const s = ful.status(); assert.equal(s.printful.connected, true); assert.equal(s.printify.connected, true); assert.equal(s.lulu.connected, true);
});

test('control: the same fake fetch, not rejecting, sends all three (so a refusal below is the catch, not a dead harness)', async () => {
  mode = 'ok';
  for (const l of [lf, ly, ll]) { const a = await attempt(order(l.id)); assert.equal(a.ok, true, a.e?.message); assert.equal(a.r.provider_order, 'prov_ok'); }
});

for (const [name, l] of [['printful', lf], ['printify', ly], ['lulu', ll]]) {
  test(`${name}: a rejected print-job fetch gives the short 502 sentence, with nothing raw in it`, async () => {
    mode = 'reject';
    const a = await attempt(order(l.id));
    assert.equal(a.ok, false, 'must refuse, not resolve');
    assert.equal(a.e.status, 502);
    assert.equal(a.e.message, `${name} could not be reached`);
    assert.ok(!/ECONNREFUSED|10\.9\.8\.7|Bearer|RAWSECRET/.test(a.e.message), 'no raw network text');
    assert.equal(errLines.length, 0, 'nothing logged: ' + errLines.join('|'));
    assert.equal(calls.filter((u) => !/openid-connect\/token/.test(u)).length, 1, 'one job call, no retry loop');
  });
}

test('a printer that answers ok with an unreadable body resolves exactly as before (the catch does not touch the answer path)', async () => {
  mode = 'badjson';
  const a = await attempt(order(lf.id)); assert.equal(a.ok, true, 'ok:true with unreadable body resolves as before'); assert.equal(a.r.provider_order, null);
});

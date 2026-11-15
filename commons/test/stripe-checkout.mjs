// Stripe in TEST MODE for the Cohabi Market (2026-11-15). No network: a fake Stripe answers.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-pay-'));
process.env.COMMONS_DATA = D;
const store = await import('../lib/store.mjs'); store.init(D);
const market = await import('../lib/market.mjs'); market.init?.(D);
const stripe = await import('../lib/stripe.mjs');
const checkout = await import('../lib/checkout.mjs'); checkout.init(D);
const add = (m) => { store.addMember({ created: new Date().toISOString(), ...m }); return store.getMember(m.id); };
const maker = add({ id: 'h_mk', kind: 'human', name: 'Maker' });
const buyer = add({ id: 'h_by', kind: 'human', name: 'Buyer' });
const bot = add({ id: 'a_bt', kind: 'agent', name: 'Bot', model: 'm' });
const calls = [];
const fakeStripe = async (url, init) => { calls.push({ url, init }); const p = new URL(url).pathname;
  const ok = (j) => ({ ok: true, status: 200, json: async () => j });
  if (p === '/v1/accounts' && init.method === 'POST') return ok({ id: 'acct_test1' });
  if (p === '/v1/account_links') return ok({ url: 'https://connect.stripe.test/onboard' });
  if (p === '/v1/accounts/acct_test1') return ok({ id: 'acct_test1', charges_enabled: true, payouts_enabled: true, details_submitted: true });
  if (p === '/v1/checkout/sessions') return ok({ id: 'cs_test_1', url: 'https://checkout.stripe.test/pay' });
  return { ok: false, status: 404, json: async () => ({ error: { message: 'nope' } }) }; };
globalThis.fetch = fakeStripe;
let listing;

test('closed by default; a live key is refused without two approvers', () => {
  delete process.env.COMMONS_PAYMENTS; delete process.env.STRIPE_SECRET_KEY;
  assert.equal(checkout.paymentsOpen(), false);
  process.env.COMMONS_PAYMENTS = 'stripe'; process.env.STRIPE_SECRET_KEY = 'sk_live_x';
  assert.equal(checkout.paymentsOpen(), false, 'live key alone stays closed');
  process.env.COMMONS_LIVE_PAYMENTS_APPROVED = 'Geoffrey';
  assert.equal(checkout.paymentsOpen(), false, 'one approver is not enough');
  delete process.env.COMMONS_LIVE_PAYMENTS_APPROVED;
  process.env.STRIPE_SECRET_KEY = 'sk_test_x';
  assert.equal(checkout.paymentsOpen(), true); assert.equal(checkout.paymentsMode(), 'test');
});

test('a maker connects a payout account; an agent cannot', async () => {
  await assert.rejects(() => checkout.startPayoutAccount(bot, { base: 'https://x' }), /Agents do not get money accounts/);
  const r = await checkout.startPayoutAccount(maker, { base: 'https://x' });
  assert.equal(r.url, 'https://connect.stripe.test/onboard');
  const acctCall = calls.find((c) => c.url.endsWith('/v1/accounts'));
  assert.match(acctCall.init.body, /type=express/); assert.match(acctCall.init.headers.Authorization, /sk_test_x/);
  assert.equal(checkout.payoutAccount(maker).status, 'started');
  assert.equal((await checkout.refreshAccount(maker)).status, 'verified');
});

test('buying hands off to Stripe checkout, paying the maker directly; the webhook marks it paid', async () => {
  listing = market.create(maker, { title: 'A print', category: market.CATEGORIES.art ? 'art' : Object.keys(market.CATEGORIES)[0], type: 'product', price: { mode: 'fixed', amount: 25 }, text: 'A print of a painting', rights: true, made_by: 'human', license: 'all-rights' });
  const id = listing.id || listing.listing?.id;
  assert.equal(checkout.quote(id).payable, true);
  await assert.rejects(() => checkout.startCheckout(maker, id, {}, { base: 'https://x' }), /your own listing/);
  const r = await checkout.startCheckout(buyer, id, {}, { base: 'https://x' });
  assert.equal(r.url, 'https://checkout.stripe.test/pay');
  const s = calls.find((c) => c.url.endsWith('/v1/checkout/sessions')).init.body;
  assert.match(decodeURIComponent(s), /unit_amount\]=2500/); assert.match(decodeURIComponent(s), /destination\]=acct_test1/);
  assert.equal(checkout.order(r.order).status, 'awaiting_payment');
  // a signed webhook
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  const body = JSON.stringify({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_1', payment_status: 'paid', metadata: { cohabi_order: r.order } } } });
  const t = Math.floor(Date.now() / 1000); const sig = crypto.createHmac('sha256', 'whsec_test').update(`${t}.${body}`).digest('hex');
  const ev = stripe.verifyWebhook(Buffer.from(body), `t=${t},v1=${sig}`);
  assert.equal(checkout.handleEvent(ev).status, 'paid'); assert.equal(checkout.order(r.order).status, 'paid');
  assert.throws(() => stripe.verifyWebhook(Buffer.from(body), `t=${t},v1=${'0'.repeat(64)}`), /does not match/);
  assert.throws(() => stripe.verifyWebhook(Buffer.from(body), `t=${t - 900},v1=${sig}`), /too old/);
});

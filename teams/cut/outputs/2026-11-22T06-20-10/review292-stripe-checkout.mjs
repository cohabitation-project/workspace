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
  if (p === '/v1/checkout/sessions') return ok({ id: 'cs_test_1', url: 'https://checkout.stripe.test/pay', client_secret: 'cs_test_1_secret_abc' });
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

test('we choose the payment methods: card by default, only names Stripe knows, never Stripe\'s automatic list', async () => {
  const id = listing.id || listing.listing?.id;
  delete process.env.STRIPE_PUBLISHABLE_KEY; delete process.env.COMMONS_PAYMENT_METHODS;
  calls.length = 0;
  await checkout.startCheckout(buyer, id, {}, { base: 'https://x' });
  let body = decodeURIComponent(calls.find((c) => c.url.endsWith('/v1/checkout/sessions')).init.body);
  assert.match(body, /payment_method_types\[0\]=card&payment_method_types\[1\]=link&payment_method_types\[2\]=cashapp&payment_method_types\[3\]=klarna&payment_method_types\[4\]=affirm/, 'our list, in order');
  assert.doesNotMatch(body, /automatic_payment_methods/);
  assert.deepEqual(checkout.paymentMethods(), ['card', 'link', 'cashapp', 'klarna', 'affirm']);
  process.env.COMMONS_PAYMENT_METHODS = 'card, made-up, link';
  assert.deepEqual(checkout.paymentMethods(), ['card', 'link'], 'unknown names are dropped');
  process.env.COMMONS_PAYMENT_METHODS = 'nonsense';
  assert.deepEqual(checkout.paymentMethods(), ['card'], 'nothing valid: card');
  delete process.env.COMMONS_PAYMENT_METHODS;
});

test('in-app: with a publishable key of the same mode, the session is embedded and the page gets a client secret, not a link', async () => {
  const id = listing.id || listing.listing?.id;
  process.env.STRIPE_PUBLISHABLE_KEY = 'pk_live_wrongmode';
  assert.equal(checkout.publishableKey(), null, 'a live publishable key never pairs with a test secret key');
  let r = await checkout.startCheckout(buyer, id, {}, { base: 'https://x' });
  assert.equal(r.url, 'https://checkout.stripe.test/pay', 'mismatched key: the hosted page still works');
  process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_abc';
  calls.length = 0;
  r = await checkout.startCheckout(buyer, id, {}, { base: 'https://x' });
  assert.equal(r.embedded, true); assert.equal(r.client_secret, 'cs_test_1_secret_abc'); assert.equal(r.publishable_key, 'pk_test_abc');
  assert.equal(r.url, undefined, 'no off-site link');
  const body = decodeURIComponent(calls.find((c) => c.url.endsWith('/v1/checkout/sessions')).init.body);
  assert.match(body, /ui_mode=embedded/); assert.match(body, new RegExp(`return_url=https://x/label/l/${id}\\?paid=${r.order}`));
  assert.doesNotMatch(body, /success_url|cancel_url/);
  assert.match(body, /payment_method_types\[0\]=card/); assert.match(body, /destination\]=acct_test1/);
  assert.equal(checkout.order(r.order).status, 'awaiting_payment');
  delete process.env.STRIPE_PUBLISHABLE_KEY;
});

test('if Stripe refuses a method (not switched on, amount too small), the buyer still pays by card', async () => {
  const id = listing.id || listing.listing?.id;
  delete process.env.STRIPE_PUBLISHABLE_KEY; delete process.env.COMMONS_PAYMENT_METHODS;
  const real = globalThis.fetch; const seen = [];
  globalThis.fetch = async (url, init) => {
    if (new URL(url).pathname === '/v1/checkout/sessions') { seen.push(decodeURIComponent(init.body)); if (/payment_method_types\[1\]/.test(decodeURIComponent(init.body))) return { ok: false, status: 400, json: async () => ({ error: { message: 'The payment method type "affirm" is invalid. Please ensure the provided type is activated in your dashboard.' } }) }; }
    return real(url, init);
  };
  try {
    const r = await checkout.startCheckout(buyer, id, {}, { base: 'https://x' });
    assert.equal(r.url, 'https://checkout.stripe.test/pay', 'a session was made');
    assert.equal(seen.length, 2, 'one retry'); assert.match(seen[1], /payment_method_types\[0\]=card/); assert.doesNotMatch(seen[1], /payment_method_types\[1\]/);
    assert.equal(checkout.order(r.order).status, 'awaiting_payment');
    // any other refusal is not retried
    globalThis.fetch = async (url, init) => (new URL(url).pathname === '/v1/checkout/sessions' ? { ok: false, status: 400, json: async () => ({ error: { message: 'No such destination: acct_x' } }) } : real(url, init));
    await assert.rejects(() => checkout.startCheckout(buyer, id, {}, { base: 'https://x' }), /No such destination/);
  } finally { globalThis.fetch = real; }
});

test('refunds and disputes reach the order; the split is there to recompute (practice-run checks 3-5)', async () => {
  const id = listing.id || listing.listing?.id;
  process.env.COMMONS_FEE_PERCENT = '10';
  const r = await checkout.startCheckout(buyer, id, {}, { base: 'https://x' });
  delete process.env.COMMONS_FEE_PERCENT;
  checkout.handleEvent({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_9', payment_status: 'paid', payment_intent: 'pi_test_9', metadata: { cohabi_order: r.order } } } });
  const sale = checkout.ordersFor(maker).sales.find((x) => x.id === r.order);
  assert.deepEqual(sale.split, { paid: 25, cohabi_fee: 2.5, seller_share: 22.5, refunded: 0 }, 'buyer paid 25, Cohabi 10%, seller the rest');
  // a partial refund, then the rest
  assert.equal(checkout.handleEvent({ type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_test_9', amount: 2500, amount_refunded: 1000 } } }).status, 'partly_refunded');
  assert.equal(checkout.order(r.order).refunded_cents, 1000);
  assert.equal(checkout.handleEvent({ type: 'charge.refunded', data: { object: { id: 'ch_1', payment_intent: 'pi_test_9', amount: 2500, amount_refunded: 2500 } } }).status, 'refunded');
  assert.equal(checkout.ordersFor(buyer).purchases.find((x) => x.id === r.order).status, 'refunded', 'the buyer sees it too');
  // a dispute on another sale: opened, then lost
  const r2 = await checkout.startCheckout(buyer, id, {}, { base: 'https://x' });
  checkout.handleEvent({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_10', payment_status: 'paid', payment_intent: 'pi_test_10', metadata: { cohabi_order: r2.order } } } });
  assert.equal(checkout.handleEvent({ type: 'charge.dispute.created', data: { object: { id: 'dp_1', payment_intent: 'pi_test_10', reason: 'fraudulent', status: 'needs_response' } } }).status, 'disputed');
  assert.equal(checkout.order(r2.order).dispute.reason, 'fraudulent');
  assert.equal(checkout.handleEvent({ type: 'charge.dispute.closed', data: { object: { id: 'dp_1', payment_intent: 'pi_test_10', status: 'lost' } } }).status, 'dispute_lost');
  // won puts it back to paid; an unknown charge is ignored
  const r3 = await checkout.startCheckout(buyer, id, {}, { base: 'https://x' });
  checkout.handleEvent({ type: 'checkout.session.completed', data: { object: { id: 'cs_test_11', payment_status: 'paid', payment_intent: 'pi_test_11', metadata: { cohabi_order: r3.order } } } });
  checkout.handleEvent({ type: 'charge.dispute.created', data: { object: { id: 'dp_2', payment_intent: 'pi_test_11', status: 'needs_response' } } });
  assert.equal(checkout.handleEvent({ type: 'charge.dispute.closed', data: { object: { id: 'dp_2', payment_intent: 'pi_test_11', status: 'won' } } }).status, 'paid');
  assert.equal(checkout.handleEvent({ type: 'charge.refunded', data: { object: { id: 'ch_x', payment_intent: 'pi_nobody', amount: 100, amount_refunded: 100 } } }).ignored, 'unknown order');
});

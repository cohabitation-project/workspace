// The whole path, end to end: a paid Stripe checkout that collected a shipping address becomes an order whose
// stored ship_to is translated into each printer's OWN field names and POSTed to that printer. Fake Stripe and
// fake printer only: no network, no credentials, no real payment.
// market-order-ship-to.mjs stops at plan() for Printful; this file goes through send() and covers Printify's
// first_name/last_name split and the 409 refusal when a session carries no shipping_details.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('a paid Stripe order reaches Printful and Printify with the buyer address in each printer own field names', async (t) => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-ship-to-e2e-'));
  const oldFetch = globalThis.fetch;
  const oldEnv = { ...process.env };
  const oldConsole = Object.fromEntries(['log', 'info', 'warn', 'error'].map((k) => [k, console[k]]));
  const logLines = [];
  try {
    process.env.COMMONS_DATA = D;
    process.env.COMMONS_PAYMENTS = 'stripe';
    process.env.STRIPE_SECRET_KEY = 'sk_test_ship_to_e2e';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_ship_to_e2e';
    // Both pipes "connected" by keys that go nowhere: the printer fetch is faked below, never sent.
    process.env.PRINTFUL_TOKEN = 'test-printful-token';
    process.env.PRINTFUL_STORE_ID = '12345';
    process.env.PRINTIFY_TOKEN = 'test-printify-token';
    process.env.PRINTIFY_SHOP_ID = '999';
    process.env.PRINTFUL_API_URL = 'https://printful.test';
    process.env.PRINTIFY_API_URL = 'https://printify.test';
    delete process.env.COMMONS_LIVE_PAYMENTS_APPROVED;
    delete process.env.STRIPE_PUBLISHABLE_KEY;
    delete process.env.COMMONS_PAYMENT_METHODS;
    for (const k of Object.keys(oldConsole)) console[k] = (...args) => logLines.push(args.map(String).join(' '));

    const store = await import('../lib/store.mjs'); store.init(D);
    const market = await import('../lib/market.mjs'); market.init(D);
    const checkout = await import('../lib/checkout.mjs'); checkout.init(D);
    const fulfillment = await import('../lib/fulfillment.mjs'); fulfillment.init(D);
    const stripe = await import('../lib/stripe.mjs');

    const add = (m) => { store.addMember({ created: new Date().toISOString(), ...m }); return store.getMember(m.id); };
    const seller = add({ id: 'h_e2e_seller', kind: 'human', name: 'End To End Seller' });
    const buyer = add({ id: 'h_e2e_buyer', kind: 'human', name: 'End To End Buyer' });

    // ---- fake Stripe: accounts + checkout sessions only
    const sessionBodies = new Map();
    let sessionNumber = 0;
    const fakeStripe = async (url, init = {}) => {
      const p = new URL(url).pathname;
      const ok = (j) => ({ ok: true, status: 200, json: async () => j });
      if (p === '/v1/accounts' && init.method === 'POST') return ok({ id: 'acct_e2e' });
      if (p === '/v1/account_links') return ok({ url: 'https://connect.stripe.test/onboard' });
      if (p === '/v1/accounts/acct_e2e') return ok({ id: 'acct_e2e', charges_enabled: true, payouts_enabled: true, details_submitted: true });
      if (p === '/v1/checkout/sessions') {
        const id = `cs_e2e_${++sessionNumber}`;
        sessionBodies.set(id, new URLSearchParams(init.body));
        return ok({ id, url: `https://checkout.stripe.test/${id}`, client_secret: `${id}_secret` });
      }
      return { ok: false, status: 404, json: async () => ({ error: { message: 'unexpected fake Stripe request' } }) };
    };
    globalThis.fetch = fakeStripe;

    // ---- fake printers: record every call, answer like each provider
    const printerCalls = [];
    const fakePrinter = async (url, init = {}) => {
      const u = new URL(url);
      printerCalls.push({ host: u.host, pathname: u.pathname, method: init.method, headers: init.headers || {}, body: JSON.parse(init.body || '{}') });
      const id = u.host === 'printful.test' ? 7001 : 'printify_order_7002';
      return { ok: true, status: 200, json: async () => (u.host === 'printful.test' ? { code: 200, result: { id } } : { id }) };
    };

    await checkout.startPayoutAccount(seller, { base: 'https://cohabi.test', fetchImpl: fakeStripe });
    assert.equal((await checkout.refreshAccount(seller, { fetchImpl: fakeStripe })).status, 'verified');

    const makeListing = (title) => {
      const made = market.create(seller, {
        title, category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 },
        text: 'A test-only work', rights: true, made_by: 'human', license: 'all-rights',
      });
      return made.id || made.listing?.id;
    };
    const start = async (listing) => {
      const started = await checkout.startCheckout(buyer, listing, {}, { base: 'https://cohabi.test', fetchImpl: fakeStripe });
      const session = started.embedded ? started.client_secret.replace(/_secret$/, '') : started.url.split('/').pop();
      return { order: started.order, session };
    };
    const deliver = (event) => {
      const raw = Buffer.from(JSON.stringify(event));
      const ts = Math.floor(Date.now() / 1000);
      const v1 = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${ts}.${raw.toString('utf8')}`).digest('hex');
      return checkout.handleEvent(stripe.verifyWebhook(raw, `t=${ts},v1=${v1}`));
    };
    const paidEvent = ({ order, session }, shipping_details) => ({
      type: 'checkout.session.completed',
      data: { object: { id: session, payment_status: 'paid', payment_intent: `pi_${order}`, metadata: { cohabi_order: order }, ...(shipping_details ? { shipping_details } : {}) } },
    });

    const address = { line1: '17 Private Test Street', line2: 'Apt 42', city: 'Tucson', state: 'AZ', postal_code: '85701', country: 'US' };
    const shippingDetails = { name: 'Ada B Lovelace', address, phone: '+15550000000' };

    // A paid order that went through the real webhook, for a listing linked to one provider.
    const paidOrderFor = async (title, link) => {
      const listing = makeListing(title);
      fulfillment.link(seller, listing, link);
      const started = await start(listing);
      assert.equal(deliver(paidEvent(started, shippingDetails)).status, 'paid');
      const order = checkout.order(started.order);
      assert.equal(order.status, 'paid');
      return order;
    };

    await t.test('Printful: the stored address is POSTed to /orders as recipient, in Printful field names', async () => {
      const order = await paidOrderFor('E2E printful print', { provider: 'printful', product_id: 'print_product_e2e', variant_ids: ['4012'] });
      assert.deepEqual(order.ship_to, { name: 'Ada B Lovelace', address });
      const before = printerCalls.length;
      const sent = await fulfillment.send(order, { fetchImpl: fakePrinter });
      assert.equal(sent.provider, 'printful');
      assert.equal(sent.provider_order, 7001);
      assert.equal(printerCalls.length, before + 1, 'exactly one printer call');
      const call = printerCalls.at(-1);
      assert.equal(call.host, 'printful.test');
      assert.equal(call.pathname, '/orders');
      assert.equal(call.method, 'POST');
      assert.equal(call.headers.authorization, 'Bearer test-printful-token');
      assert.equal(call.headers['X-PF-Store-Id'], '12345');
      assert.equal(call.body.external_id, order.id);
      assert.deepEqual(call.body.recipient, {
        name: 'Ada B Lovelace', address1: '17 Private Test Street', address2: 'Apt 42',
        city: 'Tucson', state_code: 'AZ', country_code: 'US', zip: '85701',
      });
      // Nothing the buyer did not give: no email, no phone, no invented country/state.
      for (const k of ['email', 'phone', 'country_name']) assert.equal(k in call.body.recipient, false, `recipient carries ${k}`);
    });

    await t.test('Printify: the same address is POSTed as address_to, split on the LAST space of the name', async () => {
      const order = await paidOrderFor('E2E printify print', { provider: 'printify', product_id: 'prod_e2e_9', variant_ids: ['777'] });
      const before = printerCalls.length;
      const sent = await fulfillment.send(order, { fetchImpl: fakePrinter });
      assert.equal(sent.provider, 'printify');
      assert.equal(sent.provider_order, 'printify_order_7002');
      assert.equal(printerCalls.length, before + 1, 'exactly one printer call');
      const call = printerCalls.at(-1);
      assert.equal(call.host, 'printify.test');
      assert.equal(call.pathname, '/v1/shops/999/orders.json');
      assert.equal(call.headers.authorization, 'Bearer test-printify-token');
      assert.equal(call.body.external_id, order.id);
      assert.deepEqual(call.body.address_to, {
        first_name: 'Ada B', last_name: 'Lovelace', address1: '17 Private Test Street', address2: 'Apt 42',
        city: 'Tucson', region: 'AZ', country: 'US', zip: '85701',
      });
      assert.equal('email' in call.body.address_to, false);
    });

    await t.test('no shipping_details: paid order, no ship_to, and send() refuses 409 before any printer fetch', async () => {
      const listing = makeListing('E2E no address');
      fulfillment.link(seller, listing, { provider: 'printful', product_id: 'print_product_no_addr', variant_ids: ['4013'] });
      const started = await start(listing);
      assert.equal(deliver(paidEvent(started)).status, 'paid');
      const order = checkout.order(started.order);
      assert.equal(order.status, 'paid');
      assert.equal('ship_to' in order, false);
      assert.equal(fulfillment.hasAddress(order.ship_to), false);
      // plan() still knows the printer, so the refusal names the real problem (the address), not the link.
      assert.equal(fulfillment.plan(order).provider, 'printful');
      const before = printerCalls.length;
      let refused = null;
      try { await fulfillment.send(order, { fetchImpl: fakePrinter }); } catch (e) { refused = e; }
      assert.ok(refused, 'send() must throw for a paid order with no address');
      assert.equal(refused.status, 409, `expected 409, got ${refused.status}: ${refused.message}`);
      assert.match(refused.message, /no shipping address/);
      assert.equal(printerCalls.length, before, 'no fetch reached any printer');
    });
  } finally {
    globalThis.fetch = oldFetch;
    for (const k of Object.keys(oldEnv)) if (oldEnv[k] === undefined) delete process.env[k];
    for (const [k, fn] of Object.entries(oldConsole)) console[k] = fn;
    fs.rmSync(D, { recursive: true, force: true });
  }
});

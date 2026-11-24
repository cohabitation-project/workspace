// Who ships it, and does the checkout know?
//
// `checkout.startCheckout` asks Stripe for a shipping address only when the order has a fulfillment provider
// (`fulfillment.plan(ord).provider`). A listing has no physical/digital field (market.TYPES is
// product/service/commission/collaboration/bounty/free; LICENSES has no physical/digital value), so the printer link
// is the only "this is a thing you post" flag we have. This file pins what that means: an order the *maker* ships
// collects no address at all, and `handleEvent` would have stored one if Stripe had sent it.
// Fake Stripe only: no network, no credentials, no real payment, no provider call.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('a maker-shipped order collects no shipping address, though a printer order does', async (t) => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-maker-ships-'));
  const oldFetch = globalThis.fetch;
  const oldConsole = Object.fromEntries(['log', 'info', 'warn', 'error'].map((k) => [k, console[k]]));
  const consoleLines = [];
  try {
    process.env.COMMONS_DATA = D;
    process.env.COMMONS_PAYMENTS = 'stripe';
    process.env.STRIPE_SECRET_KEY = 'sk_test_maker_ships';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_maker_ships';
    delete process.env.COMMONS_LIVE_PAYMENTS_APPROVED;
    delete process.env.STRIPE_PUBLISHABLE_KEY;
    delete process.env.COMMONS_PAYMENT_METHODS;

    const store = await import('../lib/store.mjs'); store.init(D);
    const market = await import('../lib/market.mjs'); market.init(D);
    const checkout = await import('../lib/checkout.mjs'); checkout.init(D);
    const fulfillment = await import('../lib/fulfillment.mjs'); fulfillment.init(D);
    const stripe = await import('../lib/stripe.mjs');

    const add = (m) => { store.addMember({ created: new Date().toISOString(), ...m }); return store.getMember(m.id); };
    const seller = add({ id: 'h_maker_ships_seller', kind: 'human', name: 'Maker Ships Seller' });
    const buyer = add({ id: 'h_maker_ships_buyer', kind: 'human', name: 'Maker Ships Buyer' });
    const sessionBodies = new Map();
    let sessionNumber = 0;
    const fakeStripe = async (url, init = {}) => {
      const p = new URL(url).pathname;
      const ok = (j) => ({ ok: true, status: 200, json: async () => j });
      if (p === '/v1/accounts' && init.method === 'POST') return ok({ id: 'acct_maker_ships' });
      if (p === '/v1/account_links') return ok({ url: 'https://connect.stripe.test/onboard' });
      if (p === '/v1/accounts/acct_maker_ships') return ok({ id: 'acct_maker_ships', charges_enabled: true, payouts_enabled: true, details_submitted: true });
      if (p === '/v1/checkout/sessions') {
        const id = `cs_maker_ships_${++sessionNumber}`;
        sessionBodies.set(id, new URLSearchParams(init.body));
        return ok({ id, url: `https://checkout.stripe.test/${id}`, client_secret: `${id}_secret` });
      }
      return { ok: false, status: 404, json: async () => ({ error: { message: 'unexpected fake Stripe request' } }) };
    };
    globalThis.fetch = fakeStripe;
    for (const k of Object.keys(oldConsole)) console[k] = (...args) => consoleLines.push(args.map(String).join(' '));

    await checkout.startPayoutAccount(seller, { base: 'https://cohabi.test', fetchImpl: fakeStripe });
    assert.equal((await checkout.refreshAccount(seller, { fetchImpl: fakeStripe })).status, 'verified');
    const makeListing = (title) => {
      const made = market.create(seller, {
        title, category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 },
        text: 'A test-only work', rights: true, made_by: 'human', license: 'all-rights',
      });
      return made.id || made.listing?.id;
    };
    const printed = makeListing('Printed by the printer');
    const makerShips = makeListing('Posted by the maker');
    fulfillment.link(seller, printed, { provider: 'printful', product_id: 'print_product_1', variant_ids: ['4012'] });

    const start = async (listingId) => {
      const started = await checkout.startCheckout(buyer, listingId, {}, { base: 'https://cohabi.test', fetchImpl: fakeStripe });
      const session = started.embedded ? started.client_secret.replace(/_secret$/, '') : started.url.split('/').pop();
      return { id: started.order, session, body: sessionBodies.get(session) };
    };
    const deliver = (event) => {
      const raw = Buffer.from(JSON.stringify(event));
      const ts = Math.floor(Date.now() / 1000);
      const v1 = crypto.createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET).update(`${ts}.${raw.toString('utf8')}`).digest('hex');
      return checkout.handleEvent(stripe.verifyWebhook(raw, `t=${ts},v1=${v1}`));
    };
    const paidEvent = (o, shipping_details) => ({
      type: 'checkout.session.completed',
      data: { object: { id: o.session, payment_status: 'paid', payment_intent: `pi_${o.id}`, metadata: { cohabi_order: o.id }, ...(shipping_details ? { shipping_details } : {}) } },
    });

    let printedOrder;
    let makerOrder;

    await t.test('a printer-linked order asks Stripe for a US shipping address (the control)', async () => {
      printedOrder = await start(printed);
      assert.deepEqual(printedOrder.body.getAll('shipping_address_collection[allowed_countries][0]'), ['US']);
      assert.equal(fulfillment.plan({ listing: printed, id: printedOrder.id }).provider, 'printful');
    });

    await t.test('the same listing without the printer link asks for no address at all', async () => {
      assert.equal(fulfillment.plan({ listing: makerShips, id: 'ord_probe' }).provider, null, 'no provider: the maker is the shipper');
      makerOrder = await start(makerShips);
      assert.equal(
        [...makerOrder.body.keys()].some((k) => k.startsWith('shipping_address_collection')),
        false,
        'a maker-shipped product is still a thing that must be posted, and its checkout collects nothing',
      );
    });

    await t.test('storage is not the gap: if Stripe did send an address, handleEvent keeps it', () => {
      const address = { line1: '17 Private Test Street', line2: 'Apt 42', city: 'Tucson', state: 'AZ', postal_code: '85701', country: 'US' };
      const details = { name: 'Buyer Delivery Name', address, phone: '+15550000000', carrier: 'not-part-of-name-or-address' };
      assert.equal(deliver(paidEvent(makerOrder, details)).status, 'paid');
      const paid = checkout.order(makerOrder.id);
      assert.deepEqual(paid.ship_to, { name: details.name, address });
      assert.equal('phone' in paid.ship_to, false, 'only the two fields the buyer meant to give');
      assert.equal('carrier' in paid.ship_to, false);
      for (const privateText of [address.line1, address.postal_code, details.phone, details.carrier]) {
        assert.equal(consoleLines.join('\n').includes(privateText), false, `application log contains ${JSON.stringify(privateText)}`);
      }
    });

    await t.test('the printed order keeps working: address stored, recipient translated', () => {
      const address = { line1: '17 Private Test Street', city: 'Tucson', state: 'AZ', postal_code: '85701', country: 'US' };
      deliver(paidEvent(printedOrder, { name: 'Buyer Delivery Name', address }));
      const paid = checkout.order(printedOrder.id);
      assert.deepEqual(paid.ship_to, { name: 'Buyer Delivery Name', address });
      // address2 is always present in the Printful shape, empty when the buyer gave no second line (measured: a
      // missing address2 here was my own wrong expectation, not a library fault).
      assert.deepEqual(fulfillment.plan(paid).request.body.recipient, { name: 'Buyer Delivery Name', address1: '17 Private Test Street', address2: '', city: 'Tucson', state_code: 'AZ', country_code: 'US', zip: '85701' });
    });
  } finally {
    globalThis.fetch = oldFetch;
    for (const [k, fn] of Object.entries(oldConsole)) console[k] = fn;
    fs.rmSync(D, { recursive: true, force: true });
  }
});

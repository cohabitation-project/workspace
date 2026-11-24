// When the maker ships it themselves, where does the buyer's address come from?
// Finding this file proves: nowhere. A listing has no physical/digital field at all
// (commons/lib/market.mjs TYPES and LICENSES enums carry no such value), so the only thing
// that marks an order as physical is the printer link. Checkout asks Stripe for an address
// only when fulfillment.plan(order).provider is set (commons/lib/checkout.mjs:171), so a
// maker-shipped order collects no address and the maker cannot ship.
// Fake Stripe only: no network, no credentials, no real payment, no provider call. The paid
// events are signed and verified exactly like market-order-ship-to.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('a maker-shipped order collects no address, and no stranger ever sees one', async (t) => {
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
    const { ordersPage, salesPage } = await import('../lib/marketpage.mjs');

    const add = (m) => { store.addMember({ created: new Date().toISOString(), ...m }); return store.getMember(m.id); };
    const seller = add({ id: 'h_maker_ships_seller', kind: 'human', name: 'Maker Ships Seller' });
    const buyer = add({ id: 'h_maker_ships_buyer', kind: 'human', name: 'Maker Ships Buyer' });
    const stranger = add({ id: 'h_maker_ships_stranger', kind: 'human', name: 'Maker Ships Stranger' });

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
    const makerListing = makeListing('Maker-shipped test work');
    const linkedListing = makeListing('Printer-linked test work');
    fulfillment.link(seller, linkedListing, { provider: 'printful', product_id: 'print_product_1', variant_ids: ['4012'] });

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
    const shippingDetails = { name: 'Buyer Delivery Name', address, phone: '+15550000000', carrier: 'not-part-of-name-or-address' };
    let makerOrder;
    let linkedOrder;

    await t.test('no listing field says physical or digital: the printer link is the only physical flag', () => {
      // commons/lib/market.mjs, TYPES = product, service, commission, collaboration, bounty, free.
      // LICENSES = all-rights, cc-by, cc-by-sa, cc-by-nc, cc0, mit, gpl, service. Neither enum has a
      // physical or digital value, and the listing object has no such key. The absence IS the finding.
      for (const [k, v] of Object.entries(market.TYPES)) assert.equal(/physical|digital|shippable/i.test(`${k} ${v}`), false, `TYPES.${k} = ${v}`);
      for (const [k, v] of Object.entries(market.LICENSES)) assert.equal(/physical|digital|shippable/i.test(`${k} ${v}`), false, `LICENSES.${k} = ${v}`);
      const l = market.get(makerListing);
      const marks = Object.entries(l).filter(([k, v]) => /physical|digital|shippable|ship_to|fulfil/i.test(k) || (typeof v === 'string' && /physical|digital/i.test(v)));
      assert.deepEqual(marks, [], 'the listing object carries no physical or digital marker');
      assert.equal(l.type, 'product');
      assert.equal(fulfillment.plan({ listing: makerListing, id: 'x' }).provider, null, 'no printer link means the maker ships it');
    });

    await t.test('a maker-shipped listing can still be checked out', async () => {
      makerOrder = await start(makerListing);
      assert.equal(typeof makerOrder.order, 'string');
      assert.ok(makerOrder.order.length > 0);
      assert.ok(sessionBodies.has(makerOrder.session), 'the fake Stripe recorded the session body');
    });

    await t.test('a maker-shipped checkout asks Stripe for a shipping address', {
      todo: 'main collects no address when there is no printer link: fulfillment.plan(order).provider is null, so shipping_address_collection is never set (commons/lib/checkout.mjs:171). The buyer is never asked where to send it.',
    }, () => {
      const body = sessionBodies.get(makerOrder.session);
      assert.equal(body.get('shipping_address_collection[allowed_countries][0]'), 'US', 'the buyer should be asked where to send it');
    });

    await t.test('a paid maker-shipped order promises delivery but carries no address the seller can use', () => {
      assert.equal(deliver(paidEvent(makerOrder, shippingDetails)).status, 'paid');
      const persisted = checkout.order(makerOrder.order);
      assert.equal(persisted.status, 'paid');
      const html = ordersPage({ me: buyer, purchases: checkout.ordersFor(buyer).purchases });
      assert.equal(html.includes('The maker ships it to you.'), true, 'the order page promises the maker ships it');
      for (const privateText of [address.line1, address.line2, address.postal_code, shippingDetails.name, shippingDetails.phone]) {
        assert.equal(html.includes(privateText), false, `order HTML contains ${JSON.stringify(privateText)}`);
        assert.equal(consoleLines.join('\n').includes(privateText), false, `application log contains ${JSON.stringify(privateText)}`);
      }
    });

    await t.test('the seller can reach the buyer address for a maker-shipped order', {
      todo: 'the maker cannot ship: no address is collected at checkout, and salesPage renders no address at all (commons/lib/marketpage.mjs:718). This is the gap to fix, in checkout.mjs and the sales page, both Tier 1.',
    }, () => {
      const sellerHtml = salesPage({ me: seller, sales: checkout.ordersFor(seller).sales });
      assert.equal(sellerHtml.includes(address.line1), true, 'the seller needs the address to ship');
    });

    await t.test('a stranger sees no row and no address for the order', () => {
      const strangerHtml = ordersPage({ me: stranger, purchases: checkout.ordersFor(stranger).purchases })
        + salesPage({ me: stranger, sales: checkout.ordersFor(stranger).sales });
      assert.equal(strangerHtml.includes('Maker-shipped test work'), false, 'a stranger sees no row for this order');
      for (const privateText of [address.line1, address.line2, address.postal_code, shippingDetails.name, shippingDetails.phone]) {
        assert.equal(strangerHtml.includes(privateText), false, `a stranger page contains ${JSON.stringify(privateText)}`);
      }
    });

    await t.test('the printer-linked order does get the address, and the seller page still hides it', async () => {
      linkedOrder = await start(linkedListing);
      const body = sessionBodies.get(linkedOrder.session);
      assert.equal(body.get('shipping_address_collection[allowed_countries][0]'), 'US');
      assert.equal(deliver(paidEvent(linkedOrder, shippingDetails)).status, 'paid');
      const persisted = checkout.order(linkedOrder.order);
      assert.equal(persisted.status, 'paid');
      assert.deepEqual(persisted.ship_to, { name: shippingDetails.name, address }, 'the linked order keeps name + address');
      assert.equal(fulfillment.plan(persisted).provider, 'printful', 'the printer link is what makes the order physical');
      const sellerHtml = salesPage({ me: seller, sales: checkout.ordersFor(seller).sales });
      assert.equal(sellerHtml.includes('Fulfillment details'), true, 'the seller gets a link to the fulfillment details');
      for (const privateText of [address.line1, address.line2, address.postal_code]) {
        assert.equal(sellerHtml.includes(privateText), false, `the sales page still contains ${JSON.stringify(privateText)}`);
      }
    });
  } finally {
    globalThis.fetch = oldFetch;
    for (const [k, fn] of Object.entries(oldConsole)) console[k] = fn;
    fs.rmSync(D, { recursive: true, force: true });
  }
});

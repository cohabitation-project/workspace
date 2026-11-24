// A paid print order gets its buyer's shipping address; an ordinary order does not.
// Fake Stripe only: no network, credentials, real payment, or provider call. The
// paid events are signed and verified exactly like market-paid-journey.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('print orders collect and persist only shipping_details name + address', async (t) => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-order-ship-to-'));
  const oldFetch = globalThis.fetch;
  const oldConsole = Object.fromEntries(['log', 'info', 'warn', 'error'].map((k) => [k, console[k]]));
  const consoleLines = [];
  try {
    process.env.COMMONS_DATA = D;
    process.env.COMMONS_PAYMENTS = 'stripe';
    process.env.STRIPE_SECRET_KEY = 'sk_test_ship_to';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_ship_to';
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
    const seller = add({ id: 'h_ship_to_seller', kind: 'human', name: 'Ship To Seller' });
    const buyer = add({ id: 'h_ship_to_buyer', kind: 'human', name: 'Ship To Buyer' });
    const sessionBodies = new Map();
    let sessionNumber = 0;
    const fakeStripe = async (url, init = {}) => {
      const p = new URL(url).pathname;
      const ok = (j) => ({ ok: true, status: 200, json: async () => j });
      if (p === '/v1/accounts' && init.method === 'POST') return ok({ id: 'acct_ship_to' });
      if (p === '/v1/account_links') return ok({ url: 'https://connect.stripe.test/onboard' });
      if (p === '/v1/accounts/acct_ship_to') return ok({ id: 'acct_ship_to', charges_enabled: true, payouts_enabled: true, details_submitted: true });
      if (p === '/v1/checkout/sessions') {
        const id = `cs_ship_to_${++sessionNumber}`;
        sessionBodies.set(id, new URLSearchParams(init.body));
        return ok({ id, url: `https://checkout.stripe.test/${id}`, client_secret: `${id}_secret` });
      }
      return { ok: false, status: 404, json: async () => ({ error: { message: 'unexpected fake Stripe request' } }) };
    };
    globalThis.fetch = fakeStripe;
    for (const k of Object.keys(oldConsole)) console[k] = (...args) => consoleLines.push(args.map(String).join(' '));

    await checkout.startPayoutAccount(seller, { base: 'https://cohabi.test', fetchImpl: fakeStripe });
    assert.equal((await checkout.refreshAccount(seller, { fetchImpl: fakeStripe })).status, 'verified');
    const makeListing = (title, extra = {}) => {
      const made = market.create(seller, {
        title, category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 },
        text: 'A test-only work', rights: true, made_by: 'human', license: 'all-rights', ...extra,
      });
      return made.id || made.listing?.id;
    };
    const linkedListing = makeListing('Linked print');
    // The maker said nothing is posted (physical: false), so no printer and no address. A maker-shipped product that
    // never answered now over-asks: that rule is pinned in market-maker-ships-address.mjs.
    const plainListing = makeListing('Digital work', { physical: false });
    const makerListing = makeListing('Maker ships it', { physical: true });
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
    let linked;
    let plain;

    await t.test('a provider-linked checkout asks Stripe for a US shipping address', async () => {
      linked = await start(linkedListing);
      const body = sessionBodies.get(linked.session);
      assert.equal(body.get('shipping_address_collection[allowed_countries][0]'), 'US');
      assert.deepEqual(body.getAll('shipping_address_collection[allowed_countries][0]'), ['US']);
    });

    await t.test('the signed paid webhook persists name + address, and no other shipping_details fields', () => {
      assert.equal(deliver(paidEvent(linked, shippingDetails)).status, 'paid');
      const persisted = checkout.order(linked.order);
      assert.equal(persisted.status, 'paid');
      assert.deepEqual(persisted.ship_to, { name: shippingDetails.name, address });
      assert.equal('phone' in persisted.ship_to, false);
      assert.equal('carrier' in persisted.ship_to, false);
      assert.deepEqual(fulfillment.plan(persisted).request.body.recipient, { name: 'Buyer Delivery Name', address1: '17 Private Test Street', address2: 'Apt 42', city: 'Tucson', state_code: 'AZ', country_code: 'US', zip: '85701' }, 'the stored name + Stripe address reach the printer translated into its own field names');
    });

    await t.test('an unlinked, physical:false checkout collects no address', async () => {
      plain = await start(plainListing);
      const body = sessionBodies.get(plain.session);
      assert.equal([...body.keys()].some((k) => k.startsWith('shipping_address_collection')), false);
    });

    await t.test('an unlinked paid order has no ship_to', () => {
      assert.equal(deliver(paidEvent(plain)).status, 'paid');
      assert.equal(checkout.order(plain.order).status, 'paid');
      assert.equal('ship_to' in checkout.order(plain.order), false);
    });

    // A maker-shipped product: the maker said it is posted, so the address is asked for, stored, and shown to them.
    const makerAddress = { line1: '9 Maker Street', line2: '', city: 'Bisbee', state: 'AZ', postal_code: '85603', country: 'US' };
    const makerDetails = { name: 'Maker Post Name', address: makerAddress, phone: '+15550000001' };
    let maker;
    await t.test('a maker-shipped checkout asks for an address and keeps it', async () => {
      maker = await start(makerListing);
      assert.equal(sessionBodies.get(maker.session).get('shipping_address_collection[allowed_countries][0]'), 'US');
      assert.equal(deliver(paidEvent(maker, makerDetails)).status, 'paid');
      assert.deepEqual(checkout.order(maker.order).ship_to, { name: makerDetails.name, address: makerAddress });
    });

    await t.test('no delivery address is printed to application logs or the buyer order-page HTML', () => {
      const purchases = checkout.ordersFor(buyer).purchases;
      const html = ordersPage({ me: buyer, purchases });
      for (const privateText of [address.line1, address.line2, address.postal_code, shippingDetails.phone, shippingDetails.carrier, makerAddress.line1, makerAddress.postal_code]) {
        assert.equal(html.includes(privateText), false, `the buyer's order HTML contains ${JSON.stringify(privateText)}`);
        assert.equal(consoleLines.join('\n').includes(privateText), false, `application log contains ${JSON.stringify(privateText)}`);
      }
      // Narrowed in round 51: the printer-linked sale shows no address on the seller's page either — the printer has it.
      const printerSale = checkout.ordersFor(seller).sales.filter((s) => s.id === linked.order);
      const printerHtml = salesPage({ me: seller, sales: printerSale });
      for (const privateText of [address.line1, address.line2, address.postal_code]) {
        assert.equal(printerHtml.includes(privateText), false, `the seller's page shows a printer address: ${JSON.stringify(privateText)}`);
      }
    });

    await t.test('the maker sees where to post a sale it ships itself — and no other member does', () => {
      const sales = checkout.ordersFor(seller).sales;
      const mine = salesPage({ me: seller, sales });
      assert.ok(mine.includes('Post to'), 'the seller needs a Post to block for a maker-shipped sale');
      for (const line of ['Maker Post Name', makerAddress.line1, '85603 Bisbee']) assert.ok(mine.includes(line), `the seller's page is missing ${JSON.stringify(line)}`);
      assert.equal(mine.includes(address.line1), false, 'the printer-linked address stays out of the seller page too');
      // Handed the seller's sales by mistake, another member still sees nothing: the guard is the seller id, not the list.
      const other = add({ id: 'h_ship_to_other', kind: 'human', name: 'Someone Else' });
      const theirs = salesPage({ me: other, sales });
      for (const line of ['Maker Post Name', makerAddress.line1, '85603 Bisbee']) assert.equal(theirs.includes(line), false, `another member saw ${JSON.stringify(line)}`);
      assert.equal(salesPage({ me: null, sales }).includes(makerAddress.line1), false, 'a signed-out page shows no address');
    });
  } finally {
    globalThis.fetch = oldFetch;
    for (const [k, fn] of Object.entries(oldConsole)) console[k] = fn;
    fs.rmSync(D, { recursive: true, force: true });
  }
});

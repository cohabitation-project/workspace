// Who ships it, and does the checkout know?
//
// Round 50 changed the question. Until this round `checkout.startCheckout` asked Stripe for a shipping address only
// when the order had a fulfillment provider (`fulfillment.plan(ord).provider`), and a listing had no physical/digital
// field at all — so an order the *maker* ships collected no address: paid, with nowhere to send it. Now a listing
// carries `physical` (true = post it, false = nothing is posted, null = the maker has not answered) and the checkout
// asks when `plan(ord).provider || (type === 'product' && physical !== false)`. Unanswered products over-ask on purpose.
// `handleEvent` was never the gap: it stores `ship_to` whenever Stripe sends shipping_details.
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
    const makeListing = (title, extra = {}) => {
      const made = market.create(seller, {
        title, category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 },
        text: 'A test-only work', rights: true, made_by: 'human', license: 'all-rights', ...extra,
      });
      return made.id || made.listing?.id;
    };
    const printed = makeListing('Printed by the printer');
    const makerShips = makeListing('Posted by the maker', { physical: true });
    const notPosted = makeListing('A file: nothing is posted', { physical: false });
    const service = makeListing('A service: nothing is posted', { type: 'service' });
    const unanswered = makeListing('Nobody said whether it is posted');
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

    await t.test('a maker-posted product asks for an address: the printer link is no longer the only route', async () => {
      assert.equal(market.get(makerShips).physical, true, 'the answer is stored and returned');
      assert.equal(fulfillment.plan({ listing: makerShips, id: 'ord_probe' }).provider, null, 'no provider: the maker is the shipper');
      makerOrder = await start(makerShips);
      assert.deepEqual(
        makerOrder.body.getAll('shipping_address_collection[allowed_countries][0]'),
        ['US'],
        'a maker-shipped product is a thing that must be posted: its checkout now collects the address',
      );
    });

    await t.test('an unanswered product over-asks rather than under-asks', async () => {
      assert.equal(market.get(unanswered).physical, null, 'absent reads as unanswered, never as "nothing is posted"');
      const o = await start(unanswered);
      assert.deepEqual(o.body.getAll('shipping_address_collection[allowed_countries][0]'), ['US']);
    });

    await t.test('physical:false asks nothing: a download needs no postal address', async () => {
      const o = await start(notPosted);
      assert.equal([...o.body.keys()].some((k) => k.startsWith('shipping_address_collection')), false);
    });

    await t.test('a service asks nothing, answered or not', async () => {
      const o = await start(service);
      assert.equal([...o.body.keys()].some((k) => k.startsWith('shipping_address_collection')), false);
    });

    await t.test('the answer is true, false or absent; anything else is refused by name', async () => {
      assert.throws(
        () => makeListing('A string answer', { physical: 'yes' }),
        (e) => e.status === 400 && /physical/.test(e.message),
        'a 400 that names the field, not a silent coercion',
      );
      // The contradiction Ash flagged: a listing marked "not posted" with a printer linked still needs an address.
      // The checkout keeps asking (a printer order cannot ship without one); refusing that pair on the listing form
      // is the next round's edit.
      const contradictory = makeListing('Not posted, but printer-linked', { physical: false });
      fulfillment.link(seller, contradictory, { provider: 'printful', product_id: 'print_product_2', variant_ids: ['4012'] });
      const o = await start(contradictory);
      assert.deepEqual(o.body.getAll('shipping_address_collection[allowed_countries][0]'), ['US']);
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

// Round 44 (DeepSeek): a buyer's address reaches each printer in that printer's own field names.
// Stripe's shape is what checkout stores: { name, address: { line1, line2, city, state, postal_code, country } }.
// Printful, Printify and Lulu each refuse the others' names, so the translation is proven here, and the refusal for an
// order with no address is proven to happen with ZERO provider calls (Lulu's sign-in is a call too).
// Fake provider only: no network, no real keys, no real money.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const STRIPE = {
  name: 'Ada Lovelace King',
  address: { line1: '17 Private Test Street', line2: 'Apt 42', city: 'Tucson', state: 'AZ', postal_code: '85701', country: 'US' },
};
const is409 = (e) => (e.status ?? e.code) === 409 && /no shipping address/i.test(e.message);

test('ship_to reaches each printer in its own shape, and never with invented contact details', async (t) => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'fulfillment-ship-to-'));
  const oldEnv = { ...process.env };
  const oldFetch = globalThis.fetch;
  try {
    // Payments open (fake key only) is what send() needs to get as far as the address check.
    process.env.COMMONS_DATA = D;
    process.env.COMMONS_PAYMENTS = 'stripe';
    process.env.STRIPE_SECRET_KEY = 'sk_test_ship_to_shapes';
    process.env.COMMONS_PUBLIC_URL = 'https://cohabi.test';
    process.env.LULU_CLIENT_KEY = 'lulu_key_fake';
    process.env.LULU_CLIENT_SECRET = 'lulu_secret_fake';
    process.env.PRINTFUL_TOKEN = 'printful_fake_token';
    process.env.PRINTFUL_STORE_ID = '1234';
    process.env.PRINTIFY_TOKEN = 'printify_fake_token';
    process.env.PRINTIFY_SHOP_ID = '555';

    const store = await import('../lib/store.mjs'); store.init(D);
    const market = await import('../lib/market.mjs'); market.init(D);
    const fulfillment = await import('../lib/fulfillment.mjs'); fulfillment.init(D);

    const seller = (() => {
      store.addMember({ created: new Date().toISOString(), id: 'h_ship_shapes_seller', kind: 'human', name: 'Shapes Seller' });
      return store.getMember('h_ship_shapes_seller');
    })();
    const listing = (title) => {
      const made = market.create(seller, {
        title, category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 },
        text: 'A test-only work', rights: true, made_by: 'human', license: 'all-rights',
      });
      return made.id || made.listing?.id;
    };
    const pf = listing('Printful tee');
    const py = listing('Printify hoodie');
    const lu = listing('Lulu paperback');
    fulfillment.link(seller, pf, { provider: 'printful', product_id: 'print_product_1', variant_ids: ['4012'] });
    fulfillment.link(seller, py, { provider: 'printify', product_id: 'printify_product_1', variant_ids: ['90210'] });
    fulfillment.link(seller, lu, { provider: 'lulu', product_id: 'lulu_book_1', variant_ids: ['0618X'], sku: '0608342782' });

    await t.test('recipientFor: three printers, three sets of field names, and nothing invented', () => {
      assert.deepEqual(fulfillment.recipientFor('printful', STRIPE), {
        name: 'Ada Lovelace King', address1: '17 Private Test Street', address2: 'Apt 42',
        city: 'Tucson', state_code: 'AZ', country_code: 'US', zip: '85701',
      });
      assert.deepEqual(fulfillment.recipientFor('printify', STRIPE), {
        first_name: 'Ada Lovelace', last_name: 'King', address1: '17 Private Test Street', address2: 'Apt 42',
        city: 'Tucson', region: 'AZ', country: 'US', zip: '85701',
      });
      assert.deepEqual(fulfillment.recipientFor('lulu', STRIPE), {
        name: 'Ada Lovelace King', street1: '17 Private Test Street', street2: 'Apt 42',
        city: 'Tucson', state_code: 'AZ', country_code: 'US', postcode: '85701',
      });
      // No email and no phone: we never collect them, and a printer treats both as real contact data.
      for (const p of ['printful', 'printify', 'lulu']) {
        const keys = Object.keys(fulfillment.recipientFor(p, STRIPE));
        assert.equal(keys.some((k) => /mail|phone/i.test(k)), false, `${p} was given a contact field: ${keys.join(',')}`);
      }
      // A one-word name is not sliced in two: it stays whole, with an honest empty family name.
      assert.deepEqual(fulfillment.recipientFor('printify', { name: 'Cher', address: STRIPE.address }),
        { first_name: 'Cher', last_name: '', address1: '17 Private Test Street', address2: 'Apt 42', city: 'Tucson', region: 'AZ', country: 'US', zip: '85701' });
      // No address at all, and an address with no street line, both give null rather than a blank order.
      assert.equal(fulfillment.recipientFor('printful', undefined), null);
      assert.equal(fulfillment.recipientFor('printful', { name: 'No Street', address: { city: 'Tucson' } }), null);
      assert.equal(fulfillment.hasAddress({}), false);
      assert.equal(fulfillment.hasAddress(STRIPE), true);
    });

    await t.test('plan() carries the shaped address for each linked provider', () => {
      const base = { status: 'paid', quantity: 1, ship_to: STRIPE };
      const body = (l, id) => fulfillment.plan({ ...base, id, listing: l, title: 'T' }).request.body;
      assert.deepEqual(body(pf, 'ord_pf').recipient, fulfillment.recipientFor('printful', STRIPE));
      assert.deepEqual(body(py, 'ord_py').address_to, fulfillment.recipientFor('printify', STRIPE));
      assert.deepEqual(body(lu, 'ord_lu').shipping_address, fulfillment.recipientFor('lulu', STRIPE));
      // The Stripe field names must not survive into any provider body.
      for (const b of [body(pf, 'a'), body(py, 'b'), body(lu, 'c')]) {
        const seen = JSON.stringify(b);
        assert.equal(/line1|postal_code|"address"/.test(seen), false, `Stripe's field names reached a printer: ${seen.slice(0, 200)}`);
      }
    });

    await t.test('send() refuses an order with no shipping address, and makes ZERO provider calls', async () => {
      let calls = 0;
      const never = async () => { calls += 1; throw new Error('a provider was called for an address-less order'); };
      for (const [l, id] of [[pf, 'ord_no_addr_pf'], [py, 'ord_no_addr_py'], [lu, 'ord_no_addr_lu']]) {
        await assert.rejects(fulfillment.send({ id, listing: l, status: 'paid', quantity: 1 }, { fetchImpl: never }), is409, `${l} did not refuse`);
      }
      // Also refuses when ship_to exists but carries no street line.
      await assert.rejects(fulfillment.send({ id: 'ord_no_street', listing: pf, status: 'paid', quantity: 1, ship_to: { name: 'X', address: { city: 'Tucson' } } }, { fetchImpl: never }), is409);
      assert.equal(calls, 0, 'an address-less order reached a provider');
    });

    await t.test('send() posts the shaped address (Printful), and the token call plus the shaped address (Lulu)', async () => {
      const seen = [];
      const fake = async (url, init = {}) => {
        const reply = { ok: true, status: 200, json: async () => ({ id: 'prov_1', access_token: 'tok_fake_not_real' }) };
        seen.push({ url: String(url), body: init.body ? JSON.parse(String(init.body).startsWith('grant_type') ? '{}' : String(init.body)) : null, auth: init.headers?.authorization });
        return reply;
      };
      const out = await fulfillment.send({ id: 'ord_ok_pf', listing: pf, status: 'paid', quantity: 1, ship_to: STRIPE }, { fetchImpl: fake });
      assert.equal(out.provider, 'printful');
      assert.equal(seen.length, 1);
      assert.equal(seen[0].url, 'https://api.printful.com/orders');
      assert.deepEqual(seen[0].body.recipient, fulfillment.recipientFor('printful', STRIPE));

      seen.length = 0;
      await fulfillment.send({ id: 'ord_ok_lu', listing: lu, status: 'paid', quantity: 1, title: 'Book', ship_to: STRIPE }, { fetchImpl: fake });
      assert.equal(seen.length, 2, 'Lulu: sign-in, then the print job');
      assert.match(seen[0].url, /openid-connect\/token$/);
      assert.match(seen[1].url, /\/print-jobs\/$/);
      assert.deepEqual(seen[1].body.shipping_address, fulfillment.recipientFor('lulu', STRIPE));
    });
  } finally {
    globalThis.fetch = oldFetch;
    for (const k of ['COMMONS_DATA', 'COMMONS_PAYMENTS', 'STRIPE_SECRET_KEY', 'COMMONS_PUBLIC_URL', 'LULU_CLIENT_KEY', 'LULU_CLIENT_SECRET', 'PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID', 'PRINTIFY_TOKEN', 'PRINTIFY_SHOP_ID']) {
      if (oldEnv[k] === undefined) delete process.env[k]; else process.env[k] = oldEnv[k];
    }
    fs.rmSync(D, { recursive: true, force: true });
  }
});
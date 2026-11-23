// Buyer-facing fulfillment words on /orders. Direct rendering only: no server, provider, payment or network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('a paid order tells its buyer how it will be fulfilled, without provider internals', async (t) => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-order-fulfillment-words-'));
  const oldFetch = globalThis.fetch;
  const oldEnv = Object.fromEntries(['COMMONS_DATA', 'PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID', 'PRINTFUL_API_URL'].map((k) => [k, process.env[k]]));
  try {
    process.env.COMMONS_DATA = D;
    process.env.PRINTFUL_TOKEN = 'pf_secret_buyer_must_not_see';
    process.env.PRINTFUL_STORE_ID = 'store_env_buyer_must_not_see';
    delete process.env.PRINTFUL_API_URL;
    globalThis.fetch = async () => { throw new Error('this view test must not use the network'); };

    const store = await import('../lib/store.mjs');
    const market = await import('../lib/market.mjs');
    const checkout = await import('../lib/checkout.mjs');
    const fulfillment = await import('../lib/fulfillment.mjs');
    const { ordersPage } = await import('../lib/marketpage.mjs');
    store.init(D); market.init(D); checkout.init(D); fulfillment.init(D);

    const add = (m) => { store.addMember({ created: new Date().toISOString(), ...m }); return store.getMember(m.id); };
    const seller = add({ id: 'h_fulfillment_words_seller', kind: 'human', name: 'Fulfillment Seller' });
    const buyer = add({ id: 'h_fulfillment_words_buyer', kind: 'human', name: 'Fulfillment Buyer' });
    const makeListing = (title) => market.create(seller, {
      title, text: 'A test-only paid order.', category: 'art', type: 'product', rights: true,
      price: { mode: 'fixed', amount: 20 }, license: 'all-rights', made_by: 'human',
    });
    const unlinked = makeListing('Maker shipped print');
    const linked = makeListing('Printful shipped print');
    fulfillment.link(seller, linked.id, {
      provider: 'printful', product_id: 'product_raw_buyer_must_not_see',
      variant_ids: ['variant_raw_buyer_must_not_see'], sku: 'sku_raw_buyer_must_not_see',
    });

    const seedPaid = (listing, suffix) => {
      const order = {
        id: `ord_fulfillment_words_${suffix}`, listing: listing.id, title: listing.title,
        buyer: buyer.id, seller: seller.id, amount: 20, currency: 'USD', mode: 'test', status: 'paid',
        ts: `2026-11-23T09:00:0${suffix === 'unlinked' ? '1' : '2'}.000Z`, quantity: 1,
        ship_to: { name: 'recipient_raw_buyer_must_not_see', address1: 'address_raw_buyer_must_not_see' },
      };
      fs.appendFileSync(path.join(D, 'payments', 'orders.jsonl'), JSON.stringify({ op: 'create', order }) + '\n', { mode: 0o600 });
      return order;
    };
    const cases = [
      { key: 'unlinked', listing: unlinked, order: seedPaid(unlinked, 'unlinked') },
      { key: 'printful', listing: linked, order: seedPaid(linked, 'printful') },
    ];

    for (const c of cases) {
      assert.equal(c.order.status, 'paid');
      const planned = fulfillment.plan(c.order);
      if (c.key === 'unlinked') assert.match(planned.why, /maker ships it/);
      else assert.equal(planned.provider, 'printful');
      const purchase = checkout.ordersFor(buyer).purchases.find((o) => o.id === c.order.id);
      assert.ok(purchase, `${c.key}: the paid order is visible to its buyer`);
      c.html = ordersPage({ me: buyer, purchases: [purchase] });
      assert.match(c.html, /<p class="mk-order-status">Paid<\/p>/);
    }

    await t.test('an unlinked listing says the maker ships it', () => {
      assert.match(cases[0].html, /maker ships it/i);
    });
    await t.test('a Printful-linked listing says a printer will make and ship it', () => {
      assert.match(cases[1].html, /(?:Printful|print partner)/i);
      assert.match(cases[1].html, /ship/i);
    });

    for (const c of cases) {
      await t.test(`${c.key}: no provider key, environment name or raw request body reaches the buyer`, () => {
        for (const canary of [
          'pf_secret_buyer_must_not_see', 'store_env_buyer_must_not_see',
          'product_raw_buyer_must_not_see', 'variant_raw_buyer_must_not_see', 'sku_raw_buyer_must_not_see',
          'recipient_raw_buyer_must_not_see', 'address_raw_buyer_must_not_see',
          'PRINTFUL_TOKEN', 'PRINTFUL_STORE_ID', 'PRINTFUL_API_URL',
          'external_id', 'sync_variant_id', 'ship_to',
        ]) assert.ok(!c.html.includes(canary), `${c.key}: buyer page leaked ${canary}`);
        assert.doesNotMatch(c.html, /&quot;(?:recipient|items)&quot;|"(?:recipient|items)"/);
      });
    }
  } finally {
    globalThis.fetch = oldFetch;
    for (const [k, v] of Object.entries(oldEnv)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    fs.rmSync(D, { recursive: true, force: true });
  }
});

// Round 57 (DeepSeek): the seller sees where the printer stands.
// Server-free and network-free: a real listing linked to Printful, a paid order, and one `fulfillment` line written
// straight into a temp data dir — then the sales page is rendered from it. No Stripe, no printer, no server.
//
// What it pins (the two states #300 can leave behind):
//  - a draft order says "At Printful as a draft (#PF-1001)", not "Sent to Printful";
//  - a refused order says "Printful refused this order", not "Sent to Printful";
//  - the printer's own `error` text (which can name its account or base cost) never reaches the page, for either viewer;
//  - the buyer's copy of the page carries nothing of the printer at all.
// Not pinned here: a fulfilled order still saying "Sent to <printer>" — commons/test/market-sales-ship-to.mjs holds that
// (one case per printer), so this file must keep it green, not re-test it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ship = (line1) => ({ name: 'Rae Buyer', address: { line1, line2: '', city: 'Bristol', postal_code: 'BS1 1AA', state: '', country: 'GB' } });
const row = (r) => JSON.stringify({ ts: '2026-11-25T00:00:00.000Z', ...r });

for (const [state, err] of [['draft', null], ['failed', 'Base cost not set for this variant']]) {
  test(`a ${state} printer order tells the seller, and the printer's error stays off the page`, async () => {
    const D = fs.mkdtempSync(path.join(os.tmpdir(), `market-sales-printer-${state}-`));
    process.env.COMMONS_DATA = D;
    fs.mkdirSync(path.join(D, 'payments'), { recursive: true });

    const store = await import('../lib/store.mjs'); store.init(D);
    const market = await import('../lib/market.mjs'); market.init(D);
    store.addMember({ created: new Date().toISOString(), id: 'h_ps_seller', kind: 'human', name: 'Print Seller' });
    store.addMember({ created: new Date().toISOString(), id: 'h_ps_buyer', kind: 'human', name: 'Rae Buyer' });
    const seller = store.getMember('h_ps_seller');
    const buyer = store.getMember('h_ps_buyer');
    assert.ok(seller && buyer, 'both members seeded');

    // A real listing linked to Printful: fulfillment.link() only accepts a listing its caller owns, so a bare order row
    // cannot stand in for this (round 56 hit the same wall).
    const made = market.create(seller, {
      title: 'Printful poster', category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 },
      text: 'A test-only work', rights: true, made_by: 'human', license: 'all-rights', physical: true,
    });
    const listing = made.id || made.listing?.id;
    assert.ok(listing, 'the printful-linked listing exists');
    const fulfillment = await import('../lib/fulfillment.mjs');
    fulfillment.init(D);
    fulfillment.link(seller, listing, { provider: 'printful', product_id: 'pf-12345', variant_ids: ['4011'] });

    fs.writeFileSync(path.join(D, 'payments', 'orders.jsonl'), [
      row({ op: 'create', order: { id: 'ord_ps', listing, title: 'Printful poster', amount: 25, currency: 'USD', mode: 'test', status: 'awaiting_payment', ts: '2026-11-25T00:00:00.000Z', buyer: buyer.id, seller: seller.id } }),
      row({ op: 'status', order: 'ord_ps', status: 'paid', ship_to: ship('9 Dock Road') }),
      row({ op: 'fulfillment', order: 'ord_ps', fulfillment: { provider: 'printful', provider_order: 'PF-1001', state, ...(err ? { error: err } : {}) } }),
    ].join('\n') + '\n');

    const checkout = await import('../lib/checkout.mjs'); checkout.init(D);
    const { salesPage } = await import('../lib/marketpage.mjs');
    const { sales } = checkout.ordersFor(seller);
    assert.equal(sales.length, 1, 'the paid order is listed for the seller');
    assert.equal(sales[0].printer?.state, state, 'the seller record carries the printer state');

    const mine = salesPage({ me: seller, sales });
    assert.ok(mine.includes(`data-printer-state="${state}"`), `the seller is told the order is ${state}`);
    assert.ok(mine.includes('PF-1001'), 'and by which printer order');
    assert.ok(!mine.includes('data-sent-to'), `a ${state} order is not presented as sent`);
    assert.ok(!mine.includes('9 Dock Road'), 'and there is still no address on the seller page');
    if (err) assert.ok(!mine.includes(err), "the printer's error text never reaches the seller page");

    const theirs = salesPage({ me: buyer, sales });
    assert.ok(!theirs.includes('data-printer-state') && !theirs.includes('PF-1001'), 'the buyer sees nothing of the printer');
    if (err) assert.ok(!theirs.includes(err), "and not the printer's error");
  });
}

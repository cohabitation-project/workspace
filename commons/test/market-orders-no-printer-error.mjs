// Round 59 (DeepSeek): the buyer never sees the printer's words.
// Server-free and network-free: a real Printful-linked listing, a paid order, and one `failed` fulfillment carrying the
// printer's own refusal text, written straight into a temp data dir. Then both pages are rendered from it.
//
// What it pins:
//  - the buyer's orders page says nothing of the printer: not its refusal text, not the number in it, not its own
//    order id — while still showing the order the buyer paid for;
//  - the seller's page says the printer refused it, and still does not repeat the printer's words (round 57's half);
//  - the records behind the pages (`/api/me/orders`, server.mjs:1745-1749) carry the printer's state and not its
//    `error` — that is where `checkout.printerShown` is the only thing standing between the printer's text and the buyer;
//  - the seed is real: the secret is in the stored order, so "not on the page" means the page dropped it, not that it
//    was never there.
// Not pinned here: a fulfilled order still saying "Sent to <printer>" (commons/test/market-sales-ship-to.mjs, one case
// per printer) or the draft case (commons/test/market-sales-printer-state.mjs). This file must keep those green.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const SECRET = 'secret printer text 4242';
const ship = (line1) => ({ name: 'Rae Buyer', address: { line1, line2: '', city: 'Bristol', postal_code: 'BS1 1AA', state: '', country: 'GB' } });
const row = (r) => JSON.stringify({ ts: '2026-11-25T00:00:00.000Z', ...r });

// A paid shirt order whose printer refused it, with the printer's own words on the stored order.
async function seed(tag) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), `market-buyer-printer-${tag}-`));
  process.env.COMMONS_DATA = D;
  fs.mkdirSync(path.join(D, 'payments'), { recursive: true });

  const store = await import('../lib/store.mjs'); store.init(D);
  const market = await import('../lib/market.mjs'); market.init(D);
  store.addMember({ created: new Date().toISOString(), id: 'h_bp_seller', kind: 'human', name: 'Print Seller' });
  store.addMember({ created: new Date().toISOString(), id: 'h_bp_buyer', kind: 'human', name: 'Rae Buyer' });
  const seller = store.getMember('h_bp_seller');
  const buyer = store.getMember('h_bp_buyer');
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
    row({ op: 'create', order: { id: 'ord_bp', listing, title: 'Printful poster', amount: 25, currency: 'USD', mode: 'test', status: 'awaiting_payment', ts: '2026-11-25T00:00:00.000Z', buyer: buyer.id, seller: seller.id } }),
    row({ op: 'status', order: 'ord_bp', status: 'paid', ship_to: ship('9 Dock Road') }),
    row({ op: 'fulfillment', order: 'ord_bp', fulfillment: { provider: 'printful', provider_order: 'PF-1001', state: 'failed', error: SECRET } }),
  ].join('\n') + '\n');

  const checkout = await import('../lib/checkout.mjs'); checkout.init(D);
  return { D, seller, buyer, checkout };
}

test('the buyer is told nothing of the printer; the seller is told it refused, in its own words', async () => {
  const { seller, buyer, checkout } = await seed('pages');
  const { purchases } = checkout.ordersFor(buyer);
  const { sales } = checkout.ordersFor(seller);
  assert.equal(purchases.length, 1, 'the buyer has the paid order');
  assert.equal(purchases[0].printer?.state, 'failed', 'and the record behind it knows the printer refused');

  const { ordersPage, salesPage } = await import('../lib/marketpage.mjs');

  const theirs = ordersPage({ me: buyer, purchases });
  assert.ok(theirs.includes('Printful poster') && theirs.includes('Paid'), 'the buyer page rendered the paid order');
  assert.ok(!theirs.includes('secret printer text'), "the printer's words are not on the buyer's page");
  assert.ok(!theirs.includes('4242'), 'nor the number in them');
  assert.ok(!theirs.includes('PF-1001'), "nor the printer's own order id");

  const mine = salesPage({ me: seller, sales });
  assert.ok(mine.includes('data-printer-state="failed"'), 'the seller is told the printer refused it');
  assert.ok(mine.includes('PF-1001'), 'and by which printer order');
  assert.ok(!mine.includes('secret printer text'), "the seller is not shown the printer's words either");
  assert.ok(!mine.includes('4242'), 'nor the number in them');
  assert.ok(!mine.includes('9 Dock Road'), 'and the address stays off the seller page');
});

test('the records behind the pages carry the printer state and never its error', async () => {
  const { D, seller, buyer, checkout } = await seed('records');
  const stored = fs.readFileSync(path.join(D, 'payments', 'orders.jsonl'), 'utf8');
  assert.ok(stored.includes(SECRET), 'the secret really is in the stored order, so absence below means it was dropped');

  const theirs = JSON.stringify(checkout.ordersFor(buyer).purchases);
  const mine = JSON.stringify(checkout.ordersFor(seller).sales);
  assert.ok(theirs.includes('"state":"failed"'), 'the buyer record does carry the printer state');
  assert.ok(!theirs.includes('secret printer text') && !theirs.includes('4242'), "and not the printer's words");
  assert.ok(mine.includes('"state":"failed"'), 'the seller record carries it too');
  assert.ok(!mine.includes('secret printer text') && !mine.includes('4242'), "and not the printer's words");
});

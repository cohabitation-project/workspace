// Round 62 (DeepSeek): a refused order offers its maker the button that sends it again — and only a refused order.
// Server-free and network-free: a real listing linked to Printful, a paid order, and one `fulfillment` line written
// straight into a temp data dir — then the sales page is rendered from it. No Stripe, no printer, no server.
//
// Pinned here:
//  - failed:  "You can send it again.", a button `data-printer-send="<order id>"`, and an empty role="status" span;
//  - sent:    no button (the printer already has it);
//  - draft:   no button (a person still has to confirm it);
//  - no state at all: no button (an older record the printer already has — round 60's rule);
//  - /orders: the buyer's copy carries neither the button nor the sentence.
// The click itself is NOT wired this round (job, Setu): commons/public/market.js has no data-printer-send handler yet,
// so this file asserts the page loads the script that will carry it, and the order id that handler will need. Do not
// read a green here as "the button works" — it is the page's half of it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ship = (line1) => ({ name: 'Rae Buyer', address: { line1, line2: '', city: 'Bristol', postal_code: 'BS1 1AA', state: '', country: 'GB' } });
const row = (r) => JSON.stringify({ ts: '2026-11-25T00:00:00.000Z', ...r });

// A seller, a buyer, a Printful-linked listing, and one paid order whose fulfillment record is `fulfillment` (or null).
async function scene(fulfillmentRec) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-sales-resend-'));
  process.env.COMMONS_DATA = D;
  fs.mkdirSync(path.join(D, 'payments'), { recursive: true });

  const store = await import('../lib/store.mjs'); store.init(D);
  const market = await import('../lib/market.mjs'); market.init(D);
  store.addMember({ created: new Date().toISOString(), id: 'h_rb_seller', kind: 'human', name: 'Print Seller' });
  store.addMember({ created: new Date().toISOString(), id: 'h_rb_buyer', kind: 'human', name: 'Rae Buyer' });
  const seller = store.getMember('h_rb_seller');
  const buyer = store.getMember('h_rb_buyer');
  assert.ok(seller && buyer, 'both members seeded');

  // fulfillment.link() only accepts a listing its caller owns, so a bare order row cannot stand in for this.
  const made = market.create(seller, {
    title: 'Printful poster', category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 },
    text: 'A test-only work', rights: true, made_by: 'human', license: 'all-rights', physical: true,
  });
  const listing = made.id || made.listing?.id;
  assert.ok(listing, 'the printful-linked listing exists');
  const fulfillment = await import('../lib/fulfillment.mjs');
  fulfillment.init(D);
  fulfillment.link(seller, listing, { provider: 'printful', product_id: 'pf-12345', variant_ids: ['4011'] });

  const lines = [
    row({ op: 'create', order: { id: 'ord_rb', listing, title: 'Printful poster', amount: 25, currency: 'USD', mode: 'test', status: 'awaiting_payment', ts: '2026-11-25T00:00:00.000Z', buyer: buyer.id, seller: seller.id } }),
    row({ op: 'status', order: 'ord_rb', status: 'paid', ship_to: ship('9 Dock Road') }),
  ];
  if (fulfillmentRec) lines.push(row({ op: 'fulfillment', order: 'ord_rb', fulfillment: fulfillmentRec }));
  fs.writeFileSync(path.join(D, 'payments', 'orders.jsonl'), lines.join('\n') + '\n');

  const checkout = await import('../lib/checkout.mjs'); checkout.init(D);
  const pages = await import('../lib/marketpage.mjs');
  const { sales, purchases } = checkout.ordersFor(seller);
  const theirs = checkout.ordersFor(buyer);
  assert.equal(sales.length, 1, 'the paid order is listed for the seller');
  return {
    seller, buyer, checkout, pages,
    mine: pages.salesPage({ me: seller, sales }),
    buyerPage: pages.ordersPage({ me: buyer, purchases: theirs.purchases }),
    buyerSales: pages.salesPage({ me: buyer, sales }), // the seller's list, rendered for someone else
  };
}

test('a refused order offers "Send it again", with the order id and an empty status line', async () => {
  const s = await scene({ provider: 'printful', provider_order: 'PF-1001', state: 'failed', error: 'Base cost not set for this variant' });
  assert.ok(s.mine.includes('data-printer-state="failed"'), 'the seller is told the printer refused it');
  assert.ok(s.mine.includes('You can send it again.'), 'and that they can send it again');
  assert.ok(s.mine.includes('data-printer-send="ord_rb"'), 'the button names the order to send');
  assert.match(s.mine, /<button[^>]*data-printer-send="ord_rb"[^>]*>Send it again<\/button>/, 'the button reads "Send it again"');
  assert.match(s.mine, /<span class="small" role="status"><\/span>/, 'and an empty status line stands beside it');
  assert.match(s.mine, /\/static\/market\.js/, 'the page loads the script that carries the click');
  assert.ok(!s.mine.includes('Base cost not set'), "the printer's error text never reaches the seller page");
});

test('an order the printer has (sent) offers no button', async () => {
  const s = await scene({ provider: 'printful', provider_order: 'PF-1002', state: 'sent' });
  assert.ok(s.mine.includes('data-sent-to'), 'it is presented as sent');
  assert.ok(!s.mine.includes('data-printer-send'), 'so there is nothing to send again');
  assert.ok(!s.mine.includes('You can send it again.'), 'and the page does not offer it');
});

test('a draft offers no button: a person still has to confirm it', async () => {
  const s = await scene({ provider: 'printful', provider_order: 'PF-1003', state: 'draft' });
  assert.ok(s.mine.includes('data-printer-state="draft"'), 'the seller is told it is a draft');
  assert.ok(!s.mine.includes('data-printer-send'), 'a draft is not refused, so there is no resend button');
});

test('an older record with no state offers no button', async () => {
  const s = await scene({ provider: 'printful', provider_order: 'PF-1004' });
  assert.ok(!s.mine.includes('data-printer-send'), 'no state means the printer already has it, not that it needs sending');
});

test("the buyer's copy carries neither the button nor the sentence", async () => {
  const s = await scene({ provider: 'printful', provider_order: 'PF-1005', state: 'failed', error: 'Base cost not set for this variant' });
  for (const [where, html] of [['/orders', s.buyerPage], ['the seller list for another viewer', s.buyerSales]]) {
    assert.ok(!html.includes('data-printer-send'), `no button on ${where}`);
    assert.ok(!html.includes('You can send it again.'), `and no such sentence on ${where}`);
  }
  // The buyer's /orders does say a refused order was refused, in its own words (rounds 57/59, ordersPage's
  // data-printer-state) — that is meant. What must never reach it is the way to send it again.
  assert.ok(s.buyerPage.includes('data-printer-state="failed"'), "the buyer is still told it was refused");
  assert.ok(!s.buyerSales.includes('data-printer-state'), "but the seller's page shows nothing of the printer to another viewer");
});

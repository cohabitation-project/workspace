// Round 54 (DeepSeek): the seller sees where to post it — and only the seller.
// Server-free and network-free: the order log is written straight into a temp data dir, then the sales page is
// rendered from it, so nothing here needs Stripe, a printer, or a running server.
//
// What it pins:
//  - a paid order on a maker-shipped listing shows its buyer's address to the seller ("Post to" + the lines);
//  - the same page rendered for someone who is not the seller carries no address;
//  - every field is escaped: a <script> in a line comes out as text, never as a tag.
// NOT pinned here (see teams/build/outputs/round54-deepseek-sales-address.md): the "Sent to <printer>" line for a
// printer-linked order needs a real market listing + fulfillment.link, which this file does not build.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ship = (line1) => ({ name: 'Rae Buyer', address: { line1, line2: 'Flat 2', city: 'Bristol', postal_code: 'BS1 1AA', state: '', country: 'GB' } });
const row = (r) => JSON.stringify({ ts: '2026-11-25T00:00:00.000Z', ...r });
const created = (id, listing, title) => ({ op: 'create', order: { id, listing, title, amount: 20, currency: 'USD', mode: 'test', status: 'awaiting_payment', ts: `2026-11-25T00:0${id.length % 9}:00.000Z`, buyer: 'h_ship_buyer', seller: 'h_ship_seller' } });

test('the sales page shows the buyer address to the seller only, escaped', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-sales-ship-to-'));
  process.env.COMMONS_DATA = D;
  fs.mkdirSync(path.join(D, 'payments'), { recursive: true });
  fs.writeFileSync(path.join(D, 'payments', 'orders.jsonl'), [
    row(created('ord_paper', 'l_paper', 'Lino print, by hand')),
    row({ op: 'status', order: 'ord_paper', status: 'paid', ship_to: ship('1 High Street') }),
    row(created('ord_xss', 'l_xss', 'Notebook')),
    // The address is the buyer's own typing. It must never become markup on the seller's page.
    row({ op: 'status', order: 'ord_xss', status: 'paid', ship_to: ship('2 <script>alert(1)</script> Lane') }),
  ].join('\n') + '\n');

  const store = await import('../lib/store.mjs'); store.init(D);
  const market = await import('../lib/market.mjs'); market.init(D);
  const checkout = await import('../lib/checkout.mjs'); checkout.init(D);
  await import('../lib/fulfillment.mjs');
  const { salesPage } = await import('../lib/marketpage.mjs');

  store.addMember({ created: new Date().toISOString(), id: 'h_ship_seller', kind: 'human', name: 'Ship Seller' });
  store.addMember({ created: new Date().toISOString(), id: 'h_ship_buyer', kind: 'human', name: 'Rae Buyer' });
  const seller = store.getMember('h_ship_seller');
  const buyer = store.getMember('h_ship_buyer');
  assert.ok(seller && buyer, 'both members seeded');

  const { sales } = checkout.ordersFor(seller);
  assert.equal(sales.length, 2, 'both paid orders are listed for the seller');

  const mine = salesPage({ me: seller, sales });
  assert.match(mine, /data-post-to/, 'the seller gets the post-to block');
  for (const line of ['Rae Buyer', '1 High Street', 'Flat 2', 'BS1 1AA', 'Bristol']) {
    assert.ok(mine.includes(line), `the seller sees "${line}"`);
  }
  assert.ok(!mine.includes('<script>alert(1)</script>'), 'a line that is markup is escaped, not rendered');
  assert.ok(mine.includes('&lt;script&gt;'), 'the same line arrives as visible text');

  const theirs = salesPage({ me: buyer, sales });
  assert.ok(!theirs.includes('1 High Street') && !theirs.includes('BS1 1AA'), 'the buyer’s page carries no address');
  assert.ok(!theirs.includes('data-post-to'), 'and no post-to block at all');
});

// Round 55 (DeepSeek): a printer-linked listing tells the seller where the order went — and still shows no address.
// Why this case exists at all: the "Sent to <printer>" line landed on main but could never appear. The order block
// called fulfillment.plan() while a local `const fulfillment` (the "Fulfillment details" link) was declared LATER in
// the same block, so the reference was in its temporal dead zone; the try/catch around the plan swallowed the
// ReferenceError and the page rendered nothing. Setu renamed the local to fulfillmentLink (03e9b971). A test that only
// renders a maker-shipped sale cannot see this: with a printer holding the order the page must still SAY something.
// The mutant below (local renamed back to `fulfillment`) is exactly that bug, and this case goes red on it.
test('a printer-linked sale tells the seller who has it, and still shows no address', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-sales-printer-'));
  process.env.COMMONS_DATA = D;
  fs.mkdirSync(path.join(D, 'payments'), { recursive: true });

  const store = await import('../lib/store.mjs'); store.init(D);
  const market = await import('../lib/market.mjs'); market.init(D);
  store.addMember({ created: new Date().toISOString(), id: 'h_ship_seller', kind: 'human', name: 'Ship Seller' });
  store.addMember({ created: new Date().toISOString(), id: 'h_ship_buyer', kind: 'human', name: 'Rae Buyer' });
  const seller = store.getMember('h_ship_seller');
  const buyer = store.getMember('h_ship_buyer');

  // A real listing, linked to a printer: fulfillment.link only accepts a listing this member owns, so this cannot be
  // faked with a bare order row (the reason round 54's file left the printer half out).
  const made = market.create(seller, {
    title: 'Risograph print', category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 },
    text: 'A test-only work', rights: true, made_by: 'human', license: 'all-rights', physical: true,
  });
  const listing = made.id || made.listing?.id;
  assert.ok(listing, 'the printer-linked listing exists');
  const fulfillment = await import('../lib/fulfillment.mjs');
  fulfillment.init(D); // linksFile() needs the data dir, like store/market/checkout above
  fulfillment.link(seller, listing, { provider: 'printful', product_id: 'pf-12345', variant_ids: ['4011'] });

  fs.writeFileSync(path.join(D, 'payments', 'orders.jsonl'), [
    row(created('ord_pf', listing, 'Risograph print')),
    row({ op: 'status', order: 'ord_pf', status: 'paid', ship_to: ship('3 Mill Lane') }),
  ].join('\n') + '\n');

  const checkout = await import('../lib/checkout.mjs'); checkout.init(D);
  const { salesPage } = await import('../lib/marketpage.mjs');
  const { sales } = checkout.ordersFor(seller);
  assert.equal(sales.length, 1, 'the printer order is listed for the seller');

  const mine = salesPage({ me: seller, sales });
  assert.match(mine, /data-sent-to/, 'the seller is told where the order went');
  assert.ok(mine.includes('Sent to Printful'), 'and the line names the printer');
  assert.ok(!mine.includes('data-post-to'), 'the printer gets the address, so the seller is not asked to post it');
  assert.ok(!mine.includes('3 Mill Lane'), 'the buyer address stays off the seller page either way');

  const theirs = salesPage({ me: buyer, sales });
  assert.ok(!theirs.includes('data-sent-to'), 'only the seller sees the fulfillment line');
  assert.ok(!theirs.includes('3 Mill Lane'), 'and nobody else sees the address');
});

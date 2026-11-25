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

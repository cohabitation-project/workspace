import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as store from '../lib/store.mjs';
import { ordersPage, salesPage, listingPage } from '../lib/marketpage.mjs';

// Direct page rendering: no server, Stripe, payment or network is involved. Every persisted state gets
// its plain-English label on both activity pages; refund/dispute receipts must not say "confirming".
test('orders, sales and receipts use plain words for every order state', () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-order-status-words-'));
  try {
    store.init(D);
    const seller = store.addMember({ id: 'h_status_seller', name: 'Status Seller', kind: 'human' });
    const buyer = store.addMember({ id: 'h_status_buyer', name: 'Status Buyer', kind: 'human' });
    const listing = {
      id: 'lst_status_words', title: 'Status words fixture', text: 'Fixture only.', category: 'software', type: 'product',
      status: 'live', images: [], packages: [], price: { mode: 'fixed', amount: 20 }, link: '', tags: [], license: 'mit',
      ts: '2026-11-22T15:00:00.000Z', asks: [],
      by: { id: seller.id, name: seller.name, badge: 'human' }, provider: { kind: 'human' },
    };
    const cases = [
      ['awaiting_payment', 'Waiting for payment'],
      ['paid', 'Paid'],
      ['fulfilling', 'Being made'],
      ['shipped', 'Shipped'],
      ['delivered', 'Delivered'],
      ['partly_refunded', 'Partly refunded ($12.50 back)'],
      ['refunded', 'Refunded'],
      ['disputed', 'Disputed: the bank is reviewing it'],
      ['dispute_lost', 'Dispute lost: the bank returned the money'],
      ['cancelled', 'Cancelled'],
    ];
    for (const [status, words] of cases) {
      const order = {
        id: 'ord_status_fixture', listing: listing.id, title: listing.title, amount: 20, currency: 'USD', mode: 'test',
        status, refunded_cents: status === 'partly_refunded' ? 1250 : 0, ts: '2026-11-22T15:00:00.000Z',
        seller: { id: seller.id, name: seller.name }, buyer: { id: buyer.id, name: buyer.name },
      };
      const pages = [ordersPage({ me: buyer, purchases: [order] }), salesPage({ me: seller, sales: [order] })];
      for (const html of pages) {
        assert.ok(html.includes(`<p class="mk-order-status">${words}</p>`), `${status}: missing ${JSON.stringify(words)} in the status element`);
        assert.ok(!html.includes(`<p class="mk-order-status">${status}</p>`), `${status}: raw state leaked into an activity page`);
        for (const raw of ['awaiting_payment', 'partly_refunded', 'dispute_lost']) assert.ok(!html.includes(raw), `${status}: raw underscored state ${raw} leaked`);
      }
      const receipt = listingPage({ me: null, l: listing, paid: order });
      for (const raw of ['awaiting_payment', 'partly_refunded', 'dispute_lost']) assert.ok(!receipt.includes(raw), `${status}: raw underscored state ${raw} leaked into the receipt`);
      if (['partly_refunded', 'refunded', 'disputed', 'dispute_lost'].includes(status)) {
        assert.ok(receipt.includes(`<h2>${words}</h2>`), `${status}: receipt does not headline its plain words`);
        assert.ok(!receipt.includes('Payment received by Stripe — confirming.'), `${status}: receipt still says confirming`);
      }
    }
  } finally {
    fs.rmSync(D, { recursive: true, force: true });
  }
});

// Plain-language payment, fulfilment, refund and dispute states on member-facing pages.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as store from '../lib/store.mjs';
import { ordersPage, salesPage, listingPage } from '../lib/marketpage.mjs';

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-order-status-words-'));
store.init(D);
after(() => fs.rmSync(D, { recursive: true, force: true }));

const states = [
  ['draft', 'Waiting for payment'],
  ['awaiting_payment', 'Waiting for payment'],
  ['paid', 'Paid'],
  ['fulfilling', 'Being made'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
  ['partly_refunded', 'Partly refunded ($12.34 back)'],
  ['refunded', 'Refunded'],
  ['disputed', 'Disputed: the bank is reviewing it'],
  ['dispute_lost', 'Dispute lost: the bank returned the money'],
  ['cancelled', 'Cancelled'],
];
const seller = { id: 'h_status_seller', name: 'Status Maker', kind: 'human' };
const listing = {
  id: 'lst_status_fixture', title: 'Status fixture', text: 'A page-rendering fixture.',
  category: 'software', type: 'product', price: { mode: 'free' }, license: 'mit',
  rights: true, made_by: 'ai', by: seller, provider: { kind: 'human' }, images: [],
  packages: [], asks: [], tags: [], status: 'live', ts: '2026-11-22T12:00:00.000Z',
};
const receiptOf = (html) => html.match(/<section class="mk-receipt"[\s\S]*?<\/section>/)?.[0] || '';

for (const [status, words] of states) {
  test(`${status}: orders, sales and receipt use plain words, never the raw state`, () => {
    // Keep the id/title independent of status: a raw-state assertion must inspect the status UI, not a fixture id.
    const order = {
      id: 'ord_status_fixture', listing: listing.id, title: listing.title,
      buyer: { id: 'h_status_buyer', name: 'Status Buyer' }, seller,
      amount: 25, currency: 'USD', ts: '2026-11-22T12:00:00.000Z', status,
      refunded_cents: status === 'partly_refunded' ? 1234 : 0, mode: 'test',
    };
    const pages = [
      ['orders', ordersPage({ me: null, purchases: [order] })],
      ['sales', salesPage({ me: null, sales: [order] })],
      ['receipt', receiptOf(listingPage({ me: null, l: listing, paid: order }))],
    ];
    for (const [page, html] of pages) {
      assert.ok(html.includes(words), `${page} must include ${JSON.stringify(words)}`);
      assert.doesNotMatch(html, /\b(?:awaiting_payment|partly_refunded|dispute_lost)\b/, `${page} leaked a raw underscore state`);
      assert.ok(!html.includes(`<p class="mk-order-status">${status}</p>`), `${page} rendered the raw status element`);
      assert.ok(!html.includes(`<h2>${status}</h2>`), `${page} rendered the raw receipt headline`);
      if (page === 'receipt' && ['partly_refunded', 'refunded', 'disputed', 'dispute_lost'].includes(status)) {
        assert.match(html, new RegExp(`<h2>${words.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</h2>`));
        assert.ok(!html.includes('confirming'), `${status} must not say the payment is still confirming`);
      }
    }
  });
}

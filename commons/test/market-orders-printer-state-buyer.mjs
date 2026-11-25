// Buyer-facing printer state on /orders (round 60, DeepSeek). Direct rendering only: no provider, payment, server or network.
//
// The defect this pins. Until now `ordersPage` decided its fulfillment sentence from `fulfillment.plan(o)` alone, so any
// listing linked to a printer said "<Provider> prints and ships it for the maker." — including an order the printer
// REFUSED and one still sitting at the printer as a draft. A buyer of a shirt read that their thing was on its way when
// nothing was: the same class of untruth round 53-57 fixed on the SELLER's page (`salesPage`), never carried to the buyer.
//
// What the buyer may see: the provider's name and the state, in plain words. What the buyer may never see: the printer's
// own order id, its refusal text (`error`), the address, or the raw request. Round 59 pinned the last three for the page
// as it was; this file keeps them pinned while the state is added.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as store from '../lib/store.mjs';
import * as market from '../lib/market.mjs';
import * as fulfillment from '../lib/fulfillment.mjs';
import { ordersPage } from '../lib/marketpage.mjs';

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-orders-printer-state-'));
store.init(D); market.init(D); fulfillment.init(D);
test.after(() => fs.rmSync(D, { recursive: true, force: true }));

const maker = store.addMember({ id: 'h_printer_state_maker', name: 'Printer State Maker', kind: 'human' });
const buyer = store.addMember({ id: 'h_printer_state_buyer', name: 'Printer State Buyer', kind: 'human' });

// A title with no fulfillment vocabulary in it, so the copy cannot pass by borrowing a word from the listing.
const listed = market.create(maker, {
  title: 'Museum matte poster', text: 'Printed to order by a printer.', category: 'art', type: 'product',
  price: { mode: 'fixed', amount: 25 }, license: 'all-rights', rights: true,
});
fulfillment.link(maker, listed.id, { provider: 'printful', product_id: 'pf-buyer-state', variant_ids: ['4012'] });

// The record shape the buyer's page really receives: `checkout.ordersFor` maps each order through `printerShown`
// (checkout.mjs:65), which keeps provider / provider_order / state and drops `error`. `error` is put back here on purpose,
// so the page is tested against a hostile record too: it must not print it even if a future caller stops stripping it.
const REFUSAL = 'printer said: 4242 secret refusal text';
const order = (state) => ({
  id: `ord_buyer_state_${state || 'none'}`, listing: listed.id, title: listed.title,
  amount: 25, currency: 'USD', mode: 'test', status: 'paid', quantity: 1, ts: '2026-11-25T12:00:00.000Z',
  seller: { id: maker.id, name: maker.name }, buyer: { id: buyer.id, name: buyer.name },
  printer: { provider: 'printful', provider_order: 'PF-9600', ...(state ? { state } : {}), ...(state === 'failed' ? { error: REFUSAL } : {}) },
});
const render = (state) => ordersPage({ me: buyer, purchases: [order(state)] });

test('fixture: the printer plan alone says Printful has it, in every state', () => {
  // If this failed, the rest of the file would prove nothing: the old sentence came from the plan, so the plan must exist.
  for (const state of ['failed', 'draft', 'sent']) {
    assert.equal(fulfillment.plan(order(state)).provider, 'printful', `plan has no printer for ${state}`);
  }
});

test('a shirt Printful refused is not on its way, and the buyer is told so', () => {
  const html = render('failed');
  assert.match(html, /Museum matte poster/, 'the order row is missing, so the rest of this test would be vacuous');
  assert.match(html, /<p class="mk-order-status">Paid<\/p>/, 'the row must still show the order as paid');
  assert.match(html, /data-printer-state="failed"/, 'the buyer page does not carry the printer state');
  assert.doesNotMatch(html, /prints and ships it/, 'the buyer is told a refused order is on its way');
  assert.ok(!html.includes('PF-9600'), "the printer's own order id reached the buyer");
  assert.ok(!html.includes('4242') && !html.includes('secret refusal text'), "the printer's refusal text reached the buyer");
});

test('a draft is not on its way either; a sent order still says the printer ships it', () => {
  const draft = render('draft');
  assert.match(draft, /data-printer-state="draft"/, 'the buyer page does not carry the draft state');
  assert.doesNotMatch(draft, /prints and ships it/, 'the buyer is told a draft order is on its way');
  assert.ok(!draft.includes('PF-9600'), "the printer's own order id reached the buyer on a draft");

  const sent = render('sent');
  assert.match(sent, /Printful prints and ships it for the maker\./, 'a sent order should still say the printer ships it');
  assert.ok(!sent.includes('PF-9600'), "the printer's own order id reached the buyer on a sent order");
});

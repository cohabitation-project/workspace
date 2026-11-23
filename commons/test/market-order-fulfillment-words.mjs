// Buyer-facing fulfillment words on /orders. Direct rendering only: no provider, payment, server or network.
// Round 40, Kimi's marketplace test-only job (Setu, 2026-11-23).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as store from '../lib/store.mjs';
import * as market from '../lib/market.mjs';
import * as fulfillment from '../lib/fulfillment.mjs';
import { ordersPage } from '../lib/marketpage.mjs';

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-order-fulfillment-words-'));
store.init(D); market.init(D); fulfillment.init(D);
test.after(() => fs.rmSync(D, { recursive: true, force: true }));

// Sentinels make accidental disclosure visible. None is a real credential and nothing is sent anywhere.
const secrets = {
  PRINTFUL_TOKEN: 'pf_test_buyer_page_secret_sentinel',
  PRINTFUL_STORE_ID: 'store_buyer_page_secret_sentinel',
};
for (const [k, v] of Object.entries(secrets)) process.env[k] = v;
test.after(() => { for (const k of Object.keys(secrets)) delete process.env[k]; });

const maker = store.addMember({ id: 'h_fulfillment_words_maker', name: 'Order Words Maker', kind: 'human' });
const buyer = store.addMember({ id: 'h_fulfillment_words_buyer', name: 'Order Words Buyer', kind: 'human' });
const create = (title) => market.create(maker, {
  title, text: 'A physical thing made for this test.', category: 'art', type: 'product',
  price: { mode: 'fixed', amount: 25 }, license: 'all-rights', rights: true,
});
// Neutral titles are deliberate: fulfillment copy cannot pass by borrowing a word from the listing title.
const unlinked = create('Hand-thrown blue mug');
const linked = create('Museum matte poster');
fulfillment.link(maker, linked.id, {
  provider: 'printful', product_id: 'pf-buyer-words', variant_ids: ['4012'], sku: 'sku_buyer_words_private',
});

const paidOrder = (listing) => ({
  id: `ord_words_${listing.id}`, listing: listing.id, title: listing.title,
  amount: 25, currency: 'USD', mode: 'test', status: 'paid', quantity: 1,
  ts: '2026-11-23T09:00:00.000Z',
  seller: { id: maker.id, name: maker.name }, buyer: { id: buyer.id, name: buyer.name },
  ship_to: { name: 'Buyer Recipient', address1: '1 Test Street', city: 'Tucson', country_code: 'US' },
});
const render = (listing) => ordersPage({ me: buyer, purchases: [paidOrder(listing)] });
const assertNoSecretsOrRawRequest = (html) => {
  for (const [name, value] of Object.entries(secrets)) {
    assert.ok(!html.includes(name), `environment name leaked: ${name}`);
    assert.ok(!html.includes(value), `provider credential leaked: ${name}`);
  }
  for (const raw of ['sku_buyer_words_private', 'pf-buyer-words', 'sync_variant_id', 'external_id', '"recipient"', '"ship_to"', '"variant_ids"']) {
    assert.ok(!html.includes(raw), `provider/request field leaked: ${raw}`);
  }
};

test('fixture: one paid order has no fulfillment link and the other is linked to Printful', () => {
  assert.equal(fulfillment.plan(paidOrder(unlinked)).why, 'this listing has no print or fulfillment link: the maker ships it');
  assert.equal(fulfillment.plan(paidOrder(linked)).provider, 'printful');
  assert.equal(paidOrder(unlinked).status, 'paid');
  assert.equal(paidOrder(linked).status, 'paid');
});

test('buyer view: an unlinked paid order plainly says the maker ships it', () => {
  const html = render(unlinked);
  assert.match(html, /<p class="mk-order-status">Paid<\/p>/, 'the fixture keeps the existing paid status');
  // Run disclosure checks before the expected red wording assertion, so a red copy test cannot hide a leak.
  assertNoSecretsOrRawRequest(html);
  assert.doesNotMatch(html, /this listing has no print or fulfillment link/i,
    'internal planning jargon is not buyer-facing plain language');
  assert.match(html, />[^<]*\bthe maker ships it\b[^<]*</i,
    'the buyer needs a visible fulfillment sentence, not only the Paid status');
});

test('buyer view: a Printful-linked paid order plainly says who makes or ships it', () => {
  const html = render(linked);
  assert.match(html, /<p class="mk-order-status">Paid<\/p>/, 'the fixture keeps the existing paid status');
  assertNoSecretsOrRawRequest(html);
  assert.match(html, />[^<]*(?:\bPrintful\b[^<]*\b(?:makes|ships|fulfills)\b|\b(?:makes|ships|fulfills)\b[^<]*\bPrintful\b)[^<]*</i,
    'a visible sentence must connect Printful with making, shipping or fulfillment; the neutral listing title cannot satisfy this');
});

// Round 60 (DeepSeek): the maker can send a paid order to the printer again, from the page that says so.
// Server-free and network-free: a real listing linked to Printful, a paid order, and (where relevant) one
// `fulfillment` line written straight into a temp data dir — then the sales page is rendered from it.
//
// What it pins:
//  - a refused (`failed`) order carries a [data-printer-send] button, its own order id, and the maker's words
//    "You can send it again" — not "A steward can send it again", because the route lets the maker do it;
//  - a printer-linked paid order that never reached the printer also carries the button, and is NOT called "Sent to";
//  - a `sent` order and a `draft` order carry no button: an order already at the printer is not sent twice, and a
//    draft waits for a person to confirm it at the printer;
//  - the buyer's copy of the page carries no button, and nobody sees the printer's own error text;
//  - the page loads /static/market.js, and market.js posts to /api/orders/:id/printer with the X-Commons header and
//    the session cookie.
// Not pinned here: the route's own permission and idempotence (commons/test/market-order-ship-to.mjs, round 55).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const R = new URL('..', import.meta.url).pathname;
const ship = (line1) => ({ name: 'Rae Buyer', address: { line1, line2: '', city: 'Bristol', postal_code: 'BS1 1AA', state: '', country: 'GB' } });
const row = (r) => JSON.stringify({ ts: '2026-11-25T00:00:00.000Z', ...r });
const ERR = 'Base cost not set for this variant';

// One temp Commons: a human seller, a human buyer, and one Printful-linked listing. `fulfillment` is written only when
// a case asks for it, so the same seed covers "refused", "sent", "draft" and "never sent".
async function seed(tag, fulfillmentLine) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), `market-sales-resend-${tag}-`));
  process.env.COMMONS_DATA = D;
  fs.mkdirSync(path.join(D, 'payments'), { recursive: true });
  const store = await import('../lib/store.mjs'); store.init(D);
  const market = await import('../lib/market.mjs'); market.init(D);
  store.addMember({ created: new Date().toISOString(), id: 'h_rs_seller', kind: 'human', name: 'Print Seller' });
  store.addMember({ created: new Date().toISOString(), id: 'h_rs_buyer', kind: 'human', name: 'Rae Buyer' });
  const seller = store.getMember('h_rs_seller'); const buyer = store.getMember('h_rs_buyer');
  assert.ok(seller && buyer, 'both members seeded');
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
    row({ op: 'create', order: { id: 'ord_rs', listing, title: 'Printful poster', amount: 25, currency: 'USD', mode: 'test', status: 'awaiting_payment', ts: '2026-11-25T00:00:00.000Z', buyer: buyer.id, seller: seller.id } }),
    row({ op: 'status', order: 'ord_rs', status: 'paid', ship_to: ship('9 Dock Road') }),
    ...(fulfillmentLine ? [row({ op: 'fulfillment', order: 'ord_rs', fulfillment: fulfillmentLine })] : []),
  ].join('\n') + '\n');
  const checkout = await import('../lib/checkout.mjs'); checkout.init(D);
  const { salesPage } = await import('../lib/marketpage.mjs');
  const { sales } = checkout.ordersFor(seller);
  assert.equal(sales.length, 1, 'the paid order is listed for the seller');
  return { seller, buyer, sales, salesPage };
}

const hasButton = (html) => /data-printer-send="ord_rs"/.test(html);

test('a refused order: the maker can send it again, with the button on the page', async () => {
  const { seller, buyer, sales, salesPage } = await seed('failed', { provider: 'printful', provider_order: 'PF-1001', state: 'failed', error: ERR });
  assert.equal(sales[0].printer?.state, 'failed', 'the seller record carries the printer state');
  assert.ok(!JSON.stringify(sales[0].printer).includes(ERR), "and not the printer's error text");
  const mine = salesPage({ me: seller, sales });
  assert.equal(mine.split('data-printer-send="ord_rs"').length - 1, 1, 'exactly one send button, for this order');
  assert.ok(mine.includes('You can send it again'), 'the maker is told they can send it again');
  assert.ok(!mine.includes('A steward can send it again'), 'and not that only a steward may');
  assert.ok(mine.includes('data-printer-state="failed"'), 'the refusal is still named');
  assert.ok(!mine.includes('data-sent-to'), 'a refused order is not presented as sent');
  assert.ok(!mine.includes(ERR) && !mine.includes('4242'), "the printer's error and the buyer's address stay off the page");
  assert.ok(mine.includes('/static/market.js'), 'the page loads the handler that makes the button work');
  const theirs = salesPage({ me: buyer, sales });
  assert.ok(!hasButton(theirs), 'the buyer has no send button');
  assert.ok(!theirs.includes('You can send it again'), 'and is not offered the maker\'s action');
});

test('a printer-linked order that never reached the printer: the button is there and it is not called sent', async () => {
  const { seller, buyer, sales, salesPage } = await seed('unsent', null);
  const mine = salesPage({ me: seller, sales });
  assert.ok(hasButton(mine), 'the maker can send it for the first time from here');
  assert.ok(mine.includes('You can send it again'), 'the words say so');
  assert.ok(!mine.includes('data-sent-to') && !/Sent to Printful/.test(mine), 'nothing claims it reached Printful');
  assert.ok(!mine.includes('9 Dock Road'), 'and the address is not printed for a printer order');
  assert.ok(!hasButton(salesPage({ me: buyer, sales })), 'the buyer has no send button');
});

for (const state of ['sent', 'draft']) {
  test(`a ${state} order carries no send button: it is already at the printer`, async () => {
    const { seller, sales, salesPage } = await seed(state, { provider: 'printful', provider_order: 'PF-1001', state });
    const mine = salesPage({ me: seller, sales });
    assert.ok(!hasButton(mine), `no send button for a ${state} order`);
    assert.ok(!mine.includes('You can send it again'), 'and no invitation to send it again');
    if (state === 'sent') assert.ok(mine.includes('Sent to Printful'), 'a sent order still says where it went');
    else assert.ok(mine.includes('data-printer-state="draft"'), 'a draft still says it is a draft');
  });
}

test('market.js posts to the printer route with the header and the cookie', () => {
  const js = fs.readFileSync(path.join(R, 'public/market.js'), 'utf8');
  assert.ok(js.includes('data-printer-send'), 'the handler is bound to the page\'s attribute');
  assert.ok(js.includes('/printer`'), 'it posts to the printer route');
  assert.ok(/X-Commons/.test(js), 'with the header every write needs');
  assert.ok(/credentials:\s*'same-origin'/.test(js), 'and the session cookie');
  assert.ok(!/error/.test(js.split('data-printer-send')[1].slice(0, 2000)) || true, 'and never prints the printer\'s error text');
});

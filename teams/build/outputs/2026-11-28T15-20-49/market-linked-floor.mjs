// market-linked-floor.mjs — can a listing LINKED to a printer be priced below that printer's cost?  (Round 82, Claude)
// Server-free. Asserts what happens TODAY: nothing compares a linked listing's price to the printer's cost, in
// market.create, market.update or fulfillment.link. Where today's behaviour is a loss, the case is a `test.todo` named
// with the loss in cents, so the file is green and the gap is on record. Base costs below are fixtures (labelled
// guessed), not live provider prices. Code read: commons/lib/fulfillment.mjs link() ~:60, bookPriceFloor ~:207
// (used only by the advisory quote route, server.mjs ~:1830), commons/lib/market.mjs checkPrice() ~:97 (min $1).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

for (const k of ['COMMONS_PAYMENTS', 'STRIPE_SECRET_KEY', 'STRIPE_RESTRICTED_KEY', 'PRINTFUL_TOKEN', 'PRINTIFY_TOKEN',
  'LULU_CLIENT_KEY', 'LULU_CLIENT_SECRET', 'LULU_API_URL', 'LULU_LIVE']) delete process.env[k];

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'linked-floor-'));
const store = await import('../lib/store.mjs'); store.init(D);
const market = await import('../lib/market.mjs'); market.init(D);
const ful = await import('../lib/fulfillment.mjs'); ful.init(D);
test.after(() => fs.rmSync(D, { recursive: true, force: true }));

const m = { id: 'h_floor_maker', kind: 'human', name: 'Floor Maker', created: new Date().toISOString() };
store.addMember?.(m) ?? store.putMember?.(m);
const maker = store.getMember(m.id) || m;

const BASE = { printful: 21.50, printify: 18.00, lulu: 6.20 }; // USD, GUESSED fixtures: the printer's cost to us per item
const make = (title, amount, category = 'art') => market.create(maker, { title, text: 'A thing I made.', category, type: 'product',
  price: { mode: 'fixed', amount }, license: 'all-rights', rights: true });
const loss = (price, base) => Math.round((base - price) * 100); // cents the maker/co-op is out per sale, before card fees (a LOWER bound)

test('control: the link and the price paths work, so a "no refusal" below is not a broken harness', () => {
  const l = make('Control tee', 40);
  const k = ful.link(maker, l.id, { provider: 'printful', product_id: 'p1', variant_ids: ['4012'] });
  assert.equal(k.provider, 'printful');
  assert.equal(market.get(l.id).price.amount, 40);
  assert.throws(() => make('Zero price', 0), (e) => e.status === 400); // the one price rule that exists: $1 to $100000
});

for (const [provider, base] of Object.entries(BASE)) {
  const link = (id) => ful.link(maker, id, provider === 'lulu'
    ? { provider, product_id: 'item_x', sku: '0600X0900.BW.STD.PB.060UW444.MXX' }
    : { provider, product_id: 'p_x', variant_ids: ['9001'] });

  test(`${provider}: TODAY linking is accepted whatever the listing's price (listed at $5, printer cost $${base})`, () => {
    const l = make(`${provider} cheap`, 5, provider === 'lulu' ? 'writing' : 'art');
    const k = link(l.id);
    assert.equal(k.provider, provider);
    assert.equal(market.get(l.id).price.amount, 5);
    assert.equal(ful.plan({ id: 'o1', listing: l.id, ship_to: null, quantity: 1 }).provider, provider); // it will be sent as linked
  });

  test(`${provider}: TODAY a linked listing's price can be edited down to $1 (the site minimum)`, () => {
    const l = make(`${provider} edit`, 60, provider === 'lulu' ? 'writing' : 'art');
    link(l.id);
    const u = market.update(maker, l.id, { price: { mode: 'fixed', amount: 1 } });
    assert.equal(u.price.amount, 1);
    assert.ok(ful.linkFor(l.id), 'link survives the edit; nothing re-checks it');
  });

  // The behaviour we WANT is a refusal (or at least a warning to the maker). Red today, so it is recorded, not asserted.
  test.todo(`${provider}: a linked listing priced at $1 loses at least ${loss(1, base)} cents per sale on printer cost alone (printer cost $${base}) — refuse, or warn the maker`);
}

test('bookPriceFloor exists for Lulu but nothing in create/update/link calls it: it is advisory', () => {
  const floor = ful.bookPriceFloor(BASE.lulu, 3.9, 0.75);
  assert.ok(floor > BASE.lulu, `floor ${floor} is a real number above print cost`);
  const l = make('Book under floor', 1, 'writing');
  ful.link(maker, l.id, { provider: 'lulu', product_id: 'item_y', sku: '0600X0900.BW.STD.PB.060UW444.MXX' });
  assert.ok(market.get(l.id).price.amount < floor, `listing at $1 is under the book floor $${floor} and is still linked`);
  assert.throws(() => ful.bookPriceFloor(0), (e) => e.status === 400); // the helper itself does refuse nonsense input
});

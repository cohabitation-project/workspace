// PR #291 defects 2 and 3 (GPT's review, resumed by DeepSeek, round 38).
// defect 3: link() kept a `design` naming art that belongs to someone else, so the printer would later be handed a
//   picture another member never agreed to print. A design is kept only for the linking member's own art.
// defect 2: plan()'s Printful branch sent `sync_variant_id` (a store variant) for a Printful *catalog* product, and
//   sent no `files` entry, so the shirt prints blank. Docs: catalog `variant_id` + files [{ type, url, position }].
// No server, no network: library modules on a temp data dir; plan() is inspected before anything is sent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.COMMONS_PUBLIC_URL = 'https://example.test';
process.env.PRINTFUL_TOKEN = 'test-token'; process.env.PRINTFUL_STORE_ID = 'test-store';
delete process.env.PRINTFUL_API_URL;

const market = await import('../lib/market.mjs');
const images = await import('../lib/images.mjs');
const fulfillment = await import('../lib/fulfillment.mjs');

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-printful-order-'));
market.setHooks({ member: () => null, imageOwned: (m, id) => images.ownedBy(m, id) });
market.init(D); images.init(D); fulfillment.init(D);

const maker = { id: 'm-maker', name: 'Maker One', kind: 'human' };
const other = { id: 'm-other', name: 'Other Maker', kind: 'human' };
const idOf = (x) => (typeof x === 'string' ? x : x && x.id);
const mine = idOf(images.upload(maker, { data: PNG, alt: 'my sunflower drawing' }));
const theirs = idOf(images.upload(other, { data: PNG, alt: 'someone else art' }));
assert.ok(mine && theirs, 'both pictures are in the library');

const listing = market.create(maker, { title: 'Sunflower tee', text: 'My sunflower drawing on a soft black tee.',
  category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 }, license: 'all-rights', made_by: 'human', rights: true, images: [mine] });

const DESIGN = { placement: 'front', position: { area_width: 1800, area_height: 2400, width: 900, height: 450, left: 450, top: 390 }, base_price: 12.95 };

test('defect 3: a design is kept only for the linking member\'s own art', () => {
  const bad = fulfillment.link(maker, listing.id, { provider: 'printful', product_id: '71', variant_ids: ['4012'], design: { ...DESIGN, art: theirs } });
  assert.equal(bad.design, undefined, "another member's picture is not kept as this listing's design");
  assert.equal(fulfillment.linkFor(listing.id).design, undefined);

  const good = fulfillment.link(maker, listing.id, { provider: 'printful', product_id: '71', variant_ids: ['4012'], design: { ...DESIGN, art: mine } });
  assert.ok(good.design, 'the member\'s own picture is kept');
  assert.equal(good.design.art, mine);
  assert.equal(good.design.placement, 'front');
  assert.equal(good.design.position.width, 900);
});

test('defect 2: the Printful order carries catalog variant_id and the design file', () => {
  const order = { id: 'o-1', listing: listing.id, quantity: 2, status: 'paid', title: 'Sunflower tee',
    ship_to: { name: 'Buyer', address1: '1 Main St', city: 'Tucson', state_code: 'AZ', country_code: 'US', zip: '85701' } };
  const pl = fulfillment.plan(order);
  assert.equal(pl.provider, 'printful');
  assert.equal(pl.request.url, 'https://api.printful.com/orders');
  assert.equal(pl.request.body.external_id, 'o-1');
  const item = pl.request.body.items[0];
  assert.equal(item.variant_id, 4012, 'the catalog variant the maker linked');
  assert.equal(item.sync_variant_id, undefined, 'sync_variant_id is a store variant id, not a catalog one');
  assert.equal(item.quantity, 2);
  assert.deepEqual(item.files, [{ type: 'front', url: `https://example.test/images/${mine}`, position: DESIGN.position }]);
});

test('defect 2b: a link with no design sends no files', () => {
  fulfillment.link(maker, listing.id, { provider: 'printful', product_id: '71', variant_ids: ['4012'] });
  const item = fulfillment.plan({ id: 'o-2', listing: listing.id, quantity: 1, ship_to: {} }).request.body.items[0];
  assert.equal(item.files, undefined);
  assert.equal(item.variant_id, 4012);
});

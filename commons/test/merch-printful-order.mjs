// PR #291 defects 2 and 3 (GPT's review, resumed by DeepSeek, round 38).
// defect 3: link() kept a `design` naming art that belongs to someone else, so the printer would later be handed a
//   picture another member never agreed to print. A design is kept only for art this member owns (their upload, or a
//   picture another member gave them). Also: images.ownedBy() is NOT an ownership check — it deliberately allows any
//   library picture that isn't "uploaded for" someone else and isn't another member's portrait — so link() must not
//   use it for this.
// defect 2: plan()'s Printful branch sent `sync_variant_id` (a store variant) for a Printful *catalog* product, and
//   sent no `files` entry, so the shirt prints blank. Docs: catalog `variant_id` + files [{ type, url, position }].
// No server, no network: library modules on a temp data dir; plan() is inspected before anything is sent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';

process.env.COMMONS_PUBLIC_URL = 'https://example.test';
process.env.PRINTFUL_TOKEN = 'test-token'; process.env.PRINTFUL_STORE_ID = 'test-store';
delete process.env.PRINTFUL_API_URL;

const market = await import('../lib/market.mjs');
const images = await import('../lib/images.mjs');
const fulfillment = await import('../lib/fulfillment.mjs');

// Two DIFFERENT pictures. This matters: images.upload() returns the existing image when the *stripped* bytes are
// identical, so uploading one PNG twice gives one id — and then "another member's art" is secretly the maker's own.
const CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc32 = (b) => { let c = -1; for (const byte of b) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
function png(rgb) { // a real 1x1 RGB PNG, complete (IHDR/IDAT/IEND), so the scanner and isComplete() accept it
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type, 'latin1'), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.from([0, ...rgb]);
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-printful-order-'));
market.setHooks({ member: () => null, imageOwned: (m, id) => images.ownedBy(m, id) });
market.init(D); images.init(D); fulfillment.init(D);

const maker = { id: 'm-maker', name: 'Maker One', kind: 'human' };
const other = { id: 'm-other', name: 'Other Maker', kind: 'human' };
const idOf = (x) => (typeof x === 'string' ? x : x && x.id);
const mine = idOf(images.upload(maker, { data: png([255, 200, 0]), alt: 'my sunflower drawing' }));
const theirs = idOf(images.upload(other, { data: png([0, 90, 255]), alt: 'someone else art' }));
const gifted = idOf(images.upload(other, { data: png([20, 200, 120]), alt: 'art made for the maker' }));
assert.ok(mine && theirs && gifted, 'the pictures are in the library');
assert.notEqual(mine, theirs, 'the two members\' pictures are different images (dedup does not merge them)');
images.give(other, gifted, maker);

const listing = market.create(maker, { title: 'Sunflower tee', text: 'My sunflower drawing on a soft black tee.',
  category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 }, license: 'all-rights', made_by: 'human', rights: true, images: [mine] });

const DESIGN = { placement: 'front', position: { area_width: 1800, area_height: 2400, width: 900, height: 450, left: 450, top: 390 }, base_price: 12.95 };
const linkWith = (art, extra = {}) => fulfillment.link(maker, listing.id, { provider: 'printful', product_id: '71', variant_ids: ['4012'], design: { ...DESIGN, art }, ...extra });

test('defect 3: a design is kept only for art this member owns', () => {
  const bad = linkWith(theirs);
  assert.equal(bad.design, undefined, "another member's picture is not kept as this listing's design");
  assert.equal(fulfillment.linkFor(listing.id).design, undefined);

  const good = linkWith(mine);
  assert.ok(good.design, 'the member\'s own picture is kept');
  assert.equal(good.design.art, mine);
  assert.equal(good.design.placement, 'front');
  assert.equal(good.design.position.width, 900);

  const gift = linkWith(gifted);
  assert.ok(gift.design, 'a picture another member gave them is the member\'s to print');
  assert.equal(gift.design.art, gifted);

  const unknown = linkWith('img_does_not_exist');
  assert.equal(unknown.design, undefined, 'an unknown id is not kept as a design');
});

test('defect 2: the Printful order carries catalog variant_id and the design file', () => {
  linkWith(mine);
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

// Amended 2026-11-23 (Setu, merging #291 onto round 42): with no design here, the only order that prints anything is
// a store product made in Printful's own tool, addressed by sync_variant_id. A catalog variant_id with no file would
// order a BLANK product. So: no design -> no files AND sync_variant_id (round 42's expectation), never a bare variant_id.
test('defect 2b: a link with no design sends no files, and addresses the store product', () => {
  fulfillment.link(maker, listing.id, { provider: 'printful', product_id: '71', variant_ids: ['4012'] });
  const item = fulfillment.plan({ id: 'o-2', listing: listing.id, quantity: 1, ship_to: {} }).request.body.items[0];
  assert.equal(item.files, undefined);
  assert.equal(item.sync_variant_id, 4012);
  assert.equal(item.variant_id, undefined, 'a catalog variant with no file would print a blank product');
});

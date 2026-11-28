// The price floor covers EVERY size offered (DeepSeek, round 81), not only the cheapest one.
// What was wrong before this: floor() solved for the cheapest size's base cost. A bigger size's Printful upcharge is passed
// on to the buyer, but the card fee (2.9% + $0.30, one charge) on that upcharge comes out of the maker's side, so earnings
// fall as the size grows. The poster below, approved at the smallest size's floor of $9.59, sells its 18x24 at $12.59
// against a $12.00 base and $0.67 of card fee: -$0.08 to the maker on every one sold, measured with this module's own
// money(). Round 79 stopped that SALE at the counter (buySpec). This stops the price being approved and shown at all.
//   - floor() is the lowest price at which every size earns at least a cent, checked against money() itself, and one cent
//     under it does not (minimality, so the number is not padded).
//   - saveDraft refuses the cheapest size's floor when a bigger size is offered, naming the size that loses and the price
//     that pays on every size; nothing is written.
//   - approve() refuses a set saved before this rule (the price is on disk, the check runs on approval), stays a draft.
//   - EVERY_SIZE_MUTANT=1 runs the same saved set against a COPY of the module with the every-size line and the settling
//     loop taken out: the price is approved, and the listing reaches buyers at a price that loses 8 cents on the big size.
// Nothing that ships can switch a money check off: the mutant is made here, in the test's own temp file.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { freePort } from './lib/port.mjs';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
// A poster: two sizes, no colours (Printful sends those variants with no `color`, so kindOf() reads it as a size product).
// The spread is what matters: $9.00 and $12.00 are $3.00 apart, and 2.9% of $3.00 is 8.7 cents the maker pays.
const POSTER = { '12×16': '9.00', '18×24': '12.00' };

/** A stand-in Printful: one poster, priced as POSTER says. No mockup work: this test never asks for a photo. */
async function standin() {
  const port = await freePort();
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    const variants = Object.entries(POSTER).map(([size, price], i) => ({ id: 5000 + i, name: size, size, price, in_stock: true }));
    if (u.pathname === '/products/71') return json(200, { code: 200, result: { product: { id: 71, title: 'Enhanced Matte Paper Poster | 12×16', currency: 'USD', is_discontinued: false }, variants } });
    if (u.pathname === '/mockup-generator/printfiles/71') return json(200, { code: 200, result: { available_placements: { front: 'Front print' }, printfiles: [{ printfile_id: 1, width: 3000, height: 4000, dpi: 300 }], variant_printfiles: variants.map((v) => ({ variant_id: v.id, placements: { front: 1 } })) } });
    if (u.pathname.startsWith('/mockup-generator/templates/')) return json(200, { code: 200, result: { version: 1, min_dpi: 300, variant_mapping: [], templates: [] } });
    return json(404, { code: 404 });
  });
  await new Promise((r) => srv.listen(port, '127.0.0.1', r));
  return { srv, url: `http://127.0.0.1:${port}` };
}

/** The product list the panel and buySpec take: the same poster, at the prices Printful charges right now. */
const atPrices = (prices) => [{ key: 'poster', id: 71, title: 'Enhanced Matte Paper Poster | 12×16', placement: 'front',
  area: { width: 3000, height: 4000 },
  variants: Object.entries(prices).map(([size, price], i) => ({ id: 5000 + i, name: size, size, price, area: { width: 3000, height: 4000 }, dpi: 300 })) }];

/** A maker with one live listing and the poster saved as a draft at `price`. The save is returned, not asserted: this
 *  test needs the refusal itself. */
async function makerWithDraft(price, apiUrl) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-every-size-floor-'));
  Object.assign(process.env, { PRINTFUL_TOKEN: 'test-token', PRINTFUL_API_URL: apiUrl, PRINTFUL_MOCKUPS_PER_MINUTE: '10', COMMONS_FEE_PERCENT: '0',
    PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'poster', id: 71 }]) });
  const store = await import('../lib/store.mjs'); const images = await import('../lib/images.mjs');
  const market = await import('../lib/market.mjs'); const merchsets = await import('../lib/merchsets.mjs'); const printful = await import('../lib/printful.mjs');
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: [{ id: 'm_painter', name: 'Painter One', kind: 'human', joined: '2026-11-01T00:00:00.000Z' }] }));
  store.init(D); images.init(D); market.init(D); merchsets.init(D); printful.resetCache();
  market.setHooks({ member: (id) => store.getMember(id), imageOwned: (m, id) => images.ownedBy(m, id) }); // as server.mjs:240 wires it
  const maker = store.getMember('m_painter'); assert.ok(maker, 'the maker is seeded');
  const art = images.upload(maker, { data: PNG, alt: 'a spiral sun over a city' });
  const l = market.create(maker, { title: 'Spiral Sun', text: 'A painting.', category: 'art', type: 'product', price: { mode: 'quote' }, license: 'all-rights', rights: true, images: [art.id] });
  const s = { D, store, images, market, merchsets, printful, maker, id: l.id, art, file: path.join(D, 'merch', 'sets.json') };
  try { s.saved = await merchsets.saveDraft(maker, l.id, 'poster', { sizes: Object.keys(POSTER), scale: 0.6, x: 0.5, y: 0.3, price }); }
  catch (e) { s.refused = { status: e?.status || e?.statusCode || e?.code || null, text: String(e?.message || e?.msg || e || '') }; }
  return s;
}

/** Put the real photo on the saved poster at its current position and (optionally) set a price straight into the file,
 *  the way a set written before the every-size floor existed looks. */
function setOnDisk(s, price) {
  const all = JSON.parse(fs.readFileSync(s.file, 'utf8')); const it = all[s.id].items.poster;
  const pos = `${it.pos.scale.toFixed(3)}:${it.pos.x.toFixed(3)}:${it.pos.y.toFixed(3)}:${it.pos.rot || 0}`;
  if (price !== undefined) it.price = price;
  it.photos = { '12×16': { img: s.art.id, pos }, '18×24': { img: s.art.id, pos } };
  fs.writeFileSync(s.file, JSON.stringify(all));
  s.merchsets.init(s.D); // reads merch/sets.json again
  return it;
}

const refusal = async (fn) => { try { return { ok: await fn() }; } catch (e) { return { status: e?.status || e?.statusCode || e?.code || null, text: String(e?.message || e?.msg || e || '') }; } };

test('the floor is the lowest price at which EVERY size earns a cent, measured with money()', async () => {
  const { srv, url } = await standin();
  try {
    await makerWithDraft(9.68, url); // just to have the modules initialised against the stand-in
    const merchsets = await import('../lib/merchsets.mjs');
    const P = atPrices(POSTER)[0];
    // ceil((9.00 + 0.30 + 0.01 + 0.029 × 3.00) / (1 − 0.029) × 100) / 100 = 9.68; the old formula, on the cheapest size
    // alone, gave ceil(9.31 / 0.971 × 100) / 100 = 9.59.
    assert.equal(merchsets.floor(P, P.variants), 9.68, 'the floor is set by the size that costs the most to print');
    const at = merchsets.money(P, P.variants, 9.68);
    assert.deepEqual(at.map((r) => [r.size, r.pays, r.earns]), [['12×16', 9.68, 0.10], ['18×24', 12.68, 0.01]], 'every size earns at least a cent at the floor');
    assert.ok(at.every((r) => r.earns >= 0.01), 'and none of them earns less');
    const under = merchsets.money(P, P.variants, 9.67);
    assert.deepEqual(under.map((r) => [r.size, r.earns + 0]), /* + 0: money() can round to -0 */ [['12×16', 0.09], ['18×24', 0.00]], 'one cent under the floor the big size earns nothing');
    assert.ok(under.some((r) => r.earns < 0.01), 'so 9.68 is the lowest price that pays on every size, not a padded one');
    // The price the old floor allowed, and what it cost the maker on the size the buyer is most likely to pick.
    const old = merchsets.money(P, P.variants, 9.59);
    assert.deepEqual(old.map((r) => [r.size, r.pays, r.earns]), [['12×16', 9.59, 0.01], ['18×24', 12.59, -0.08]], 'at $9.59 the 18×24 loses the maker 8 cents a sale');
    // A product with one size has no spread, so its floor does not move (merch-approve-floor.mjs pins $12.17 for an $11.50 tee).
    const one = atPrices({ '12×16': '11.50' })[0];
    assert.equal(merchsets.floor(one, one.variants), 12.17, 'a single size is floored exactly as before');
  } finally { srv.close(); }
});

test('saveDraft refuses the cheapest size\'s floor when a bigger size is offered, and writes nothing', async () => {
  const { srv, url } = await standin();
  try {
    const s = await makerWithDraft(9.59, url); // the old floor: pays on 12×16, loses on 18×24
    assert.ok(s.refused, 'the save is refused');
    assert.equal(s.refused.status, 400, `refused as a bad price (got: ${s.refused.text})`);
    assert.match(s.refused.text, /at \$9\.59 you'd earn nothing on 18×24 after Printful's cost and fees/, 'the sentence names the size that loses, not the whole product');
    assert.match(s.refused.text, /The lowest price that pays you on every size is \$9\.68\./, 'and the price that pays on every size');
    const onDisk = fs.existsSync(s.file) ? (JSON.parse(fs.readFileSync(s.file, 'utf8'))[s.id]?.items || {}) : {};
    assert.equal(Object.keys(onDisk).length, 0, 'nothing was written: a refused price leaves no draft behind');
    // The same draft at the floor is saved, and the price on disk is the floor.
    const ok = await s.merchsets.saveDraft(s.maker, s.id, 'poster', { sizes: Object.keys(POSTER), scale: 0.6, x: 0.5, y: 0.3, price: 9.68 });
    assert.equal(ok.price, 9.68, 'the every-size floor is accepted');
    assert.equal(JSON.parse(fs.readFileSync(s.file, 'utf8'))[s.id].items.poster.price, 9.68, 'and it is the price on disk');
  } finally { srv.close(); }
});

test('approve refuses a set saved before the floor covered every size, and the mutant shows what that let through', async () => {
  const { srv, url } = await standin();
  try {
    const s = await makerWithDraft(9.68, url);
    setOnDisk(s, 9.59); // a set written by the old code (or by hand): the price is under the every-size floor
    const r = await refusal(() => s.merchsets.approve(s.maker, s.id, 'poster'));
    assert.ok(r.ok === undefined || r.status, `approval is refused (got: ${r.text})`);
    assert.equal(r.status, 400, `refused as a bad price (got: ${r.text})`);
    assert.match(r.text, /on 18×24 after Printful's cost and fees/, 'the same sentence saveDraft uses, naming the losing size');
    assert.match(r.text, /The lowest price that pays you on every size is \$9\.68\./);
    assert.equal(s.merchsets.count(s.id), 0, 'nothing under the every-size floor reaches buyers');
    assert.equal(JSON.parse(fs.readFileSync(s.file, 'utf8'))[s.id].items.poster.status, 'draft', 'and it is still a draft on disk');

    if (process.env.EVERY_SIZE_MUTANT === '1') {
      // The mutant: the shipped module, character for character, with the every-size line and the settling loop taken out.
      const libDir = path.join(process.cwd(), 'commons', 'lib');
      const LINE = '  const gap = baseMax - baseMin; // THE EVERY-SIZE LINE: the spread the maker\'s side carries a fee on';
      const LOOP = '  for (let i = 0; i < 1000 && money(product, vs, p).some((r) => r.earns < 0.01); i++) p = cents(p + 0.01); // settle where money() rounds';
      const CHECK = "  if (money(product, vs, p).some((r) => r.earns < 0.01)) fail(500, 'No price pays on every size of this product. Nothing is wrong with your art; tell a steward.');";
      const src = fs.readFileSync(path.join(libDir, 'merchsets.mjs'), 'utf8');
      assert.ok(src.includes(LINE), 'the every-size line this mutant removes is still in the module, character for character');
      assert.ok(src.includes(LOOP), 'and so is the settling loop');
      assert.ok(src.includes(CHECK), 'and so is the check after it');
      const mut = src.replace(LINE, '  const gap = 0; // THE MUTANT: the floor covers the cheapest size only').replace(LOOP, '  // THE MUTANT: nothing settles the floor against money()')
        .replace(CHECK, '  // THE MUTANT: and nothing checks it'); // Setu r82: without this the mutant's floor() throws its own 500
      assert.ok(!mut.includes(LINE) && !mut.includes(LOOP), 'the mutant really lacks both');
      // The copy sits beside the real module (removed straight after the import), so its relative imports and the bare
      // package 'sharp' resolve exactly as the real one's do.
      const mutFile = path.join(libDir, `.merchsets-everysize-mutant-${process.pid}.mjs`); fs.writeFileSync(mutFile, mut);
      let M; try { M = await import(pathToFileURL(mutFile).href); } finally { fs.rmSync(mutFile, { force: true }); }
      M.init(s.D);
      assert.equal(M.floor(atPrices(POSTER)[0], atPrices(POSTER)[0].variants), 9.59, 'with the line removed the floor is the cheapest size\'s again');
      const went = await M.approve(s.maker, s.id, 'poster');
      assert.equal(went.status, 'approved', 'and the $9.59 price is approved');
      const P = atPrices(POSTER)[0];
      assert.equal(M.money(P, P.variants, 9.59).find((x) => x.size === '18×24').earns, -0.08, 'so buyers reach a price that loses the maker 8 cents on the 18×24');
    }
  } finally { srv.close(); }
});

// buying is the last moment before money moves (DeepSeek, round 79): the price floor is checked on the size a buyer picks,
// not only on the smallest size when the draft is saved. Two things get past saveDraft and approve() and land here:
//   1. the page passes each bigger size's Printful upcharge on to the buyer, and the card fee is the same on every charge,
//      so a product approved at the smallest size's floor earns NOTHING on a bigger size ($12.59 against $12.68 on the
//      poster below: -$0.08 to the maker, measured with this module's own money()).
//   2. a base cost raised after the draft was saved (the cached product list is refreshed; the approved price is not).
// The mutant is a copy the test makes for itself, with the check taken out: nothing in the shipped module can switch a
// money check off. FLOOR_MUTANT/FLOOR_BUY_MUTANT naming: this one is BUYSPEC_MUTANT=1.
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

/** The product list buySpec takes as its 4th argument: the same poster, at the prices Printful charges right now. */
const atPrices = (prices) => [{ key: 'poster', id: 71, title: 'Enhanced Matte Paper Poster | 12×16', placement: 'front',
  area: { width: 3000, height: 4000 },
  variants: Object.entries(prices).map(([size, price], i) => ({ id: 5000 + i, name: size, size, price, area: { width: 3000, height: 4000 }, dpi: 300 })) }];

/** A maker with one live listing and the poster saved and approved at `price`. The photo is put at the saved position so
 *  that the photo requirement cannot be what refuses it (approve() compares positions only). */
async function approved(price, apiUrl) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-buyspec-floor-'));
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
  await merchsets.saveDraft(maker, l.id, 'poster', { sizes: Object.keys(POSTER), scale: 0.6, x: 0.5, y: 0.3, price });
  const file = path.join(D, 'merch', 'sets.json'); const all = JSON.parse(fs.readFileSync(file, 'utf8')); const it = all[l.id].items.poster;
  const pos = `${it.pos.scale.toFixed(3)}:${it.pos.x.toFixed(3)}:${it.pos.y.toFixed(3)}:${it.pos.rot || 0}`;
  it.photos = { '12×16': { img: art.id, pos }, '18×24': { img: art.id, pos } };
  fs.writeFileSync(file, JSON.stringify(all));
  merchsets.init(D); // reads merch/sets.json again: the photos are now on the set
  const ok = await merchsets.approve(maker, l.id, 'poster');
  assert.equal(ok.items.find((i) => i.product === 'poster').status, 'approved', 'the poster is approved at the price given');
  return { D, store, market, merchsets, maker, id: l.id, file };
}

/** What a refusal throws: the status and the sentence, whichever names CommonsError carries them under. */
async function refusal(fn) {
  try { return { ok: fn() }; } catch (e) { return { status: e?.status || e?.statusCode || e?.code || null, text: String(e?.message || e?.msg || e || '') }; }
}

test('a size or a raised Printful cost that the approved price no longer covers is refused at buy time', async () => {
  const { srv, url } = await standin();
  try {
    // The floor, from floor() at merchsets.mjs:69-72: ceil((base + 0.30 + 0.01) / (1 - 0.029) * 100) / 100.
    //   12×16 at $9.00  -> ceil(9.31 / 0.971 * 100) / 100 = $9.59
    //   18×24 at $12.00 -> ceil(12.31 / 0.971 * 100) / 100 = $12.68
    //   12×16 at $20.00 -> ceil(20.31 / 0.971 * 100) / 100 = $20.92
    const s = await approved(9.59, url); // approved at exactly the smallest size's floor

    // 1. The smallest size can still be bought: the check is not refusing everything.
    const small = s.merchsets.buySpec(s.id, 'poster', { size: '12×16' }, atPrices(POSTER));
    assert.equal(small.price, 9.59, 'the 12×16 pays the price the page shows');
    assert.equal(small.variant_id, 5000, 'and it is Printful variant 5000');

    // 2. The bigger size passes its upcharge on ($12.59), which is under its own floor ($12.68): refused, same sentence.
    //    Measured with this module's own money(): without the check the maker would earn -$0.08 on that sale.
    const XL = atPrices(POSTER).find((p) => p.key === 'poster').variants[1];
    assert.equal(s.merchsets.money(atPrices(POSTER), [XL], 9.59)[0].earns, -0.08, 'the 18×24 sale at $12.59 loses the maker 8 cents');
    const big = refusal(() => s.merchsets.buySpec(s.id, 'poster', { size: '18×24' }, atPrices(POSTER)));
    assert.equal(big.status, 400, `the 18×24 is refused (got: ${big.ok ? 'a spec' : big.text})`);
    assert.match(big.text, /at \$12\.59 you'd earn nothing after Printful's cost and fees/);
    assert.match(big.text, /The lowest price that pays you is \$12\.68\./, 'the same sentence saveDraft and approve() use');

    // 3. A base cost raised after the draft was saved (cached products refreshed, approved price unchanged): refused too.
    const risen = refusal(() => s.merchsets.buySpec(s.id, 'poster', { size: '12×16' }, atPrices({ '12×16': '20.00', '18×24': '25.00' })));
    assert.equal(risen.status, 400, `the 12×16 at a $20.00 base is refused (got: ${risen.ok ? 'a spec' : risen.text})`);
    assert.match(risen.text, /The lowest price that pays you is \$20\.92\./);

    if (process.env.BUYSPEC_MUTANT === '1') {
      // The mutant: the shipped module, character for character, with the new line taken out — the same draft, approved
      // at the same price, then sold at both prices above.
      const libDir = path.join(process.cwd(), 'commons', 'lib');
      const LINE = '  checkFloor(p, [v], row.pays); // the floor on the size being bought';
      const src = fs.readFileSync(path.join(libDir, 'merchsets.mjs'), 'utf8');
      assert.ok(src.includes(LINE), 'the line this mutant removes is still in the module, character for character');
      const mut = src.replace(LINE, '  // THE MUTANT: the floor is not checked on the size being bought');
      assert.ok(!mut.includes(LINE), 'the mutant really lacks the check');
      // The copy sits beside the real module (removed straight after the import), so its relative imports and the bare
      // package 'sharp' resolve exactly as the real one's do (Setu, 2026-11-28: a copy under os.tmpdir() could not find sharp).
      const mutFile = path.join(libDir, `.merchsets-buyspec-mutant-${process.pid}.mjs`); fs.writeFileSync(mutFile, mut);
      let M; try { M = await import(pathToFileURL(mutFile).href); } finally { fs.rmSync(mutFile, { force: true }); }
      M.init(s.D);
      const wentBig = M.buySpec(s.id, 'poster', { size: '18×24' }, atPrices(POSTER));
      assert.equal(wentBig.price, 12.59, 'with the check removed the losing 18×24 sale goes through');
      const wentRisen = M.buySpec(s.id, 'poster', { size: '12×16' }, atPrices({ '12×16': '20.00', '18×24': '25.00' }));
      assert.equal(wentRisen.price, 9.59, 'and so does the 12×16 at a $20.00 base');
    }
  } finally { srv.close(); }
});

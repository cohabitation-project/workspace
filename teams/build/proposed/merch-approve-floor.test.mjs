// The price floor at APPROVE, not only at save. GPT's table (teams/build/outputs/round74-gpt-price-floor.md) recorded
// that saveDraft refuses a price below Printful's base (commons/lib/merchsets.mjs:203-205) while approve() re-read the
// price and never rechecked it. Approving is the last moment before buyers see a product, so the floor is checked there
// too, against the price as it stands then. No server boot: the module directly against a stand-in Printful on a local
// port, as merch-sets.mjs's second test does. Asserts:
//   - control: a draft priced AT the floor is approved (the check refuses what is under it, not everything)
//   - a draft whose price was lowered below the base AFTER it was saved is refused at approve, with saveDraft's own
//     sentence, stays a draft on disk, and count() does not move: nothing under the floor reaches buyers
//   - FLOOR_MUTANT=1 runs that same below-floor draft against a COPY of the module with the new call removed, and it is
//     approved: that is what proves the refusal above comes from this check, not from something else. The mutant is a
//     copy the test makes for itself; nothing in the shipped module can switch a money check off.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { pathToFileURL } from 'node:url';
import { freePort } from './lib/port.mjs';

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');
const TEE = { 71: { title: 'Unisex Staple T-Shirt | Bella + Canvas 3001', variants: [
  { id: 4012, name: 'Black / M', color: 'Black', color_code: '#0b0b0b', size: 'M', price: '11.50' },
  { id: 4022, name: 'White / M', color: 'White', color_code: '#ffffff', size: 'M', price: '11.50' }] } };

/** A stand-in Printful: one tee whose cheapest variant costs $11.50. No mockup work: this test never asks for a photo. */
async function standin() {
  const port = await freePort();
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x'); const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    let m = u.pathname.match(/^\/products\/(\d+)$/);
    if (m && TEE[m[1]]) { const p = TEE[m[1]]; return json(200, { code: 200, result: { product: { id: Number(m[1]), title: p.title, currency: 'USD', is_discontinued: false }, variants: p.variants.map((v) => ({ ...v, in_stock: true })) } }); }
    m = u.pathname.match(/^\/mockup-generator\/printfiles\/(\d+)$/);
    if (m && TEE[m[1]]) return json(200, { code: 200, result: { available_placements: { front: 'Front print' }, printfiles: [{ printfile_id: 1, width: 1800, height: 2400, dpi: 150 }], variant_printfiles: TEE[m[1]].variants.map((v) => ({ variant_id: v.id, placements: { front: 1 } })) } });
    m = u.pathname.match(/^\/mockup-generator\/templates\/(\d+)$/);
    if (m) return json(200, { code: 200, result: { version: 1, min_dpi: 150, variant_mapping: [], templates: [] } });
    return json(404, { code: 404 });
  });
  await new Promise((r) => srv.listen(port, '127.0.0.1', r));
  return { srv, url: `http://127.0.0.1:${port}` };
}

/** A maker with one live listing and one tee saved as a draft at $30. Then the price changes on disk to `price`, the way
 *  an older set or a hand-edited file would have it, and a photo is put at the saved position so that the photo
 *  requirement cannot be what refuses it (approve() compares positions only; the picture's id is the art's own). */
async function draft(price, apiUrl) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-approve-floor-'));
  Object.assign(process.env, { PRINTFUL_TOKEN: 'test-token', PRINTFUL_API_URL: apiUrl, PRINTFUL_MOCKUPS_PER_MINUTE: '10', COMMONS_FEE_PERCENT: '0',
    PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'tee', id: 71 }]) });
  const store = await import('../lib/store.mjs'); const images = await import('../lib/images.mjs');
  const market = await import('../lib/market.mjs'); const merchsets = await import('../lib/merchsets.mjs'); const printful = await import('../lib/printful.mjs');
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: [{ id: 'm_painter', name: 'Painter One', kind: 'human', joined: '2026-11-01T00:00:00.000Z' }] }));
  store.init(D); images.init(D); market.init(D); merchsets.init(D); printful.resetCache();
  market.setHooks({ member: (id) => store.getMember(id), imageOwned: (m, id) => images.ownedBy(m, id) }); // as server.mjs:240 wires it
  const maker = store.getMember('m_painter'); assert.ok(maker, 'the maker is seeded');
  const art = images.upload(maker, { data: PNG, alt: 'a spiral sun over a city' });
  const l = market.create(maker, { title: 'Spiral Sun', text: 'A painting.', category: 'art', type: 'product', price: { mode: 'quote' }, license: 'all-rights', rights: true, images: [art.id] });
  await merchsets.saveDraft(maker, l.id, 'tee', { colors: ['Black'], scale: 0.6, x: 0.5, y: 0.3, price: 30 });
  const file = path.join(D, 'merch', 'sets.json'); const all = JSON.parse(fs.readFileSync(file, 'utf8')); const it = all[l.id].items.tee;
  const pos = `${it.pos.scale.toFixed(3)}:${it.pos.x.toFixed(3)}:${it.pos.y.toFixed(3)}:${it.pos.rot || 0}`;
  it.price = price; it.photos = { Black: { img: art.id, pos } }; fs.writeFileSync(file, JSON.stringify(all));
  merchsets.init(D); // reads merch/sets.json again: the price is now what the file says
  return { D, store, market, merchsets, maker, id: l.id, file };
}

/** What a refusal throws: the status and the sentence, whichever names CommonsError carries them under. */
async function refusal(fn) {
  try { await fn(); return null; } catch (e) { return { status: e?.status || e?.statusCode || e?.code || null, text: String(e?.message || e?.msg || e || '') }; }
}

test('a price lowered below Printful\'s base after the draft was saved is refused at approve', async () => {
  const { srv, url } = await standin();
  try {
    // The floor for an $11.50 tee at the card rate (2.9% + $0.30) and no Cohabi cut, from floor() at merchsets.mjs:69-72:
    // ceil((11.50 + 0.30 + 0.01) / (1 - 0.029) * 100) / 100 = $12.17.
    const atFloor = await draft(12.17, url);
    const ok = await refusal(() => atFloor.merchsets.approve(atFloor.maker, atFloor.id, 'tee'));
    assert.equal(ok, null, `a draft priced at the floor is approved (refused with: ${ok && ok.text})`);
    assert.equal(atFloor.merchsets.count(atFloor.id), 1, 'the product at the floor is on the listing');

    const below = await draft(5.00, url);
    const r = await refusal(() => below.merchsets.approve(below.maker, below.id, 'tee'));
    assert.ok(r, 'a draft priced below the floor is refused at approve');
    assert.match(r.text, /at \$5\.00 you'd earn nothing after Printful's cost and fees/);
    assert.match(r.text, /The lowest price that pays you is \$12\.17\./, 'the same sentence saveDraft uses, naming the lowest price that pays');
    assert.equal(below.merchsets.count(below.id), 0, 'nothing below the floor reaches buyers');
    assert.equal(JSON.parse(fs.readFileSync(below.file, 'utf8'))[below.id].items.tee.status, 'draft', 'and it is still a draft on disk');

    if (process.env.FLOOR_MUTANT === '1') {
      // The mutant: the shipped module, character for character, with the new call taken out. Imported from a copy beside
      // the data, with the library's own imports made absolute so the copy resolves them.
      const libDir = path.join(process.cwd(), 'commons', 'lib');
      const LINE = '  const vs = chosen(p, it); if (vs.length) checkFloor(p, vs, it.price);';
      const src = fs.readFileSync(path.join(libDir, 'merchsets.mjs'), 'utf8');
      assert.ok(src.includes(LINE), 'the line this mutant removes is still in the module, character for character');
      const mut = src.replace(LINE, '  const vs = chosen(p, it); // THE MUTANT: the floor is not checked here')
        .replace(/from '\.\/([a-z]+\.mjs)'/g, (m0, f) => `from '${path.join(libDir, f).replace(/\\/g, '/')}'`);
      assert.ok(!mut.includes(LINE), 'the mutant really lacks the check');
      const mutFile = path.join(below.D, 'merchsets-without-the-check.mjs'); fs.writeFileSync(mutFile, mut);
      const M = await import(pathToFileURL(mutFile).href); M.init(below.D);
      const went = await refusal(() => M.approve(below.maker, below.id, 'tee'));
      assert.equal(went, null, `with the check removed the same draft goes through (refused with: ${went && went.text})`);
      assert.equal(M.count(below.id), 1, 'and the product is on the listing');
      assert.equal(JSON.parse(fs.readFileSync(below.file, 'utf8'))[below.id].items.tee.status, 'approved', 'approved on disk');
    }
  } finally { srv.close(); }
});

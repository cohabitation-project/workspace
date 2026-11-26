// The curated Printful product list (round 66 + 67, DeepSeek): how many products survive a read, and what happens when
// a product — or the whole PRINTFUL_PRODUCTS env — is wrong.
//
// No server boot and no browser: `commons/lib/printful.mjs` is called directly against a fake Printful on 127.0.0.1,
// the same stand-in `commons/test/merch-printful.mjs` uses.
//
// Round 66 pinned today's behaviour and recorded the two SILENT paths (`PRINTFUL_PRODUCTS='[]'` and `'{bad'` both
// quietly became the eight defaults). Round 67 changed printful.mjs: unset still means the eight defaults (case 6),
// but SET and unusable now REFUSES with a CommonsError(500) and one log line per distinct problem (cases 3, 4, 5, 7
// and 8). Those cases are the red-able before/after for the change; the mutant in the report restores the old silent
// `curated()` and they go red while 1, 2 and 6 stay green.
//
// Run: node --test commons/test/printful-curated-guard.mjs   (needs the repo's real deps: printful.mjs loads
// fulfillment.mjs -> merchsets.mjs, which imports `sharp` at load).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { freePort } from './lib/port.mjs';

// printful.mjs's own DEFAULT_PRODUCTS ids, written out so a change to the fallback is visible here rather than
// silently agreeing with itself.
const DEFAULT_IDS = [71, 146, 19, 1, 3, 84, 358, 181];
const DEFAULT_KEYS = ['tee', 'hoodie', 'mug', 'poster', 'canvas', 'tote', 'sticker', 'phone'];

// One fake Printful for all cases. Any numeric product id gets a product, a print area and two in-stock variants; an id
// in `broken` answers 502, the way Printful does when it is having a problem.
function fakePrintful(broken) {
  const seen = [];
  const server = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    seen.push(u.pathname);
    const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    const p = /^\/products\/(\d+)$/.exec(u.pathname);
    if (p) {
      const id = Number(p[1]);
      if (broken.has(id)) return json(502, { code: 502, error: { message: 'The print partner is having a problem' } });
      return json(200, { code: 200, result: {
        product: { id, title: `Product ${id}`, currency: 'USD', is_discontinued: false },
        variants: [
          { id: id * 100 + 1, name: 'Black / M', color: 'Black', size: 'M', price: '12.95', in_stock: true },
          { id: id * 100 + 2, name: 'White / L', color: 'White', size: 'L', price: '11.50', in_stock: true },
        ] } });
    }
    const f = /^\/mockup-generator\/printfiles\/(\d+)$/.exec(u.pathname);
    if (f) {
      const id = Number(f[1]);
      if (broken.has(id)) return json(502, { code: 502, error: { message: 'The print partner is having a problem' } });
      return json(200, { code: 200, result: {
        product_id: id, available_placements: { front: 'Front print' },
        printfiles: [{ printfile_id: id * 10, width: 1800, height: 2400, dpi: 150 }],
        variant_printfiles: [
          { variant_id: id * 100 + 1, placements: { front: id * 10 } },
          { variant_id: id * 100 + 2, placements: { front: id * 10 } },
        ] } });
    }
    json(404, { code: 404 });
  });
  return { server, seen };
}

test('the curated Printful list: what survives a read, and what refuses', async (t) => {
  const saved = {};
  for (const k of ['COMMONS_DATA', 'PRINTFUL_TOKEN', 'PRINTFUL_API_URL', 'PRINTFUL_PRODUCTS', 'PRINTFUL_STORE_ID', 'PRINTFUL_MOCKUPS_PER_MINUTE']) saved[k] = process.env[k];
  const broken = new Set();
  const { server, seen } = fakePrintful(broken);
  const FP = await freePort();
  await new Promise((r) => server.listen(FP, '127.0.0.1', r));
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'printful-curated-'));
  try {
    process.env.COMMONS_DATA = D;
    process.env.PRINTFUL_TOKEN = 'test-token';
    process.env.PRINTFUL_API_URL = `http://127.0.0.1:${FP}`;
    delete process.env.PRINTFUL_STORE_ID;
    delete process.env.PRINTFUL_PRODUCTS;
    const printful = await import('../lib/printful.mjs');

    // A refusal read without assert.rejects: assert.rejects resolves to undefined, and cases that then read
    // `err.status` off it fail with a TypeError that looks like a product failure. This returns the error itself.
    const refusal = async () => { try { await printful.products(); } catch (e) { return e; } return null; };

    await t.test('1. every curated product answers: N products, in the order given', async () => {
      process.env.PRINTFUL_PRODUCTS = JSON.stringify([{ key: 'tee', id: 11 }, { key: 'mug', id: 12 }, { key: 'poster', id: 13 }, { key: 'tote', id: 14 }, { key: 'sticker', id: 15 }]);
      printful.resetCache(); broken.clear(); seen.length = 0;
      const list = await printful.products();
      assert.equal(list.length, 5, `expected 5 products, got ${list.map((p) => p.key).join(',') || 'none'}`);
      assert.deepEqual(list.map((p) => p.key), ['tee', 'mug', 'poster', 'tote', 'sticker'], 'PRINTFUL_PRODUCTS order is kept');
      assert.deepEqual(list.map((p) => p.id), [11, 12, 13, 14, 15]);
      assert.equal(list[0].title, 'Product 11', "the title shown is Printful's own");
      assert.equal(list[0].base_from, 11.5, 'the base cost is the cheapest in-stock variant price');
      assert.deepEqual(list[0].area, { width: 1800, height: 2400 }, 'the print area comes from the printfiles call');
      assert.equal(list[0].variants.length, 2, 'in-stock variants are carried through');
      assert.equal(printful.cachedProducts().length, 5, 'a complete read is the cache');
      // The list pages are rendered from is the same list, in the same order (found by mutant 2 in round 67: sorting
      // `out` before caching went unnoticed while only the first live read was checked).
      const again = await printful.products();   // a cache hit: no Printful call
      assert.deepEqual(again.map((p) => p.key), ['tee', 'mug', 'poster', 'tote', 'sticker'], 'a cache hit keeps the order');
      assert.deepEqual(printful.cachedProducts().map((p) => p.key), ['tee', 'mug', 'poster', 'tote', 'sticker'], 'cachedProducts() keeps the order pages show');
      // Every curated id was asked for, once each and in the order given (the round-66 version of this line was a
      // no-op: `seen.every((p) => … || true)` is always true).
      assert.deepEqual(seen.filter((p) => /^\/products\//.test(p)), ['/products/11', '/products/12', '/products/13', '/products/14', '/products/15'], 'every curated id is asked for, in order');
    });

    await t.test('2. one product answers 502: the others still come back, nothing throws, and [] is not cached', async () => {
      process.env.PRINTFUL_PRODUCTS = JSON.stringify([{ key: 'tee', id: 11 }, { key: 'mug', id: 12 }, { key: 'poster', id: 13 }]);
      printful.resetCache(); broken.clear(); broken.add(12);
      let list;
      await assert.doesNotReject(async () => { list = await printful.products(); }, 'a passing Printful problem must not throw');
      assert.deepEqual(list.map((p) => p.key), ['tee', 'poster'], 'the refused product is left out; order survives');
      assert.equal(printful.cachedProducts().length, 0, 'a hiccup is never cached as "these are the products"');
      // ...and it is retried rather than remembered: inside RETRY_MS the last good list (here: none) is served without
      // asking Printful again. Not waited out here (60 s); see the report's limits.
      const askedBefore = seen.length; await printful.products();
      assert.equal(seen.length, askedBefore, 'inside RETRY_MS Printful is not asked again');
    });

    await t.test("3. PRINTFUL_PRODUCTS='[]' REFUSES (it is set and wrong), and logs one line", async () => {
      process.env.PRINTFUL_PRODUCTS = '[]';
      printful.resetCache(); broken.clear();
      const lines = []; const log = console.error; console.error = (...a) => lines.push(a.join(' '));
      let err;
      try { err = await refusal(); err = await refusal() || err; }   // twice: the log line appears once per problem
      finally { console.error = log; }
      assert.ok(err, "an empty PRINTFUL_PRODUCTS must refuse, not sell the eight defaults in silence");
      assert.match(err.message, /PRINTFUL_PRODUCTS is set but unusable: it is an empty array/);
      assert.equal(err.status, 500);
      assert.equal(lines.filter((l) => l.startsWith('[printful]') && /empty array/.test(l)).length, 1, `one log line per distinct problem, got ${lines.length}`);
      const asked = seen.length; await refusal();
      assert.equal(seen.length, asked, 'a refusal asks Printful nothing');
    });

    await t.test("4. PRINTFUL_PRODUCTS='{bad' (broken JSON) REFUSES and names the length it could not parse", async () => {
      process.env.PRINTFUL_PRODUCTS = '{bad';
      printful.resetCache(); broken.clear();
      const err = await refusal();
      assert.ok(err, 'broken JSON must refuse, not fall back to the eight defaults');
      assert.match(err.message, /PRINTFUL_PRODUCTS is set but unusable: it is not valid JSON \(4 characters\)/);
      assert.equal(err.status, 500);
    });

    await t.test('5. an entry without an id REFUSES and names the entry (it used to reach Printful as /products/NaN)', async () => {
      process.env.PRINTFUL_PRODUCTS = JSON.stringify([{ key: 'tee' }]);
      printful.resetCache(); broken.clear(); seen.length = 0;
      const err = await refusal();
      assert.ok(err, 'an entry that is not {key, id} must refuse');
      assert.match(err.message, /entry 0 is not \{key, id\}/);
      assert.equal(err.status, 500);
      assert.equal(seen.filter((p) => p.includes('NaN')).length, 0, 'no request is made with a NaN id');
    });

    await t.test('6. PRINTFUL_PRODUCTS unset still falls back to the eight defaults, in silence (the intended fallback)', async () => {
      delete process.env.PRINTFUL_PRODUCTS;
      printful.resetCache(); broken.clear();
      const lines = []; const log = console.error; console.error = (...a) => lines.push(a.join(' '));
      let list;
      try { list = await printful.products(); } finally { console.error = log; }
      assert.deepEqual(list.map((p) => p.id), DEFAULT_IDS, 'unset is not a mistake: the eight defaults');
      assert.deepEqual(list.map((p) => p.key), DEFAULT_KEYS);
      assert.equal(list.length, 8);
      assert.equal(lines.filter((l) => l.startsWith('[printful]')).length, 0, 'unset logs nothing');
    });

    await t.test('7. the same key twice REFUSES (one product used to win without a word)', async () => {
      process.env.PRINTFUL_PRODUCTS = JSON.stringify([{ key: 'tee', id: 11 }, { key: 'tee', id: 12 }]);
      printful.resetCache(); broken.clear();
      const err = await refusal();
      assert.ok(err, 'a repeated key must refuse');
      assert.match(err.message, /the key "tee" appears twice/);
      assert.equal(err.status, 500);
    });

    await t.test('8. valid JSON that is not an array REFUSES', async () => {
      process.env.PRINTFUL_PRODUCTS = JSON.stringify({ key: 'tee', id: 11 });
      printful.resetCache(); broken.clear();
      const err = await refusal();
      assert.ok(err, 'a JSON object is not a product list');
      assert.match(err.message, /it is not a JSON array/);
      assert.equal(err.status, 500);
    });
  } finally {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    server.close();
  }
});

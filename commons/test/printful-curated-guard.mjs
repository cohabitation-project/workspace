// The curated Printful product list (round 66, DeepSeek; round 67 added the loud-fallback cases): how many products
// survive a read, and what happens when a product — or the whole PRINTFUL_PRODUCTS env — is wrong.
//
// No server boot and no browser: `commons/lib/printful.mjs` is called directly against a fake Printful on 127.0.0.1,
// the same stand-in `commons/test/merch-printful.mjs` uses.
//
// Round 66 pinned TODAY'S behaviour, including two SILENT paths: `PRINTFUL_PRODUCTS='[]'` and `PRINTFUL_PRODUCTS='{bad'`
// both quietly fell back to the eight defaults. Round 67 makes that fallback loud (printful.mjs: `curated()`), so cases
// 3, 4, 5 and 7 now assert a refusal that names the variable, and case 6 keeps the one fallback that is still intended:
// the variable not set at all. The old silent behaviour is the mutant this change must fail against.
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
const GUIDE = /must be JSON like \[\{"key":"tee","id":71\}\]/;

// One fake Printful for all cases. Any numeric product id gets a product, a print area and two in-stock variants;
// an id in `broken` answers 502, the way Printful does when it is having a problem.
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
    const printful = await import('../lib/printful.mjs');

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
      assert.deepEqual(seen.filter((p) => p.startsWith('/products/')), ['/products/11', '/products/12', '/products/13', '/products/14', '/products/15'],
        'every curated id was asked for, once, in the order given');
    });

    await t.test('2. one product answers 502: the others still come back, nothing throws, and [] is not cached', async () => {
      process.env.PRINTFUL_PRODUCTS = JSON.stringify([{ key: 'tee', id: 11 }, { key: 'mug', id: 12 }, { key: 'poster', id: 13 }]);
      printful.resetCache(); broken.clear(); broken.add(12);
      let list;
      await assert.doesNotReject(async () => { list = await printful.products(); }, 'a passing Printful problem must not throw');
      assert.deepEqual(list.map((p) => p.key), ['tee', 'poster'], 'the refused product is left out; order survives');
      assert.equal(printful.cachedProducts().length, 0, 'a hiccup is never cached as "these are the products"');
      // ...and it is retried rather than remembered: within RETRY_MS the last good list (here: none) is served without
      // asking again. Not waited out here (60 s); see the report's limits.
      const askedBefore = seen.length; await printful.products();
      assert.equal(seen.length, askedBefore, 'inside RETRY_MS Printful is not asked again');
    });

    await t.test("3. PRINTFUL_PRODUCTS='[]' refuses loudly (round 67: was the eight defaults, silently)", async () => {
      process.env.PRINTFUL_PRODUCTS = '[]';
      printful.resetCache(); broken.clear();
      const err = await assert.rejects(() => printful.products(), /PRINTFUL_PRODUCTS is set but unusable: it is an empty array/);
      assert.equal(err.status, 500, 'a misconfigured server says so as a server error, not a 400 for the person');
      assert.match(err.message, GUIDE, 'the message says what the variable should look like');
      assert.equal(printful.cachedProducts().length, 0, 'nothing is cached, so nothing stale is served after the fix');
    });

    await t.test("4. PRINTFUL_PRODUCTS='{bad' (broken JSON) refuses loudly too, by a different path from 3", async () => {
      process.env.PRINTFUL_PRODUCTS = '{bad';
      printful.resetCache(); broken.clear();
      const err = await assert.rejects(() => printful.products(), /PRINTFUL_PRODUCTS is set but unusable: it is not valid JSON \(4 characters\)/);
      assert.equal(err.status, 500);
    });

    await t.test('5. an entry that is not {key, id} refuses loudly instead of asking Printful for /products/NaN', async () => {
      process.env.PRINTFUL_PRODUCTS = JSON.stringify([{ key: 'tee' }]);
      printful.resetCache(); broken.clear(); seen.length = 0;
      const err = await assert.rejects(() => printful.products(), /entry 0 is not \{key, id\}/);
      assert.equal(err.status, 500);
      assert.deepEqual(seen.filter((p) => p.startsWith('/products/')), [], 'Printful was never asked');
    });

    await t.test('6. PRINTFUL_PRODUCTS unset is still the eight defaults: that fallback is intended', async () => {
      delete process.env.PRINTFUL_PRODUCTS;
      printful.resetCache(); broken.clear();
      const list = await printful.products();
      assert.deepEqual(list.map((p) => p.id), DEFAULT_IDS, 'no env var means the built-in list, as before');
      assert.deepEqual(list.map((p) => p.key), DEFAULT_KEYS);
      assert.equal(list.length, 8);
    });

    await t.test('7. two entries with the same key refuse loudly: one would silently win', async () => {
      process.env.PRINTFUL_PRODUCTS = JSON.stringify([{ key: 'tee', id: 11 }, { key: 'tee', id: 12 }]);
      printful.resetCache(); broken.clear();
      const err = await assert.rejects(() => printful.products(), /the key "tee" appears twice/);
      assert.equal(err.status, 500);
    });
  } finally {
    for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
    server.close();
  }
});

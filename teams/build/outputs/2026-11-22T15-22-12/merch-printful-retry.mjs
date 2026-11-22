// #291 defect 1 (Claude's review, teams/build/outputs/review-291-9970a4f3.md): a 429 or timeout on the first read of
// Printful's catalog used to cache an empty product list for 6 hours, which hid the "Make it a product" panel.
// Now a passing failure is never cached: the list is read again after the retry window, and a good list survives a
// later hiccup. Runs against a stand-in Printful on 127.0.0.1; the clock is moved by replacing Date.now.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { freePort } from './lib/port.mjs';

const PRODUCT = { code: 200, result: { product: { id: 71, title: 'Unisex Staple T-Shirt', currency: 'USD', is_discontinued: false }, variants: [{ id: 4012, name: 'Black / M', color: 'Black', size: 'M', price: '12.95', in_stock: true }] } };
const FILES = { code: 200, result: { product_id: 71, available_placements: { front: 'Front print' }, printfiles: [{ printfile_id: 1, width: 1800, height: 2400 }], variant_printfiles: [{ variant_id: 4012, placements: { front: 1 } }] } };

test('a Printful 429 is not cached as "no products": the list comes back after the retry window, and a later hiccup keeps the good list', async () => {
  let mode = '429'; let calls = 0;
  const FP = await freePort();
  const fake = http.createServer((req, res) => {
    calls++;
    const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (mode === '429') return json(429, { code: 429, error: { message: 'Too Many Requests' } });
    if (mode === '500') return json(500, { code: 500 });
    if (req.url === '/products/71') return json(200, PRODUCT);
    if (req.url === '/mockup-generator/printfiles/71') return json(200, FILES);
    json(404, { code: 404 });
  });
  await new Promise((r) => fake.listen(FP, '127.0.0.1', r));
  Object.assign(process.env, { PRINTFUL_TOKEN: 'test-token', PRINTFUL_API_URL: `http://127.0.0.1:${FP}`, PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'tee', id: 71 }]) });
  const realNow = Date.now; let t = realNow();
  Date.now = () => t;
  try {
    const printful = await import('../lib/printful.mjs');
    printful.resetCache();

    assert.deepEqual(await printful.products(), [], 'the first read hits a 429: nothing to show yet');
    const beforeSecond = calls;
    assert.deepEqual(await printful.products(), [], 'the second consecutive read also fails with a 429');
    assert.equal(calls, beforeSecond + 1, 'the second products() call makes a fresh Printful request');

    mode = 'ok'; const before = calls;
    const list = await printful.products();
    assert.equal(calls, before + 2, 'the next read makes fresh product and printfile requests');
    assert.deepEqual(list.map((p) => p.key), ['tee'], 'after the retry window the real list comes back (the old code kept [] for 6 hours)');

    // A good list, then Printful has a bad minute when the 6-hour cache runs out: the good list stays in use.
    t += 6 * 3600_000 + 1; mode = '500';
    assert.deepEqual((await printful.products()).map((p) => p.key), ['tee'], 'a hiccup after a good read keeps the good list');
    mode = 'ok'; t += the retry window + 1;
    assert.deepEqual((await printful.products()).map((p) => p.key), ['tee'], 'and the list is read again once Printful answers');
  } finally { Date.now = realNow; fake.close(); }
});

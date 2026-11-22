// #291 defect 1: a failed or empty catalog must not be cached. Two immediate 429 reads must both reach Printful;
// a prior good catalog remains available during a later failure, and recovery is retried on the next read.
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { freePort } from './lib/port.mjs';

const PRODUCT = { code: 200, result: { product: { id: 71, title: 'Unisex Staple T-Shirt', currency: 'USD', is_discontinued: false }, variants: [{ id: 4012, name: 'Black / M', color: 'Black', size: 'M', price: '12.95', in_stock: true }] } };
const FILES = { code: 200, result: { product_id: 71, available_placements: { front: 'Front print' }, printfiles: [{ printfile_id: 1, width: 1800, height: 2400 }], variant_printfiles: [{ variant_id: 4012, placements: { front: 1 } }] } };

test('a failed Printful catalog read is never cached; consecutive 429s retry and a good catalog survives a later hiccup', async () => {
  let mode = '429'; const paths = [];
  const FP = await freePort();
  const fake = http.createServer((req, res) => {
    paths.push(req.url);
    const json = (code, o) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(o)); };
    if (mode === '429') return json(429, { code: 429, error: { message: 'Too Many Requests' } });
    if (mode === '500') return json(500, { code: 500 });
    if (req.url === '/products/71') return json(200, PRODUCT);
    if (req.url === '/mockup-generator/printfiles/71') return json(200, FILES);
    json(404, { code: 404 });
  });
  await new Promise((r) => fake.listen(FP, '127.0.0.1', r));
  Object.assign(process.env, { PRINTFUL_TOKEN: 'test-token', PRINTFUL_API_URL: `http://127.0.0.1:${FP}`, PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'tee', id: 71 }]) });
  const realNow = Date.now; let now = realNow(); Date.now = () => now;
  try {
    const printful = await import('../lib/printful.mjs');
    printful.resetCache();
    assert.deepEqual(await printful.products(), [], 'first read has a 429 and returns no products');
    const afterFirst = paths.length;
    assert.deepEqual(await printful.products(), [], 'second consecutive read also has a 429');
    assert.equal(paths.length, afterFirst + 1, 'the second products() call makes a fresh Printful request');

    mode = 'ok'; const beforeSuccess = paths.length;
    assert.deepEqual((await printful.products()).map((p) => p.key), ['tee']);
    assert.equal(paths.length, beforeSuccess + 2, 'a successful catalog reads product and printfile data');

    now += 6 * 3600_000 + 1; mode = '500'; const beforeHiccup = paths.length;
    assert.deepEqual((await printful.products()).map((p) => p.key), ['tee'], 'last good catalog survives a later provider failure');
    assert.equal(paths.length, beforeHiccup + 1, 'expired cache triggers a fresh request');
    mode = 'ok'; const beforeRecovery = paths.length;
    assert.deepEqual((await printful.products()).map((p) => p.key), ['tee'], 'the next call retries after the failure');
    assert.equal(paths.length, beforeRecovery + 2, 'recovery refreshes product and printfile data');
  } finally { Date.now = realNow; fake.close(); }
});

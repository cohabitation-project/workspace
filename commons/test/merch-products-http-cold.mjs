// Round 69 (DeepSeek): what the composer's catalogue call gets ON THE WIRE when the print partner has a passing
// problem. printful.products() refuses a cold hiccup with transient(502, COLD) (round 68); nobody had checked what
// the HTTP layer does with that refusal, or whether the refusal leaks Printful's own details to the page.
//
// Boots the real server against a local fake Printful, the way seo-sitemap-signin.mjs boots against a temp data dir,
// and reads GET /api/merch/products exactly as commons/public/market.js does.
//
// Two phases, two servers: the refusal is remembered for RETRY_MS (60 s) inside the server process, so the healthy
// read needs a fresh process rather than a 60-second wait. printful.mjs has no env for a shorter retry window.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const { freePort } = await import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The sentence the maker reads (printful.COLD), pinned here as a literal on purpose: this is the wire contract.
// If someone rewords COLD, this test goes red and says the panel's sentence changed — which is the point.
const COLD = "The print partner isn't answering right now, so there are no products to show yet. Try again in a minute.";
// A token the fake never needs. If it ever appears in a response body, the refusal is leaking what we hold.
const TOKEN = 'test-token-round69-never-echoed';
const DEFAULTS = 8; // printful.DEFAULT_PRODUCTS (Ash's list), used when PRINTFUL_PRODUCTS is unset

// A tiny fake Printful on 127.0.0.1.
//  'cold'    answers 429 to everything (a rate limit: the passing problem that must not read as "no products").
//  'healthy' answers the two reads products() makes per curated product: the catalog product, then its print files.
function fakePrintful(mode) {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push(req.url);
    res.setHeader('content-type', 'application/json');
    if (mode === 'cold') {
      res.statusCode = 429;
      return res.end(JSON.stringify({ code: 429, error: { message: 'Too Many Requests' } }));
    }
    const product = req.url.match(/^\/products\/(\d+)/);
    if (product) {
      const id = Number(product[1]);
      return res.end(JSON.stringify({ code: 200, result: {
        product: { id, title: `Test product ${id}`, image: 'https://example.invalid/art.png', currency: 'USD', is_discontinued: false },
        variants: [{ id: 10000 + id, name: 'White / M', color: 'White', color_code: '#ffffff', size: 'M', price: '12.00', in_stock: true }],
      } }));
    }
    const printfiles = req.url.match(/^\/mockup-generator\/printfiles\/(\d+)/);
    if (printfiles) {
      const id = Number(printfiles[1]);
      return res.end(JSON.stringify({ code: 200, result: {
        available_placements: { front: 'Front' },
        printfiles: [{ printfile_id: 50000 + id, width: 3000, height: 4000, dpi: 300 }],
        variant_printfiles: [{ variant_id: 10000 + id, placements: { front: 50000 + id } }],
      } }));
    }
    res.statusCode = 404;
    res.end(JSON.stringify({ code: 404, error: { message: `the fake has no ${req.url}` } }));
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve({
    seen, server, url: `http://127.0.0.1:${server.address().port}`,
  })));
}

// A real server process on its own port and its own empty data dir, pointed at the fake.
async function boot(apiUrl) {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-http-cold-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT,
    env: {
      ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir,
      COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1',
      PRINTFUL_TOKEN: TOKEN, PRINTFUL_API_URL: apiUrl, PRINTFUL_PRODUCTS: '',
    },
    stdio: 'ignore',
  });
  let up = false;
  for (let i = 0; i < 120 && !up; i++) {
    try { up = (await fetch(`${base}/api/presence`)).ok; } catch { /* still starting */ }
    if (!up) await sleep(250);
  }
  assert.ok(up, `server booted (${base})`);
  return { child, base, stop: () => { child.kill(); fs.rmSync(dataDir, { recursive: true, force: true }); } };
}

test('a cold Printful hiccup reaches the composer as 502 + the sentence, and a healthy read as 200 + products', { timeout: 180000 }, async () => {
  // ---- phase 1: Printful is rate-limiting (a passing problem), nothing cached, fresh server
  const coldFake = await fakePrintful('cold');
  const cold = await boot(coldFake.url);
  try {
    const res = await fetch(`${cold.base}/api/merch/products`);
    const text = await res.text();
    console.log(`cold: status=${res.status} body=${text} fake_requests=${coldFake.seen.length}`);
    assert.equal(res.status, 502, 'a cold passing problem is a 502, not a 200 and not a 429 handed to the browser');
    let body;
    assert.doesNotThrow(() => { body = JSON.parse(text); }, 'the refusal is JSON the panel can read');
    assert.equal(body.error, COLD, 'the body carries exactly the sentence the maker reads');
    for (const leak of ['429', 'api.printful.com', TOKEN, 'Too Many Requests']) {
      assert.ok(!text.includes(leak), `the refusal does not leak Printful's own detail (${leak})`);
    }
    assert.ok(coldFake.seen.length > 0, 'the server really did ask the fake');
    assert.ok(!coldFake.seen.some((u) => u.startsWith('/mockup-generator')), 'a 429 on the product read stops there');
  } finally { cold.stop(); coldFake.server.close(); }

  // ---- phase 2: Printful is healthy, fresh server (the refusal is remembered for RETRY_MS in a process)
  const goodFake = await fakePrintful('healthy');
  const good = await boot(goodFake.url);
  try {
    const res = await fetch(`${good.base}/api/merch/products`);
    const text = await res.text();
    let body;
    assert.doesNotThrow(() => { body = JSON.parse(text); }, 'the catalogue is JSON');
    console.log(`healthy: status=${res.status} connected=${body.connected} products=${body.products?.length} first=${body.products?.[0]?.key} fake_requests=${goodFake.seen.length}`);
    assert.equal(res.status, 200);
    assert.equal(body.connected, true, 'the panel can tell the partner is connected');
    assert.ok(Array.isArray(body.products), 'products is an array');
    assert.equal(body.products.length, DEFAULTS, `all ${DEFAULTS} curated products answered`);
    assert.equal(body.products[0].key, 'tee');
    assert.ok(!text.includes(TOKEN), 'a healthy catalogue does not echo our token either');
  } finally { good.stop(); goodFake.server.close(); }
});

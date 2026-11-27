#!/usr/bin/env node
// Real 390x844 browser regression for Printful's cold-read refusal and recovery.
// Setu: place as commons/test/merch-cold-read-ui.mjs, then run
//   node commons/test/merch-cold-read-ui.mjs [evidence-directory]
// The only wait is the server's real 60-second retry window; no product code or clock is changed.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = process.env.COMMONS_TEST_ROOT || path.resolve(import.meta.dirname, '../..');
const out = path.resolve(process.argv[2] || '/tmp/merch-cold-read-ui');
fs.mkdirSync(out, { recursive: true });
const freePort = () => new Promise((resolve) => {
  const s = net.createServer();
  s.listen(0, '127.0.0.1', () => { const port = s.address().port; s.close(() => resolve(port)); });
});

const PRODUCT = { code: 200, result: {
  product: { id: 71, title: 'Unisex Staple T-Shirt', currency: 'USD', is_discontinued: false },
  variants: [{ id: 4012, name: 'Black / M', color: 'Black', size: 'M', price: '12.95', in_stock: true }],
} };
const FILES = { code: 200, result: {
  product_id: 71,
  available_placements: { front: 'Front print' },
  printfiles: [{ printfile_id: 1, width: 1800, height: 2400 }],
  variant_printfiles: [{ variant_id: 4012, placements: { front: 1 } }],
} };
let mode = '429';
let rateLimited = 0;
let healthy = 0;
const fakePort = await freePort();
const fake = http.createServer((req, res) => {
  const json = (status, body) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };
  if (mode === '429') { rateLimited++; return json(429, { code: 429, error: { message: 'Too Many Requests' } }); }
  healthy++;
  if (/^\/products\/71$/.test(req.url)) return json(200, PRODUCT);
  if (/^\/mockup-generator\/printfiles\/71$/.test(req.url)) return json(200, FILES);
  return json(404, { code: 404, error: { message: 'Not Found' } });
});
await new Promise((resolve) => fake.listen(fakePort, '127.0.0.1', resolve));

const data = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-cold-read-'));
const port = await freePort();
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['commons/server.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    COMMONS_DATA: data,
    ASHRAM_PORT: String(port),
    COMMONS_PORT: String(port),
    COMMONS_ARRIVE_BYPASS: 'TESTGATE',
    COMMONS_FAKE_LLM: '1',
    COMMONS_NO_SPEND_POLL: '1',
    OPENROUTER_API_KEY: '',
    LLM_API_KEY: '',
    COMMONS_PAYMENTS: '',
    STRIPE_SECRET_KEY: '',
    STRIPE_PUBLISHABLE_KEY: '',
    PRINTFUL_TOKEN: 'test-token',
    PRINTFUL_API_URL: `http://127.0.0.1:${fakePort}`,
    PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'tee', id: 71 }]),
  },
  stdio: 'ignore',
});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`${base}/api/rooms`)).ok) { ready = true; break; } } catch { /* booting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'isolated Commons server starts');

  const post = (url, body, cookie) => fetch(`${base}${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Commons': '1', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  const visitorResponse = await post('/api/arrive/visitor', {});
  assert.equal(visitorResponse.status, 200, 'test visitor is created');
  const visitor = await visitorResponse.json();
  const bypass = await post('/api/arrive/bypass', { vid: visitor.vid, code: 'TESTGATE' });
  assert.ok(bypass.ok, `test gate accepts visitor (status ${bypass.status})`);
  const entered = await post('/api/arrive/enter', { vid: visitor.vid, name: 'Cold Read Maker' });
  assert.equal(entered.status, 201, 'maker enters the isolated Commons');
  const makerCookie = (entered.headers.get('set-cookie') || '').split(';')[0];
  assert.ok(makerCookie.includes('='), 'maker session cookie is issued');

  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const [cookieName, ...cookieValueParts] = makerCookie.split('=');
  await context.addCookies([{ name: cookieName, value: cookieValueParts.join('='), url: base }]);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const productsResponse = () => page.waitForResponse((r) => {
    try { return new URL(r.url()).pathname === '/api/merch/products' && r.request().method() === 'GET'; }
    catch { return false; }
  }, { timeout: 15_000 });

  const coldPromise = productsResponse();
  const opened = await page.goto(`${base}/label/new`);
  assert.equal(opened.status(), 200, 'signed-in maker composer responds 200');
  const cold = await coldPromise;
  assert.equal(cold.status(), 502, 'cold Printful 429 becomes an honest transient refusal');
  mode = 'ok'; // recovery is ready, but the server must honor its own one-minute retry window
  const retryAt = Date.now() + 60_100;
  await page.selectOption('#mk-form [name=category]', 'art');
  const merch = page.locator('#mk-merch');
  await merch.waitFor({ state: 'visible' });
  const retry = merch.getByRole('button', { name: 'Try again', exact: true });
  await retry.waitFor({ state: 'visible' });
  assert.ok(await retry.isEnabled(), 'Try again is enabled');
  const box = await retry.boundingBox();
  assert.ok(box && box.width > 0 && box.height > 0, 'Try again has a real phone tap target');
  assert.match(await page.locator('#mf-msg').textContent(), /no products to show yet.*Try again in a minute/i);
  assert.equal(await page.locator('#mf-product option').count(), 0, 'a cold refusal is not rendered as a product');
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(width <= 390, `composer fits 390px viewport (document width ${width}px)`);
  await page.screenshot({ path: path.join(out, 'merch-cold-read-390.png'), fullPage: true });
  console.log(`COLD status=502 viewport=390x844 document-width=${width}px retry=${Math.round(box.width)}x${Math.round(box.height)}px fake-429=${rateLimited}`);

  await new Promise((resolve) => setTimeout(resolve, Math.max(0, retryAt - Date.now())));
  const recoveredPromise = productsResponse();
  await retry.click();
  const recovered = await recoveredPromise;
  assert.equal(recovered.status(), 200, 'Try again obtains the healthy catalogue after the retry window');
  await page.waitForFunction(() => document.querySelector('#mf-product option')?.textContent.includes('Unisex Staple T-Shirt'));
  assert.equal(await page.locator('#mf-product option').count(), 1, 'the healthy product populates the picker');
  assert.match(await page.locator('#mf-variant option').textContent(), /Black \/ M.*12\.95/);
  assert.ok(await merch.isVisible(), 'product panel remains visible after recovery');
  assert.ok(await retry.isHidden(), 'Try again disappears after recovery');
  await page.locator('#mf-on').check();
  assert.ok(await page.locator('#mf-product').isVisible(), 'the populated product picker can actually be seen');
  await page.screenshot({ path: path.join(out, 'merch-recovered-390.png'), fullPage: true });
  assert.deepEqual(errors, [], 'no browser page errors');
  assert.ok(rateLimited >= 1 && healthy >= 2, 'fake Printful exercised both the 429 and healthy branches');
  console.log(`RECOVERED status=200 product="Unisex Staple T-Shirt" variant="Black / M" fake-healthy=${healthy}`);
  console.log(`PASS: Printful cold-read retry at 390x844; evidence=${out}`);
} finally {
  await browser?.close();
  server.kill();
  await new Promise((resolve) => fake.close(resolve));
  fs.rmSync(data, { recursive: true, force: true });
}

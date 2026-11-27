#!/usr/bin/env node
// Round 69: real 390x844 browser check of the cold Printful refusal and its retry.
// Candidate: node teams/build/outputs/merch-cold-read-ui.mjs [evidence-directory]
// Placed:    node commons/test/merch-cold-read-ui.mjs [evidence-directory]
// No money, live Printful account, staging, or production is touched. The Commons and Printful are isolated locally.
// The healthy retry waits out the server's real 60-second cold-read retry window; it does not bypass product logic.
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = [path.resolve(import.meta.dirname, '../..'), path.resolve(import.meta.dirname, '../../..')]
  .find((p) => fs.existsSync(path.join(p, 'commons/server.mjs')));
assert.ok(root, 'candidate/placed test finds the repository root');
const out = path.resolve(process.argv[2] || '/tmp/merch-cold-read-ui');
fs.mkdirSync(out, { recursive: true });
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-cold-ui-'));
const freePort = () => new Promise((resolve) => {
  const server = net.createServer();
  server.listen(0, '127.0.0.1', () => { const p = server.address().port; server.close(() => resolve(p)); });
});
const port = await freePort();
const printfulPort = await freePort();
const base = `http://127.0.0.1:${port}`;
const requests = [];
let first429 = true;
const PRODUCT = { code: 200, result: { product: { id: 71, title: 'Cold Read Test Tee', currency: 'USD', is_discontinued: false }, variants: [{ id: 4012, name: 'Black / M', color: 'Black', size: 'M', price: '12.95', in_stock: true }] } };
const FILES = { code: 200, result: { product_id: 71, available_placements: { front: 'Front print' }, printfiles: [{ printfile_id: 1, width: 1800, height: 2400 }], variant_printfiles: [{ variant_id: 4012, placements: { front: 1 } }] } };
const printful = http.createServer((req, res) => {
  requests.push({ method: req.method, url: req.url, at: Date.now() });
  const json = (status, value) => { res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(value)); };
  if (req.url === '/products/71' && first429) {
    first429 = false;
    return json(429, { code: 429, error: { message: 'Too Many Requests' } });
  }
  if (req.url === '/products/71') return json(200, PRODUCT);
  if (req.url === '/mockup-generator/printfiles/71') return json(200, FILES);
  return json(404, { code: 404, error: { message: `Unexpected fake-Printful path: ${req.url}` } });
});
await new Promise((resolve) => printful.listen(printfulPort, '127.0.0.1', resolve));

const serverLog = fs.openSync(path.join(out, 'server.log'), 'w');
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
    PRINTFUL_TOKEN: 'isolated-test-token',
    PRINTFUL_API_URL: `http://127.0.0.1:${printfulPort}`,
    PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'tee', id: 71 }]),
  },
  stdio: ['ignore', serverLog, serverLog],
});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`${base}/api/rooms`)).ok) { ready = true; break; } } catch { /* booting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'isolated Commons server starts');

  // Verbatim public test-gate boot pattern from market-phone-flow.mjs: create a human session, not a back-door member.
  const post = (url, body, cookie) => fetch(`${base}${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'X-Commons': '1', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(body),
  });
  const visitorResponse = await post('/api/arrive/visitor', {});
  assert.equal(visitorResponse.status, 200, 'test visitor is created');
  const visitor = await visitorResponse.json();
  assert.ok(visitor.vid, 'visitor response contains a temporary id');
  const bypass = await post('/api/arrive/bypass', { vid: visitor.vid, code: 'TESTGATE' });
  assert.ok(bypass.ok, `test gate accepts visitor (status ${bypass.status})`);
  const entered = await post('/api/arrive/enter', { vid: visitor.vid, name: 'Cold Read UI Maker' });
  assert.equal(entered.status, 201, 'maker enters the isolated Commons');
  const makerCookie = (entered.headers.get('set-cookie') || '').split(';')[0];
  assert.ok(makerCookie.includes('='), 'maker session cookie is issued');

  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const [cookieName, ...cookieValueParts] = makerCookie.split('=');
  await context.addCookies([{ name: cookieName, value: cookieValueParts.join('='), url: base }]);
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const requestFailures = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push({ text: message.text(), url: message.location().url }); });
  page.on('requestfailed', (request) => requestFailures.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`));

  const isProducts = (response) => new URL(response.url()).pathname === '/api/merch/products' && response.request().method() === 'GET';
  const firstResponsePromise = page.waitForResponse(isProducts);
  const navigation = await page.goto(`${base}/label/new`);
  assert.equal(navigation.status(), 200, 'signed-in /label/new responds 200');
  const firstResponse = await firstResponsePromise;
  assert.equal(firstResponse.status(), 502, 'the cold 429 becomes the honest transient 502, not an empty shelf');
  const firstBody = await firstResponse.json();
  assert.match(firstBody.error || '', /Try again in a minute/, 'the API sentence tells the maker what to do');
  await page.selectOption('#mk-form [name=category]', 'art');

  const merch = page.locator('#mk-merch');
  const message = page.locator('#mf-msg');
  const retry = merch.getByRole('button', { name: 'Try again', exact: true });
  await merch.waitFor({ state: 'visible' });
  await retry.waitFor({ state: 'visible' });
  assert.match((await message.innerText()).trim(), /isn't answering right now.*Try again in a minute/, 'the problem sentence is shown under the shelf');
  assert.equal(await page.locator('#mf-product option').count(), 0, 'a cold refusal is not rendered as a real product');
  const retryBox = await retry.boundingBox();
  const messageBox = await message.boundingBox();
  assert.ok(retryBox && retryBox.height >= 44, `Try again is at least 44px high (measured ${retryBox?.height}px)`);
  assert.ok(messageBox && retryBox.y >= messageBox.y + messageBox.height - 1, 'Try again follows the message rather than covering it');
  const failureWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(failureWidth <= 390, `failure state fits 390px (document width ${failureWidth}px)`);
  await page.screenshot({ path: path.join(out, 'cold-read-390.png'), fullPage: true });
  console.log(`COLD GET /label/new ${navigation.status()} API=${firstResponse.status()} viewport=390x844 document-width=${failureWidth}px retry=${Math.round(retryBox.width)}x${retryBox.height}px message=${JSON.stringify((await message.innerText()).trim())}`);

  // The server's contract deliberately refuses an immediate hammer-retry for 60 seconds. Let that real window pass;
  // the stand-in is already healthy, so the actual button must now fetch and render the shelf without a reload.
  await page.waitForTimeout(60_250);
  const secondResponsePromise = page.waitForResponse(isProducts);
  await retry.click();
  const secondResponse = await secondResponsePromise;
  assert.equal(secondResponse.status(), 200, 'the real Try again button gets the healthy product list');
  const secondBody = await secondResponse.json();
  assert.deepEqual(secondBody.products?.map((p) => p.key), ['tee'], 'the healthy response contains the stand-in product');
  await page.locator('#mf-product option[value="tee"]').waitFor({ state: 'attached' });
  assert.equal(await retry.isHidden(), true, 'Try again disappears after a healthy response');
  assert.equal((await message.innerText()).trim(), '', 'the old problem sentence is cleared');
  await page.locator('#mf-on').check();
  await page.locator('#mf-body').waitFor({ state: 'visible' });
  await page.locator('#mf-product').waitFor({ state: 'visible' });
  assert.match(await page.locator('#mf-product option[value="tee"]').innerText(), /Cold Read Test Tee/, 'the merch shelf names the healthy product');
  const successWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(successWidth <= 390, `recovered shelf fits 390px (document width ${successWidth}px)`);
  await page.screenshot({ path: path.join(out, 'recovered-shelf-390.png'), fullPage: true });
  assert.equal(first429, false, 'the stand-in returned its planned first 429');
  assert.equal(requests.filter((r) => r.url === '/products/71').length, 2, 'Printful is asked once cold and once on the real retry, not hammered');
  assert.ok(requests.some((r) => r.url === '/mockup-generator/printfiles/71'), 'the healthy retry obtains the real shelf metadata');
  assert.deepEqual(pageErrors, [], 'no browser page errors');
  assert.deepEqual(requestFailures, [], 'no browser request failures (an HTTP 502 response is not a transport failure)');
  assert.ok(consoleErrors.every((e) => e.text.includes('502') && e.url.endsWith('/api/merch/products')), `only the expected cold 502 reaches the console: ${JSON.stringify(consoleErrors)}`);
  fs.writeFileSync(path.join(out, 'observations.json'), JSON.stringify({ viewport: { width: 390, height: 844 }, coldStatus: firstResponse.status(), retryStatus: secondResponse.status(), retryBox, failureWidth, successWidth, requests, pageErrors, consoleErrors, requestFailures }, null, 2));
  console.log(`RETRY click=Try again API=${secondResponse.status()} products=tee document-width=${successWidth}px fake-requests=${requests.length} page-errors=0 request-failures=0 console-errors=${JSON.stringify(consoleErrors)}`);
  console.log(`PASS: cold Printful refusal and real 390x844 Try again recovery; evidence=${out}`);
} finally {
  await browser?.close();
  server.kill();
  await new Promise((resolve) => printful.close(resolve));
  fs.closeSync(serverLog);
  fs.rmSync(data, { recursive: true, force: true });
}

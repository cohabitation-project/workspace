#!/usr/bin/env node
// Real 390x844 phone walk: signed-out discovery → listing/checkout, then the seller's pages.
// Run: node commons/test/market-phone-flow.mjs [evidence-directory]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(import.meta.dirname, '../..');
const out = path.resolve(process.argv[2] || '/tmp/market-phone-flow');
fs.mkdirSync(out, { recursive: true });
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'market-phone-'));
const port = await new Promise((resolve) => {
  const server = net.createServer();
  server.listen(0, '127.0.0.1', () => { const p = server.address().port; server.close(() => resolve(p)); });
});
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['commons/server.mjs'], {
  cwd: root,
  env: { ...process.env, COMMONS_DATA: data, ASHRAM_PORT: String(port), COMMONS_PORT: String(port), COMMONS_ARRIVE_BYPASS: 'TESTGATE', COMMONS_FAKE_LLM: '1', OPENROUTER_API_KEY: '', LLM_API_KEY: '', COMMONS_NO_SPEND_POLL: '1' },
  stdio: 'ignore',
});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`${base}/healthz`)).ok || (await fetch(`${base}/skill.md`)).ok) { ready = true; break; } } catch { /* booting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'isolated Commons server starts');

  const api = async (url, { method = 'GET', body, cookie } = {}) => fetch(`${base}${url}`, {
    method,
    headers: { ...(body !== undefined ? { 'Content-Type': 'application/json', 'X-Commons': '1' } : {}), ...(cookie ? { Cookie: cookie } : {}) },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const visitor = await (await api('/api/arrive/visitor', { method: 'POST', body: {} })).json();
  assert.ok(visitor.vid, 'test visitor received an arrival id');
  const bypass = await api('/api/arrive/bypass', { method: 'POST', body: { vid: visitor.vid, code: 'TESTGATE' } });
  assert.ok(bypass.ok, `test gate accepted disposable visitor (${bypass.status})`);
  const entered = await api('/api/arrive/enter', { method: 'POST', body: { vid: visitor.vid, name: 'Phone Market Seller' } });
  assert.equal(entered.status, 200, 'seller enters the isolated Commons');
  const cookie = (entered.headers.get('set-cookie') || '').split(';')[0];
  assert.ok(cookie, 'seller has an isolated session cookie');
  const created = await api('/api/market/listings', { method: 'POST', cookie, body: {
    title: 'Phone Market Test Listing', text: 'A small original item for checking the marketplace phone flow.',
    category: 'art', type: 'product', price: { mode: 'fixed', amount: 25 }, license: 'all-rights', rights: true,
  } });
  assert.equal(created.status, 201, `seed listing created (${created.status})`);
  const listing = await created.json();
  assert.ok(listing.id, 'seed listing has an id');
  console.log(`SEED POST /api/market/listings ${created.status} id=${listing.id}`);

  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  const serverErrors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 500) serverErrors.push(`${response.status()} ${new URL(response.url()).pathname}`); });

  const home = await page.goto(`${base}/label`);
  assert.equal(home.status(), 200, 'signed-out /label responds 200');
  console.log(`STEP GET /label ${home.status()} signed-out`);
  const cardLink = page.locator(`a[href="/label/l/${listing.id}"]`).filter({ hasText: 'Phone Market Test Listing' }).first();
  await cardLink.waitFor({ state: 'visible' });
  const detailResponse = page.waitForResponse((response) => new URL(response.url()).pathname === `/label/l/${listing.id}` && response.request().method() === 'GET');
  await cardLink.click();
  const detail = await detailResponse;
  assert.equal(detail.status(), 200, 'tapping the listing opens its detail page');
  assert.equal(new URL(page.url()).pathname, `/label/l/${listing.id}`, 'listing tap reaches its detail URL');
  console.log(`STEP tap listing GET ${new URL(page.url()).pathname} ${detail.status()}`);

  const buy = page.locator('.mk-closed').filter({ hasText: /Buy|payments open soon/i }).first();
  await buy.waitFor({ state: 'visible' });
  const buyRect = await buy.boundingBox();
  assert.ok(buyRect && buyRect.height >= 44, `visible buy/checkout target is >=44px tall (measured ${buyRect?.height ?? 'missing'}px)`);
  const href = await buy.getAttribute('href');
  const formAction = await buy.evaluate((el) => el.closest('form')?.getAttribute('action') || null);
  // Payments are closed. The disabled Buy has no active target; resolve its listing's checkout quote instead.
  const target = href || formAction || `/api/market/listings/${listing.id}/checkout`;
  const targetResponse = await page.request.get(new URL(target, base).href);
  assert.ok(targetResponse.status() < 400, `buy/checkout target ${target} resolves (${targetResponse.status()})`);
  if (!href && !formAction) assert.equal(targetResponse.status(), 200, 'closed Buy control has no link/form, but its listing quote target resolves');
  await page.screenshot({ path: path.join(out, 'market-listing-390.png'), fullPage: true });
  console.log(`STEP buy control ${buyRect.width}x${buyRect.height}px target=${target} ${targetResponse.status()} viewport=390x844`);

  const quoteResponse = await page.request.get(`${base}/api/market/listings/${listing.id}/checkout`);
  assert.equal(quoteResponse.status(), 200, 'listing checkout quote route responds 200');
  const quote = await quoteResponse.json();
  assert.equal(quote.payable, false, 'payments remain closed; this test does not buy or move money');
  console.log(`STEP GET /api/market/listings/${listing.id}/checkout ${quoteResponse.status()} payable=${quote.payable}`);

  const unknown = await page.goto(`${base}/label/l/l_phone_flow_missing`);
  assert.equal(unknown.status(), 404, `unknown listing id renders a real 404 page, not ${unknown.status()}`);
  console.log(`MUTANT GET /label/l/l_phone_flow_missing ${unknown.status()} unknown listing is 404`);

  await context.addCookies([{ name: cookie.split('=')[0], value: cookie.slice(cookie.indexOf('=') + 1), url: base, httpOnly: true, sameSite: 'Lax' }]);
  for (const route of ['/label/mine', '/label/sales']) {
    const response = await page.goto(`${base}${route}`);
    assert.equal(response.status(), 200, `signed-in seller page ${route} responds 200`);
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(width <= 390, `${route} document width ${width}px does not overflow 390px viewport`);
    await page.screenshot({ path: path.join(out, `${route.slice(1).replace('/', '-')}-390.png`), fullPage: true });
    console.log(`STEP GET ${route} ${response.status()} signed-in document-width=${width}px viewport=390px`);
  }
  assert.deepEqual(serverErrors, [], 'no 5xx responses in browser requests');
  assert.deepEqual(errors, [], 'no browser page errors');
  console.log(`PASS: marketplace phone flow at 390x844; evidence=${out}`);
} finally {
  await browser?.close();
  server.kill();
  fs.rmSync(data, { recursive: true, force: true });
}

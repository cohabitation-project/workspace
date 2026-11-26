#!/usr/bin/env node
// Real 390x844 browser walk: public Marketplace listing to its Buy control, then seller pages.
// node commons/test/market-phone-flow.mjs [evidence-directory]
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

  // Seed one ordinary listing and a seller through the same public test gate as the market route tests.
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
  const entered = await post('/api/arrive/enter', { vid: visitor.vid, name: 'Market Phone Seller' });
  assert.equal(entered.status, 201, 'seller enters the isolated Commons');
  const sellerCookie = (entered.headers.get('set-cookie') || '').split(';')[0];
  assert.ok(sellerCookie.includes('='), 'seller session cookie is issued');
  const created = await post('/api/market/listings', {
    title: 'Phone flow test drawing',
    text: 'A small original drawing seeded only for this isolated browser check.',
    category: 'art',
    type: 'product',
    price: { mode: 'fixed', amount: 500 },
    license: 'all-rights',
    rights: true,
  }, sellerCookie);
  assert.equal(created.status, 201, `seller can create a test listing (status ${created.status})`);
  const listing = await created.json();
  assert.ok(listing.id, 'test listing has an id');

  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const visitorPage = await context.newPage();
  const errors = [];
  visitorPage.on('pageerror', (error) => errors.push(error.message));

  const home = await visitorPage.goto(`${base}/label`);
  assert.equal(home.status(), 200, 'signed-out Marketplace home responds 200');
  const listingLink = visitorPage.locator(`a[href="/label/l/${listing.id}"]`).first();
  await listingLink.waitFor({ state: 'visible' });
  const cardBox = await listingLink.boundingBox();
  assert.ok(cardBox, 'public listing has a visible tap target');
  console.log(`STEP GET ${visitorPage.url()} ${home.status()} viewport=390x844 listing-control=${Math.round(cardBox.width)}x${Math.round(cardBox.height)}px`);

  const listingNavigation = Promise.all([
    visitorPage.waitForNavigation(),
    listingLink.click(),
  ]).then(([response]) => response);
  const listingResponse = await listingNavigation;
  assert.equal(listingResponse.status(), 200, 'tapping the listing opens its page');
  assert.equal(new URL(visitorPage.url()).pathname, `/label/l/${listing.id}`);
  const buy = visitorPage.locator('.mk-closed, [data-buy]').first();
  await buy.waitFor({ state: 'visible' });
  const buyBox = await buy.boundingBox();
  assert.ok(buyBox, 'listing page exposes a visible Buy/checkout control');
  assert.ok(buyBox.height >= 44, `Buy/checkout tap target is at least 44px high (measured ${buyBox.height}px)`);
  const isClosed = await buy.evaluate((el) => el.matches('.mk-closed') && el.disabled);
  if (isClosed) {
    const reason = (await buy.innerText()).trim();
    assert.match(reason, /^Buy · .+/, `closed Buy button names the reason (got ${JSON.stringify(reason)})`);
    console.log(`buy=closed reason=${reason}`);
    console.log(`STEP GET ${visitorPage.url()} ${listingResponse.status()} buy-control=${Math.round(buyBox.width)}x${Math.round(buyBox.height)}px disabled=true`);
  } else {
    const buyTarget = await buy.getAttribute('href') || await buy.getAttribute('formaction') || (await buy.getAttribute('data-buy') ? `/api/market/listings/${listing.id}/checkout` : '');
    assert.ok(buyTarget, 'Buy control has an href/form target or the listing checkout data hook');
    console.log(`STEP GET ${visitorPage.url()} ${listingResponse.status()} buy-control=${Math.round(buyBox.width)}x${Math.round(buyBox.height)}px disabled=${await buy.isDisabled()} target=${buyTarget}`);

    // Resolve the advertised listing's read-only checkout quote. This does not create an order or move money.
    const quotePath = `/api/market/listings/${listing.id}/checkout`;
    const quote = await fetch(`${base}${quotePath}`);
    assert.ok(quote.status !== 404 && quote.status < 500, `checkout target resolves without 404/5xx (got ${quote.status})`);
    console.log(`STEP GET ${base}${quotePath} ${quote.status} control-target-resolution=read-only-quote`);
  }

  // Mutant: an id which was never seeded must be a genuine not-found response, not an internal error.
  const missingPath = '/label/l/not-a-real-listing-id';
  const missing = await visitorPage.goto(`${base}${missingPath}`);
  assert.equal(missing.status(), 404, 'a missing listing gets a real 404, not a 500');
  console.log(`MUTANT GET ${visitorPage.url()} ${missing.status()} body-width=${await visitorPage.evaluate(() => document.documentElement.scrollWidth)}px`);

  // Add only the test seller's isolated session, then check the two seller surfaces at the same phone viewport.
  const [cookieName, ...cookieValueParts] = sellerCookie.split(';')[0].split('=');
  await context.addCookies([{ name: cookieName, value: cookieValueParts.join('='), url: base }]);
  const sellerPage = await context.newPage();
  sellerPage.on('pageerror', (error) => errors.push(error.message));
  for (const pathname of ['/label/mine', '/label/sales']) {
    const response = await sellerPage.goto(`${base}${pathname}`);
    assert.equal(response.status(), 200, `signed-in seller page ${pathname} responds 200`);
    const width = await sellerPage.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(width <= 390, `${pathname} fits 390px viewport (document width ${width}px)`);
    console.log(`STEP GET ${sellerPage.url()} ${response.status()} viewport=390px document-width=${width}px`);
  }
  assert.deepEqual(errors, [], 'no browser page errors');
  await visitorPage.screenshot({ path: path.join(out, 'market-listing-buy-390.png'), fullPage: true });
  await sellerPage.screenshot({ path: path.join(out, 'market-sales-390.png'), fullPage: true });
  console.log(`PASS: Marketplace phone flow at 390x844; evidence=${out}`);
} finally {
  await browser?.close();
  server.kill();
  fs.rmSync(data, { recursive: true, force: true });
}

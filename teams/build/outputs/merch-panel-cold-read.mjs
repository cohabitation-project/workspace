#!/usr/bin/env node
// Round 70 candidate: isolated 390x844 browser regression for the real maker products panel.
// Candidate: node teams/build/outputs/merch-panel-cold-read.mjs [evidence-directory]
// Placed:    node commons/test/merch-panel-cold-read.mjs [evidence-directory]
// MERCH_PANEL_MODE=healthy is the mutation control: the cold-message assertion must go red.
// Optional runner overrides: PLAYWRIGHT_MODULE (absolute module URL/path), CHROMIUM_PATH.
// No live Printful account, money, staging, or production is touched.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.basename(here) === 'outputs' ? path.resolve(here, '../../..') : path.resolve(here, '../..');
const OUT = path.resolve(process.argv[2] || fs.mkdtempSync(path.join(os.tmpdir(), 'merch-panel-cold-read-')));
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-panel-cold-data-'));
const MODE = process.env.MERCH_PANEL_MODE || 'cold';
assert.ok(['cold', 'healthy'].includes(MODE), 'MERCH_PANEL_MODE must be cold or healthy');
fs.mkdirSync(OUT, { recursive: true });
const result = { candidate: 'merch-panel-cold-read.mjs', round: 70, mode: MODE, viewport: [390, 844], ok: false, checks: {}, requests: [], console_errors: [], page_errors: [], evidence: OUT };
const save = () => fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify(result, null, 2));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let browser, child, fake;
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFElEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==', 'base64');

async function startFake() {
  const seen = [];
  const server = http.createServer((req, res) => {
    seen.push(`${req.method} ${req.url}`); result.requests.push(`PRINTFUL ${req.method} ${req.url}`);
    res.setHeader('content-type', 'application/json');
    if (MODE === 'cold') {
      res.statusCode = 429;
      return res.end(JSON.stringify({ code: 429, error: { message: 'Too Many Requests' } }));
    }
    if (req.url === '/products') return res.end(JSON.stringify({ code: 200, result: [{ id: 71, title: 'Test tee', image: 'https://example.invalid/tee.png' }] }));
    if (req.url === '/products/71') return res.end(JSON.stringify({ code: 200, result: {
      product: { id: 71, title: 'Test tee', image: 'https://example.invalid/tee.png', currency: 'USD', is_discontinued: false },
      variants: [{ id: 10071, name: 'White / M', color: 'White', color_code: '#ffffff', size: 'M', price: '12.00', in_stock: true }],
    } }));
    if (req.url === '/mockup-generator/printfiles/71') return res.end(JSON.stringify({ code: 200, result: {
      available_placements: { front: 'Front' },
      printfiles: [{ printfile_id: 50071, width: 3000, height: 4000, dpi: 300 }],
      variant_printfiles: [{ variant_id: 10071, placements: { front: 50071 } }],
    } }));
    res.statusCode = 404; res.end(JSON.stringify({ code: 404, error: { message: `fake has no ${req.url}` } }));
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { seen, server, url: `http://127.0.0.1:${server.address().port}` };
}
async function boot() {
  const fd = fs.openSync(path.join(OUT, 'server.log'), 'a');
  child = spawn(process.execPath, ['commons/server.mjs'], { cwd: ROOT, env: {
    ...process.env, PORT: '0', HOST: '127.0.0.1', DATA_DIR: DATA, COMMONS_DATA: DATA,
    PRINTFUL_TOKEN: 'isolated-test-token-not-a-credential', PRINTFUL_API_URL: fake.url,
    STRIPE_SECRET_KEY: '', PRINTFUL_STORE_ID: '', NODE_ENV: 'test',
  }, stdio: ['ignore', fd, fd] });
  fs.closeSync(fd);
  let exited = false; child.once('exit', (code, signal) => { exited = true; result.server_exit = { code, signal }; });
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (exited) throw new Error(`server exited: ${fs.readFileSync(path.join(OUT, 'server.log'), 'utf8').slice(-4000)}`);
    const text = fs.readFileSync(path.join(OUT, 'server.log'), 'utf8');
    const m = text.match(/https?:\/\/127\.0\.0\.1:(\d+)/);
    if (m) { result.base = `http://127.0.0.1:${m[1]}`; return result.base; }
    await sleep(100);
  }
  throw new Error('server ready timeout');
}
async function call(B, route, method = 'GET', body, cookie) {
  const resultUrl = B + route; result.requests.push(`${method} ${route}`);
  const r = await fetch(resultUrl, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined, redirect: 'manual' });
  const text = await r.text(); let json; try { json = JSON.parse(text); } catch { json = text; }
  return { r, json, text };
}
async function loadPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return import(process.env.PLAYWRIGHT_MODULE.startsWith('/') ? pathToFileURL(process.env.PLAYWRIGHT_MODULE).href : process.env.PLAYWRIGHT_MODULE);
  try { return await import('playwright'); }
  catch (first) {
    for (const p of ['/opt/node22/lib/node_modules/playwright/index.mjs', '/usr/lib/node_modules/playwright/index.mjs', '/usr/local/lib/node_modules/playwright/index.mjs']) {
      if (fs.existsSync(p)) return import(pathToFileURL(p).href);
    }
    throw first;
  }
}
async function stop() {
  if (browser) await browser.close().catch(() => {});
  if (child && child.exitCode === null) {
    child.kill('SIGTERM'); await Promise.race([new Promise((r) => child.once('exit', r)), sleep(3000)]);
    if (child.exitCode === null) child.kill('SIGKILL');
  }
  if (fake?.server) await new Promise((r) => fake.server.close(r));
  fs.rmSync(DATA, { recursive: true, force: true });
}

try {
  fake = await startFake(); const B = await boot();
  const made = await call(B, '/api/human', 'POST', { name: 'Panel Cold Reader' });
  assert.equal(made.r.status, 201, made.text);
  const cookie = (made.r.headers.get('set-cookie') || '').split(';')[0]; assert.ok(cookie, 'session cookie');
  const art = await call(B, '/api/images', 'POST', { data: PNG.toString('base64'), alt: 'isolated two-pixel test artwork' }, cookie);
  assert.equal(art.r.status, 201, art.text);
  const listing = await call(B, '/api/market/listings', 'POST', { title: 'Panel cold-read art', text: 'An isolated browser regression fixture.', category: 'art', type: 'product', price: { mode: 'quote' }, license: 'all-rights', rights: true, images: [art.json.id] }, cookie);
  assert.equal(listing.r.status, 201, listing.text);
  const id = listing.json.id || listing.json.listing?.id; assert.ok(id, 'real listing id'); result.listing_id = id;
  const { chromium } = await loadPlaywright();
  const executablePath = process.env.CHROMIUM_PATH || ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));
  browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, extraHTTPHeaders: { cookie } });
  const page = await context.newPage();
  page.on('pageerror', (e) => result.page_errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') result.console_errors.push(m.text()); });
  page.on('request', (r) => { if (r.url().includes('/merch/')) result.requests.push(`BROWSER ${r.method()} ${new URL(r.url()).pathname}`); });
  const panelResponse = page.waitForResponse((r) => new URL(r.url()).pathname === `/api/market/listings/${id}/merch/panel` && r.request().method() === 'GET', { timeout: 30000 });
  const nav = await page.goto(`${B}/label/l/${id}/products`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  result.page_status = nav.status(); assert.equal(result.page_status, 200);
  const response = await panelResponse; result.panel_status = response.status(); result.panel_body = (await response.text()).slice(0, 2000);
  await page.locator('#mp-app').waitFor({ state: 'attached', timeout: 15000 });
  await page.waitForFunction(() => /Try again in a minute/i.test(document.querySelector('#mp-app')?.textContent || ''), null, { timeout: 15000 });
  result.checks.maker_safe_message = await page.locator('#mp-app').innerText();
  assert.match(result.checks.maker_safe_message, /Try again in a minute/i);
  assert.doesNotMatch(result.checks.maker_safe_message, /Too Many Requests|isolated-test-token|api\.printful/i);
  result.checks.page_errors = result.page_errors.length; assert.equal(result.page_errors.length, 0, result.page_errors.join('\n'));
  result.checks.document_width = await page.evaluate(() => ({ inner: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth }));
  assert.ok(result.checks.document_width.document <= 390, JSON.stringify(result.checks.document_width));
  assert.ok(result.checks.document_width.body <= 390, JSON.stringify(result.checks.document_width));
  const retry = page.getByRole('button', { name: /Try again/i });
  result.checks.retry_button = { count: await retry.count(), visible: await retry.first().isVisible().catch(() => false) };
  // Deliberately no button requirement: the panel's cold API error is rendered as text, not a retry control.
  assert.ok(result.requests.some((x) => x === `BROWSER GET /api/market/listings/${id}/merch/panel`), 'browser requested the real panel endpoint');
  await page.screenshot({ path: path.join(OUT, `${MODE}-panel.png`), fullPage: true });
  result.ok = true;
} catch (e) {
  result.error = e.stack || String(e); result.ok = false; process.exitCode = 1;
  try {
    if (browser) {
      const pages = browser.contexts().flatMap((c) => c.pages());
      if (pages[0]) { await pages[0].screenshot({ path: path.join(OUT, 'failure.png'), fullPage: true }); result.failure_body = (await pages[0].locator('body').innerText()).slice(0, 6000); }
    }
  } catch (screenshotError) { result.screenshot_error = String(screenshotError); }
} finally {
  save(); await stop(); save();
  console.log(JSON.stringify(result, null, 2));
}

// Round 71 candidate, Tier 2. Place as commons/test/merch-panel-tap-targets.mjs.
// Isolated data + healthy fake Printful; no production service, listing, credential, or payment is touched.
// Normal run: every visible non-inline control in the healthy maker panel must be at least 44x44 CSS px.
// Sensitivity mutant: MERCH_PANEL_TAP_MUTANT=60 applies a 60px threshold; its tap-target assertion must fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const MUTANT_60 = process.env.MERCH_PANEL_TAP_MUTANT === '60';
const THRESHOLD = MUTANT_60 ? 60 : 44;
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'merch-panel-tap-targets-'));
fs.mkdirSync(OUT, { recursive: true });
const resultPath = path.join(OUT, MUTANT_60 ? 'merch-panel-tap-targets-60-mutant.json' : 'merch-panel-tap-targets-results.json');
const shotPath = path.join(OUT, MUTANT_60 ? 'merch-panel-taps-60-mutant-390x844.png' : 'merch-panel-taps-390x844.png');
const result = {
  status: 'started', mode: MUTANT_60 ? 'threshold-60-mutant' : 'normal-44', threshold: THRESHOLD,
  viewport: { width: 390, height: 844 }, started_at: new Date().toISOString(), evidence: {}, controls: [], failure: null,
};
const save = () => fs.writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const listen = (server, port) => new Promise((resolve, reject) => {
  server.once('error', reject); server.listen(port, '127.0.0.1', resolve);
});
const close = (server) => new Promise((resolve) => server.close(resolve));
async function freePort() {
  const server = net.createServer(); await listen(server, 0);
  const port = server.address().port; await close(server); return port;
}
function findRoot() {
  let dir = import.meta.dirname;
  while (true) {
    if (fs.existsSync(path.join(dir, 'commons', 'server.mjs'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('Could not find the repository root containing commons/server.mjs');
    dir = parent;
  }
}
async function loadPlaywright() {
  // Same CJS loader as the placed suite; a static ESM import fails on the full runner.
  try { return createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright'); }
  catch (error) { throw new Error(`Playwright is required for this browser test: ${error?.message || 'not installed'}`); }
}
function chromiumPath(chromium) {
  for (const candidate of [process.env.CHROME_PATH, process.env.CHROMIUM_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser', chromium.executablePath()]) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  throw new Error('No Chromium executable found; set CHROME_PATH or install Playwright Chromium');
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');

test('healthy maker panel exposes 44px tap targets without horizontal overflow at 390px', { timeout: 120_000 }, async () => {
  const ROOT = findRoot();
  let fake; let srv; let browser; let logFd;
  const seen = [];
  try {
    const { chromium } = await loadPlaywright();
    const fakePort = await freePort();
    fake = http.createServer((req, res) => {
      const u = new URL(req.url, 'http://printful.fake');
      seen.push({ method: req.method, path: u.pathname, at: new Date().toISOString() });
      const json = (status, body) => {
        res.writeHead(status, { 'content-type': 'application/json' }); res.end(JSON.stringify(body));
      };
      let match = u.pathname.match(/^\/products\/(\d+)$/);
      if (match) return json(200, { code: 200, result: {
        product: { id: Number(match[1]), title: 'Unisex Staple T-Shirt | Bella + Canvas 3001', currency: 'USD', is_discontinued: false },
        variants: [
          { id: 4012, name: 'Black / M', color: 'Black', color_code: '#111111', size: 'M', price: '11.50', in_stock: true },
          { id: 4022, name: 'White / M', color: 'White', color_code: '#ffffff', size: 'M', price: '11.50', in_stock: true },
        ],
      } });
      match = u.pathname.match(/^\/mockup-generator\/printfiles\/(\d+)$/);
      if (match) return json(200, { code: 200, result: {
        available_placements: { front: 'Front print' },
        printfiles: [{ printfile_id: 1, width: 1800, height: 2400, dpi: 150 }],
        variant_printfiles: [4012, 4022].map((variant_id) => ({ variant_id, placements: { front: 1 } })),
      } });
      match = u.pathname.match(/^\/mockup-generator\/templates\/(\d+)$/);
      if (match) return json(200, { code: 200, result: {
        version: 1, min_dpi: 150,
        variant_mapping: [{ variant_id: 4012, templates: [{ placement: 'front', template_id: 919 }] }],
        templates: [{ template_id: 919, image_url: `http://127.0.0.1:${fakePort}/template.png`, background_url: null,
          background_color: '#ffffff', printfile_id: 1, template_width: 1000, template_height: 1000,
          print_area_width: 300, print_area_height: 400, print_area_top: 200, print_area_left: 350 }],
      } });
      if (u.pathname === '/template.png') {
        res.writeHead(200, { 'content-type': 'image/png' }); return res.end(PNG);
      }
      return json(404, { code: 404, error: { message: `Unexpected fake Printful path: ${u.pathname}` } });
    });
    await listen(fake, fakePort);

    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const data = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-panel-tap-data-'));
    const logPath = path.join(OUT, MUTANT_60 ? 'tap-targets-60-mutant-server.log' : 'tap-targets-server.log');
    logFd = fs.openSync(logPath, 'w');
    srv = spawn(process.execPath, ['commons/server.mjs'], {
      cwd: ROOT,
      env: {
        ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: data, COMMONS_FAKE_LLM: '1',
        COMMONS_TEST_ASSETS: '1', COMMONS_PUBLIC_URL: base, PRINTFUL_TOKEN: 'test-token',
        PRINTFUL_API_URL: `http://127.0.0.1:${fakePort}`,
        PRINTFUL_PRODUCTS: JSON.stringify([{ key: 'tee', id: 71 }]),
        PRINTFUL_MOCKUPS_PER_MINUTE: '10', MERCH_TICK_MS: '1000', COMMONS_FEE_PERCENT: '0',
      },
      stdio: ['ignore', logFd, logFd],
    });
    result.evidence.server_log = logPath;
    let healthy = false;
    for (let i = 0; i < 160; i++) {
      if (srv.exitCode !== null) throw new Error(`Server exited ${srv.exitCode}; see ${logPath}`);
      try { if ((await fetch(`${base}/healthz`, { signal: AbortSignal.timeout(1000) })).ok) { healthy = true; break; } } catch { /* booting */ }
      await sleep(250);
    }
    assert.ok(healthy, `Server did not become healthy; see ${logPath}`);

    const call = (route, method = 'GET', body, cookie) => fetch(base + route, {
      method, headers: { 'content-type': 'application/json', 'x-commons': '1', ...(cookie ? { cookie } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(30_000),
    });
    const signin = await call('/api/humans', 'POST', { name: 'Tap Target Maker', bio: 'isolated browser regression' });
    const signinBody = await signin.json();
    assert.ok([200, 201].includes(signin.status), `sign-in: ${signin.status} ${JSON.stringify(signinBody)}`);
    const cookie = (signin.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(cookie.includes('='), 'sign-in returned a session cookie');
    const imageResponse = await call('/api/images', 'POST', { data: PNG.toString('base64'), alt: 'tap target test artwork' }, cookie);
    const image = await imageResponse.json();
    assert.ok(imageResponse.ok, `image upload: ${imageResponse.status} ${JSON.stringify(image)}`);
    const listingResponse = await call('/api/market/listings', 'POST', {
      title: 'Tap Target Artwork', text: 'An isolated tap-target regression listing.', category: 'art', type: 'product',
      price: { mode: 'quote' }, license: 'all-rights', rights: true, images: [image.id],
    }, cookie);
    const listing = await listingResponse.json();
    assert.equal(listingResponse.status, 201, JSON.stringify(listing));
    result.evidence.member_id = signinBody.member?.id || null;
    result.evidence.listing_id = listing.id;
    save();

    browser = await chromium.launch({ executablePath: chromiumPath(chromium), headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addCookies([{ name: cookie.split('=')[0], value: cookie.slice(cookie.indexOf('=') + 1), url: base }]);
    const page = await context.newPage();
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    const target = `/label/l/${listing.id}/products`;
    const panelResponsePromise = page.waitForResponse(
      (response) => response.url() === `${base}/api/market/listings/${listing.id}/merch/panel`, { timeout: 45_000 },
    );
    const navigation = await page.goto(base + target, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    assert.equal(navigation.status(), 200);
    assert.equal(new URL(page.url()).pathname, target, 'the maker stayed signed in on the real panel');
    const panelResponse = await panelResponsePromise;
    result.evidence.panel_http_status = panelResponse.status();
    result.evidence.panel_body = await panelResponse.json();
    assert.equal(panelResponse.status(), 200, `healthy panel read: ${JSON.stringify(result.evidence.panel_body)}`);
    await page.waitForSelector('#mp-app .cz-stage', { state: 'visible', timeout: 45_000 });

    result.controls = await page.locator('#mp-app').evaluate((app, threshold) => {
      const clean = (value) => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 140);
      const rows = [];
      for (const el of app.querySelectorAll('button, a, [role=button], input, select')) {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        const visible = el.getClientRects().length > 0 && rect.width > 0 && rect.height > 0 &&
          style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse';
        if (!visible) continue;
        const label = el.labels?.length ? [...el.labels].map((node) => node.textContent).join(' ') : '';
        const name = clean(el.getAttribute('aria-label') || el.textContent || el.value || label || el.title || el.id || el.tagName.toLowerCase());
        const inlineText = (el.tagName === 'A' || el.getAttribute('role') === 'button') &&
          !!el.closest('p, li') && style.display === 'inline' && !el.querySelector('img, svg, video, canvas, button, input, select');
        const small = !inlineText && (rect.width < threshold || rect.height < threshold);
        const row = {
          name: name || '(unnamed)', tag: el.tagName.toLowerCase(), type: el.getAttribute('type'), id: el.id || null,
          role: el.getAttribute('role'), inline_text_exception: inlineText, threshold,
          box: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, small,
        };
        rows.push(row);
        console.log(`${row.name} ${rect.width.toFixed(1)}×${rect.height.toFixed(1)} ${small ? 'SMALL' : 'ok'}`);
      }
      return rows;
    }, THRESHOLD);
    result.evidence.width = await page.evaluate(() => ({
      viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
      horizontal_overflow_px: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    }));
    result.evidence.page_errors = pageErrors;
    result.evidence.printful_requests = seen;
    result.evidence.app_text = await page.locator('#mp-app').innerText();
    await page.screenshot({ path: shotPath, fullPage: true });
    result.evidence.screenshot = shotPath;
    save();

    // Print from Node too: browser-console output is not forwarded by Playwright by default.
    for (const row of result.controls) {
      console.log(`${row.name} ${row.box.width.toFixed(1)}×${row.box.height.toFixed(1)} ${row.small ? 'SMALL' : 'ok'}`);
    }
    const small = result.controls.filter((row) => row.small);
    result.evidence.small_controls = small.map((row) => ({ name: row.name, box: row.box }));
    assert.ok(result.controls.length > 0, 'the healthy .cz-stage panel exposed at least one visible control');
    assert.ok(result.evidence.width.document <= 390,
      `document width must be <=390: ${JSON.stringify(result.evidence.width)}`);
    assert.deepEqual(pageErrors, [], 'no uncaught page errors');
    assert.ok(seen.some((request) => request.path === '/products/71'), 'the healthy fake Printful was actually read');
    assert.equal(small.length, 0,
      `tap-target assertion: ${small.length} visible control(s) below ${THRESHOLD}x${THRESHOLD}: ` +
      small.map((row) => `${row.name} ${row.box.width.toFixed(1)}×${row.box.height.toFixed(1)}`).join('; '));
    result.status = MUTANT_60 ? 'mutant-unexpectedly-passed' : 'passed';
  } catch (error) {
    result.status = MUTANT_60 && /tap-target assertion:/.test(error.message) ? 'mutant-killed-as-required' : 'failed';
    result.failure = { message: error.message, stack: error.stack };
    if (!MUTANT_60 || result.status !== 'mutant-killed-as-required') throw error;
  } finally {
    result.finished_at = new Date().toISOString(); save();
    if (browser) await browser.close();
    if (srv && srv.exitCode === null) { srv.kill('SIGTERM'); await sleep(250); if (srv.exitCode === null) srv.kill('SIGKILL'); }
    if (fake) await close(fake);
    if (logFd !== undefined) fs.closeSync(logFd);
  }
  if (MUTANT_60) assert.equal(result.status, 'mutant-killed-as-required', 'the 60px threshold mutant must fail at the tap-target assertion');
});

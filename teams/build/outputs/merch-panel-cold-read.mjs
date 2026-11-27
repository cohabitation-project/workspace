// Round 70 candidate, Tier 2. Place as commons/test/merch-panel-cold-read.mjs.
// Isolated data + fake Printful; no production service, listing, credential, or payment is touched.
// Normal run: fake Printful is rate-limited and the signed-in maker must see the honest cold message.
// Mutation run: MERCH_PANEL_COLD_MUTANT=healthy makes Printful healthy; the cold-message assertion must fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { spawn } from 'node:child_process';

const COLD = "The print partner's products aren't available right now. Try again in a minute.";
const HEALTHY_MUTANT = process.env.MERCH_PANEL_COLD_MUTANT === 'healthy';
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'merch-panel-cold-read-'));
fs.mkdirSync(OUT, { recursive: true });
const resultPath = path.join(OUT, HEALTHY_MUTANT ? 'merch-panel-cold-read-healthy-mutant.json' : 'merch-panel-cold-read-results.json');
const shotPath = path.join(OUT, HEALTHY_MUTANT ? 'merch-panel-healthy-mutant-390x844.png' : 'merch-panel-cold-390x844.png');
const result = {
  status: 'started', mode: HEALTHY_MUTANT ? 'healthy-mutant' : 'cold-429', viewport: { width: 390, height: 844 },
  started_at: new Date().toISOString(), evidence: {}, retry_button: { observed: false }, failure: null,
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
  const candidates = ['playwright'];
  if (process.env.PLAYWRIGHT_MODULE) candidates.push(process.env.PLAYWRIGHT_MODULE);
  let last;
  for (const candidate of candidates) {
    try { return await import(candidate); } catch (error) { last = error; }
  }
  throw new Error(`Playwright is required for this browser test: ${last?.message || 'not installed'}`);
}
function chromiumPath(chromium) {
  for (const candidate of [process.env.CHROME_PATH, process.env.CHROMIUM_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser', chromium.executablePath()]) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  throw new Error('No Chromium executable found; set CHROME_PATH or install Playwright Chromium');
}

const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC', 'base64');

test('signed-in maker gets the honest cold read on the real product panel at 390px', { timeout: 120_000 }, async () => {
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
      if (!HEALTHY_MUTANT && /^\/products\/\d+$/.test(u.pathname)) {
        return json(429, { code: 429, error: { message: 'Too Many Requests' } });
      }
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
    const data = fs.mkdtempSync(path.join(os.tmpdir(), 'merch-panel-cold-data-'));
    const logPath = path.join(OUT, HEALTHY_MUTANT ? 'healthy-mutant-server.log' : 'cold-server.log');
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
    const signin = await call('/api/humans', 'POST', { name: 'Cold Read Maker', bio: 'isolated browser regression' });
    const signinBody = await signin.json();
    assert.ok([200, 201].includes(signin.status), `sign-in: ${signin.status} ${JSON.stringify(signinBody)}`);
    const cookie = (signin.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(cookie.includes('='), 'sign-in returned a session cookie');
    const imageResponse = await call('/api/images', 'POST', { data: PNG.toString('base64'), alt: 'cold read test artwork' }, cookie);
    const image = await imageResponse.json();
    assert.ok(imageResponse.ok, `image upload: ${imageResponse.status} ${JSON.stringify(image)}`);
    const listingResponse = await call('/api/market/listings', 'POST', {
      title: 'Cold Read Artwork', text: 'An isolated cold-read regression listing.', category: 'art', type: 'product',
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
    const panelResponsePromise = page.waitForResponse((response) => response.url() === `${base}/api/market/listings/${listing.id}/merch/panel`, { timeout: 45_000 });
    const navigation = await page.goto(base + target, { waitUntil: 'domcontentloaded', timeout: 45_000 });
    assert.equal(navigation.status(), 200);
    assert.equal(new URL(page.url()).pathname, target, 'the maker stayed signed in on the real panel');
    const panelResponse = await panelResponsePromise;
    result.evidence.panel_http_status = panelResponse.status();
    result.evidence.panel_body = await panelResponse.json();
    await page.waitForFunction((cold) => {
      const app = document.querySelector('#mp-app');
      return app && !/Loading your products/.test(app.textContent) &&
        (app.textContent.includes(cold) || app.querySelector('.cz-stage'));
    }, COLD, { timeout: 45_000 });
    const coldMessageVisible = await page.locator('#mp-app').evaluate((app, cold) => app.textContent.includes(cold), COLD);
    result.evidence.cold_message_visible = coldMessageVisible;
    result.evidence.app_text = await page.locator('#mp-app').innerText();
    result.evidence.signed_in_name_visible = (await page.locator('body').innerText()).includes('Cold Read Maker');
    result.evidence.width = await page.evaluate(() => ({
      viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
      horizontal_overflow_px: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    }));
    result.retry_button = await page.locator('#mp-app').evaluate((app) => {
      const button = [...app.querySelectorAll('button')].find((candidate) => candidate.textContent.trim() === 'Try again');
      if (!button) return { observed: true, present: false, disposition: 'observation only; no Try again button was demanded' };
      return { observed: true, present: true, visible: !!(button.offsetWidth || button.offsetHeight), disabled: button.disabled };
    });
    result.evidence.page_errors = pageErrors;
    result.evidence.printful_requests = seen;
    await page.screenshot({ path: shotPath, fullPage: true });
    result.evidence.screenshot = shotPath;
    save();

    // This is the assertion the healthy mutant must break: recovery is honest only if the cold read was visible.
    assert.ok(coldMessageVisible, `cold message assertion: expected #mp-app to contain ${JSON.stringify(COLD)}`);
    assert.equal(panelResponse.status(), 502, 'a rate-limited cold read surfaces as 502, not a successful empty catalogue');
    assert.equal(result.evidence.panel_body.error, COLD);
    assert.ok(result.evidence.signed_in_name_visible, 'the signed-in maker name is visible');
    assert.ok(result.evidence.width.horizontal_overflow_px <= 1, `horizontal overflow: ${JSON.stringify(result.evidence.width)}`);
    assert.deepEqual(pageErrors, [], 'no uncaught page errors');
    assert.ok(seen.some((request) => /^\/products\/71$/.test(request.path)), 'the isolated fake Printful was actually read');
    result.status = HEALTHY_MUTANT ? 'mutant-unexpectedly-passed' : 'passed';
  } catch (error) {
    result.status = HEALTHY_MUTANT && /cold message assertion/.test(error.message) ? 'mutant-killed-as-required' : 'failed';
    result.failure = { message: error.message, stack: error.stack };
    if (!HEALTHY_MUTANT || result.status !== 'mutant-killed-as-required') throw error;
  } finally {
    result.finished_at = new Date().toISOString(); save();
    if (browser) await browser.close();
    if (srv && srv.exitCode === null) { srv.kill('SIGTERM'); await sleep(250); if (srv.exitCode === null) srv.kill('SIGKILL'); }
    if (fake) await close(fake);
    if (logFd !== undefined) fs.closeSync(logFd);
  }
  if (HEALTHY_MUTANT) assert.equal(result.status, 'mutant-killed-as-required', 'the healthy fake must make the cold-message assertion fail');
});

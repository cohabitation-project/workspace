// Round 72 candidate, Tier 2. Place as commons/test/market-listing-tap-targets.mjs.
// Real isolated Commons + Chromium; no production data, credentials, checkout, or payment is touched.
// Normal: measure the public listing's visible controls in signed-out and non-maker states at 390x844.
// Mutant: VIEWPORT_MUTANT=1 renders at 600x844; the <=390px document-width assertion must kill it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const MUTANT = process.env.VIEWPORT_MUTANT === '1';
const EXPECTED_WIDTH = 390;
const RENDER_WIDTH = MUTANT ? 600 : 390;
const MIN_TARGET = 44;
const OUT = process.env.OUT || fs.mkdtempSync(path.join(os.tmpdir(), 'market-listing-tap-targets-'));
fs.mkdirSync(OUT, { recursive: true });
const suffix = MUTANT ? 'viewport600-mutant' : 'normal390';
const resultPath = path.join(OUT, `market-listing-tap-targets-${suffix}.json`);
const result = {
  status: 'started', mode: MUTANT ? 'viewport-600-mutant' : 'normal-390',
  viewport: { width: RENDER_WIDTH, height: 844 }, expected_document_width_max: EXPECTED_WIDTH,
  minimum_target_px: MIN_TARGET, started_at: new Date().toISOString(), evidence: { states: [] }, failure: null,
};
const save = () => fs.writeFileSync(resultPath, JSON.stringify(result, null, 2) + '\n');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function findRoot() {
  let dir = import.meta.dirname;
  while (true) {
    if (fs.existsSync(path.join(dir, 'commons', 'server.mjs'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('Could not find repository root containing commons/server.mjs');
    dir = parent;
  }
}
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
async function loadPlaywright() {
  try { return createRequire(import.meta.url)(process.env.PLAYWRIGHT_MODULE || 'playwright'); }
  catch (error) { throw new Error(`Playwright is required for this browser test: ${error?.message || 'not installed'}`); }
}
function chromiumPath(chromium) {
  for (const candidate of [process.env.CHROME_PATH, process.env.CHROMIUM_PATH, '/usr/bin/chromium', '/usr/bin/chromium-browser', chromium.executablePath()]) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  throw new Error('No Chromium executable found; set CHROME_PATH or install Playwright Chromium');
}

// Deliberately exclude only inline text links in p/li. All other rendered controls are measured.
async function measurePage(page, state) {
  return page.evaluate(({ stateName, minimum }) => {
    const controls = [...document.querySelectorAll('button, a[href], input, select, textarea')];
    const rows = [];
    for (const [index, el] of controls.entries()) {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const visible = style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity || '1') !== 0 && rect.width > 0 && rect.height > 0;
      if (!visible) continue;
      const inlineTextLink = el.tagName === 'A' && !!el.closest('p, li') && style.display === 'inline' && !!el.textContent.trim();
      if (inlineTextLink) continue;
      const associated = el.id ? document.querySelector(`label[for="${CSS.escape(el.id)}"]`) : null;
      const name = el.getAttribute('aria-label') || associated?.textContent || el.getAttribute('title') || el.textContent || el.getAttribute('placeholder') || el.getAttribute('name') || el.getAttribute('type') || el.tagName;
      const width = Math.round(rect.width * 100) / 100;
      const height = Math.round(rect.height * 100) / 100;
      rows.push({
        state: stateName, index, name: name.trim().replace(/\s+/g, ' ').slice(0, 100),
        tag: el.tagName.toLowerCase(), type: el.getAttribute('type'), disabled: !!el.disabled,
        width, height, ok: width >= minimum && height >= minimum,
      });
    }
    return rows;
  }, { stateName: state, minimum: MIN_TARGET });
}

test('buyer listing controls fit 390px and expose 44px targets in signed-out and non-maker states', { timeout: 120_000 }, async () => {
  const ROOT = findRoot();
  let srv; let browser; let logFd;
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'market-listing-taps-data-'));
  try {
    const { chromium } = await loadPlaywright();
    const port = await freePort();
    const base = `http://127.0.0.1:${port}`;
    const logPath = path.join(OUT, `market-listing-taps-${suffix}-server.log`);
    logFd = fs.openSync(logPath, 'w');
    result.evidence.server_log = logPath;
    srv = spawn(process.execPath, ['commons/server.mjs'], {
      cwd: ROOT,
      env: {
        ...process.env, COMMONS_DATA: data, ASHRAM_PORT: String(port), COMMONS_PORT: String(port),
        COMMONS_PUBLIC_URL: base, COMMONS_ARRIVE_BYPASS: 'TESTGATE', COMMONS_FAKE_LLM: '1',
        COMMONS_NO_SPEND_POLL: '1', OPENROUTER_API_KEY: '', LLM_API_KEY: '', COMMONS_PAYMENTS: '',
        STRIPE_SECRET_KEY: '', STRIPE_PUBLISHABLE_KEY: '',
      },
      stdio: ['ignore', logFd, logFd],
    });
    let ready = false;
    for (let i = 0; i < 160; i++) {
      if (srv.exitCode !== null) throw new Error(`Server exited ${srv.exitCode}; see ${logPath}`);
      try { if ((await fetch(`${base}/api/rooms`, { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch { /* booting */ }
      await sleep(200);
    }
    assert.ok(ready, `isolated Commons server starts; see ${logPath}`);
    const post = (route, body, cookie) => fetch(base + route, {
      method: 'POST', headers: { 'content-type': 'application/json', 'X-Commons': '1', ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body), signal: AbortSignal.timeout(30_000),
    });

    // Same public test-gate/listing seed as market-phone-flow.mjs.
    const visitorResponse = await post('/api/arrive/visitor', {});
    assert.equal(visitorResponse.status, 200, 'test visitor is created');
    const visitor = await visitorResponse.json();
    const bypass = await post('/api/arrive/bypass', { vid: visitor.vid, code: 'TESTGATE' });
    assert.ok(bypass.ok, `test gate accepts visitor (status ${bypass.status})`);
    const entered = await post('/api/arrive/enter', { vid: visitor.vid, name: 'Listing Tap Seller' });
    assert.equal(entered.status, 201, 'seller enters isolated Commons');
    const sellerCookie = (entered.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(sellerCookie.includes('='), 'seller session cookie is issued');
    const created = await post('/api/market/listings', {
      title: 'Phone tap target drawing', text: 'An original drawing seeded only for this isolated browser audit.',
      category: 'art', type: 'product', price: { mode: 'fixed', amount: 500 }, license: 'all-rights', rights: true,
    }, sellerCookie);
    const listing = await created.json();
    assert.equal(created.status, 201, `seller creates listing: ${JSON.stringify(listing)}`);
    assert.ok(listing.id, 'test listing has an id');

    // A different, human member supplies the signed-in non-maker buyer state.
    const signin = await post('/api/humans', { name: 'Listing Tap Buyer', bio: 'isolated non-maker browser regression' });
    const signinBody = await signin.json();
    assert.ok([200, 201].includes(signin.status), `buyer sign-in: ${signin.status} ${JSON.stringify(signinBody)}`);
    const buyerCookie = (signin.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(buyerCookie.includes('='), 'buyer session cookie is issued');
    result.evidence.listing_id = listing.id;
    result.evidence.buyer_member_id = signinBody.member?.id || null;
    assert.ok(signinBody.member?.id, 'buyer member id is returned');
    save();

    browser = await chromium.launch({ executablePath: chromiumPath(chromium), headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
    const states = [
      { name: 'signed-out', cookie: null },
      { name: 'signed-in-non-maker', cookie: buyerCookie },
    ];
    for (const state of states) {
      const context = await browser.newContext({ viewport: { width: RENDER_WIDTH, height: 844 }, isMobile: true, hasTouch: true });
      if (state.cookie) {
        const split = state.cookie.indexOf('=');
        await context.addCookies([{ name: state.cookie.slice(0, split), value: state.cookie.slice(split + 1), url: base }]);
      }
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      const response = await page.goto(`${base}/label/l/${listing.id}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      assert.equal(response.status(), 200, `${state.name} listing responds 200`);
      assert.equal(new URL(page.url()).pathname, `/label/l/${listing.id}`, `${state.name} remains on the real listing`);
      await page.locator('main .mk-listing').waitFor({ state: 'visible', timeout: 30_000 });
      if (state.cookie) {
        await page.locator('#mk-asktext').waitFor({ state: 'visible' });
        assert.equal(await page.locator('.mk-own').count(), 0, 'non-maker does not receive maker edit/withdraw controls');
      } else {
        assert.equal(await page.locator('#mk-asktext').count(), 0, 'signed-out viewer does not receive the member question form');
      }
      const controls = await measurePage(page, state.name);
      const width = await page.evaluate(() => ({
        viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth,
        horizontal_overflow_px: Math.max(0, document.documentElement.scrollWidth - innerWidth),
      }));
      const screenshot = path.join(OUT, `market-listing-${state.name}-${suffix}.png`);
      await page.screenshot({ path: screenshot, fullPage: true });
      const record = { name: state.name, http_status: response.status(), controls, small_controls: controls.filter((c) => !c.ok), width, page_errors: pageErrors, screenshot };
      result.evidence.states.push(record);
      for (const c of controls) console.log(`${state.name} | ${c.name} | ${c.tag} | ${c.width}×${c.height} | ${c.ok ? 'ok' : 'SMALL'}`);
      console.log(`${state.name} | document=${width.document}px viewport=${width.viewport}px screenshot=${screenshot}`);
      save();
      await context.close();
    }

    // Measure and preserve both states before any red assertion. Width precedes targets so the 600px mutant dies here.
    for (const state of result.evidence.states) {
      assert.ok(state.controls.length > 0, `${state.name} exposes visible controls to measure`);
      assert.ok(state.width.document <= EXPECTED_WIDTH,
        `${state.name} document width must be <=${EXPECTED_WIDTH}: ${JSON.stringify(state.width)}`);
    }
    for (const state of result.evidence.states) {
      assert.deepEqual(state.small_controls, [],
        `${state.name} tap targets below ${MIN_TARGET}px: ${state.small_controls.map((c) => `${c.name} ${c.width}×${c.height}`).join('; ')}`);
      assert.deepEqual(state.page_errors, [], `${state.name} has no uncaught page errors`);
    }
    result.status = MUTANT ? 'mutant-unexpectedly-passed' : 'passed';
  } catch (error) {
    const killedByWidth = MUTANT && /document width must be <=390/.test(error.message);
    result.status = killedByWidth ? 'mutant-killed-as-required' : 'failed';
    result.failure = { message: error.message, stack: error.stack };
    if (!killedByWidth) throw error;
  } finally {
    result.finished_at = new Date().toISOString();
    save();
    if (browser) await browser.close();
    if (srv && srv.exitCode === null) { srv.kill('SIGTERM'); await sleep(250); if (srv.exitCode === null) srv.kill('SIGKILL'); }
    if (logFd !== undefined) fs.closeSync(logFd);
    fs.rmSync(data, { recursive: true, force: true });
  }
  if (MUTANT) assert.equal(result.status, 'mutant-killed-as-required', 'VIEWPORT_MUTANT=1 must fail at the document-width assertion');
});

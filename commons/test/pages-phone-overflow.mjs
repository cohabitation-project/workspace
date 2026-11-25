// Public pages must not create horizontal document overflow on a 390 px phone viewport.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, path.basename(HERE) === 'outputs' ? '../../..' : '../..');
const { freePort } = await import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const ROUTES = ['/', '/petition', '/label', '/members', '/jobs', '/coop'];
const VIEWPORT = { width: 390, height: 844 };
const CHROMIUM_CANDIDATES = [
  process.env.CHROME_PATH,
  process.env.CHROMIUM_PATH,
  '/opt/google/chrome/chrome',
  '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

async function findBrowser() {
  for (const candidate of CHROMIUM_CANDIDATES) {
    try { await fs.promises.access(candidate, fs.constants.X_OK); return candidate; } catch { /* try the next installation */ }
  }
  const { globSync } = await import('node:fs');
  const matches = [
    ...globSync('/opt/chrome-for-testing/*/chrome-linux64/chrome'),
    ...globSync('/home/runner/.cache/puppeteer/chrome/*/chrome-linux64/chrome'),
    ...globSync('/home/runner/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-linux64/chrome-headless-shell'),
  ].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return matches[0] || null;
}

async function cdp(port) {
  let wsUrl;
  for (let i = 0; i < 80; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      // Page domains are unavailable on the browser-level /json/version socket.
      wsUrl = targets.find((target) => target.type === 'page')?.webSocketDebuggerUrl;
      if (wsUrl) break;
    } catch { /* Chromium is still starting. */ }
    await sleep(250);
  }
  assert.ok(wsUrl, 'Chromium exposes a page-level DevTools endpoint');
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });
  let serial = 0;
  const pending = new Map();
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(JSON.stringify(message.error)));
    else resolve(message.result);
  });
  return {
    call(method, params = {}) {
      return new Promise((resolve, reject) => {
        const id = ++serial;
        pending.set(id, { resolve, reject });
        ws.send(JSON.stringify({ id, method, params }));
      });
    },
    close() { ws.close(); },
  };
}

async function evaluate(driver, expression, awaitPromise = false) {
  const reply = await driver.call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise });
  if (reply.exceptionDetails) throw new Error(JSON.stringify(reply.exceptionDetails));
  return reply.result?.value;
}

const MEASURE = `(() => {
  const viewportWidth = ${VIEWPORT.width};
  const root = document.documentElement;
  const body = document.body;
  const describe = (element) => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const id = element.id ? '#' + element.id : '';
    const classes = (element.getAttribute('class') || '').trim();
    const selector = element.tagName.toLowerCase() + id + (classes ? '.' + classes.split(/\\s+/).join('.') : '');
    return {
      selector: selector.slice(0, 240),
      width: Math.round(rect.width * 100) / 100,
      left: Math.round(rect.left * 100) / 100,
      right: Math.round(rect.right * 100) / 100,
      scrollWidth: element.scrollWidth,
    };
  };
  const elements = [body, ...(body ? body.querySelectorAll('*') : [])].filter(Boolean).filter((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  });
  const widest = elements.reduce((found, element) => {
    if (!found) return element;
    return element.getBoundingClientRect().width > found.getBoundingClientRect().width ? element : found;
  }, null);
  const overflowing = elements.filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.right > viewportWidth + 0.5 || rect.left < -0.5;
  }).sort((a, b) => {
    const ar = a.getBoundingClientRect();
    const br = b.getBoundingClientRect();
    return Math.max(br.right - viewportWidth, -br.left) - Math.max(ar.right - viewportWidth, -ar.left);
  }).slice(0, 8).map(describe);
  return {
    viewport: { width: innerWidth, height: innerHeight },
    documentWidth: root.scrollWidth,
    bodyWidth: body ? body.scrollWidth : 0,
    widest: describe(widest),
    overflowing,
  };
})()`;

test('public pages have no horizontal document overflow at 390x844', { timeout: 120000 }, async (t) => {
  const browser = await findBrowser();
  if (!browser) {
    t.skip('No Chromium/Chrome executable is installed; phone overflow was not measured.');
    return;
  }

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-phone-overflow-data-'));
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-phone-overflow-profile-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT,
    env: {
      ...process.env,
      ASHRAM_PORT: String(port),
      COMMONS_DATA: dataDir,
      COMMONS_FAKE_LLM: '1',
      COMMONS_NO_SPEND_POLL: '1',
    },
    stdio: 'ignore',
  });
  let chrome;
  let driver;
  const results = [];
  try {
    let booted = false;
    for (let i = 0; i < 80 && !booted; i++) {
      try { booted = (await fetch(`${base}/api/presence`)).ok; } catch { /* server is still starting */ }
      if (!booted) await sleep(250);
    }
    assert.ok(booted, 'Commons server booted on a temporary data directory');

    const debugPort = await freePort();
    chrome = spawn(browser, [
      '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=390,844',
      '--remote-allow-origins=*', `--remote-debugging-port=${debugPort}`,
      `--user-data-dir=${profileDir}`, 'about:blank',
    ], { stdio: 'ignore' });
    driver = await cdp(debugPort);
    await driver.call('Page.enable');
    await driver.call('Runtime.enable');
    await driver.call('Emulation.setDeviceMetricsOverride', {
      width: VIEWPORT.width,
      height: VIEWPORT.height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: VIEWPORT.width,
      screenHeight: VIEWPORT.height,
    });

    const measureRoute = async (route, response) => {
      const contentType = response.headers.get('content-type') || '';
      await response.body?.cancel();
      await driver.call('Page.navigate', { url: `${base}${route}` });
      let ready = false;
      for (let i = 0; i < 80 && !ready; i++) {
        ready = await evaluate(driver, `document.readyState === 'complete' && location.pathname + location.search === ${JSON.stringify(route)}`);
        if (!ready) await sleep(100);
      }
      assert.ok(ready, `${route} finished loading in Chromium`);
      await evaluate(driver, 'document.fonts ? document.fonts.ready : Promise.resolve()', true);
      await evaluate(driver, 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))', true);
      const measured = await evaluate(driver, MEASURE);
      results.push({ route, status: response.status, contentType, ...measured });
    };

    for (const route of ROUTES) {
      const response = await fetch(`${base}${route}`, { redirect: 'manual' });
      await measureRoute(route, response);
    }

    // The sitemap uses the configured public origin rather than this temporary server's
    // origin. Check that <loc>s share their declared origin, then measure their paths here.
    const sitemap = await fetch(`${base}/sitemap.xml`, { redirect: 'manual' });
    assert.equal(sitemap.status, 200, 'GET /sitemap.xml returns 200');
    const xml = await sitemap.text();
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
    assert.ok(locs.length > 0, 'sitemap contains at least one <loc>');
    const targets = locs.map((loc) => {
      try { return new URL(loc); }
      catch { assert.fail(`invalid sitemap URL: ${loc}`); }
    });
    const sitemapOrigin = targets[0].origin;
    const measuredRoutes = new Set(ROUTES);
    for (const target of targets) {
      if (target.origin !== sitemapOrigin || target.pathname === '/feed') continue;
      const route = `${target.pathname}${target.search}`;
      if (measuredRoutes.has(route)) continue;
      const response = await fetch(`${base}${route}`, { redirect: 'manual' });
      const contentType = response.headers.get('content-type') || '';
      if (response.status !== 200 || !/text\/html/i.test(contentType)) {
        await response.body?.cancel();
        continue;
      }
      measuredRoutes.add(route);
      await measureRoute(route, response);
    }
  } finally {
    if (driver) driver.close();
    if (chrome) chrome.kill();
    server.kill();
    fs.rmSync(dataDir, { recursive: true, force: true });
    fs.rmSync(profileDir, { recursive: true, force: true });
  }

  const bad = [];
  for (const result of results) {
    console.log(`page=${result.route} status=${result.status} viewport=${result.viewport.width}x${result.viewport.height} document=${result.documentWidth} body=${result.bodyWidth}`);
    const wrongResponse = result.status !== 200 || !/text\/html/i.test(result.contentType);
    const wrongViewport = result.viewport.width !== VIEWPORT.width || result.viewport.height !== VIEWPORT.height;
    if (wrongResponse || wrongViewport || result.documentWidth > VIEWPORT.width) bad.push(result);
  }
  for (const result of bad) {
    console.log(`FAIL ${result.route}: status=${result.status}, content-type=${JSON.stringify(result.contentType)}, documentWidth=${result.documentWidth}`);
    console.log(`WIDEST ${result.route}: ${JSON.stringify(result.widest)}`);
    for (const element of result.overflowing) console.log(`OVERFLOW ${result.route}: ${JSON.stringify(element)}`);
  }
  assert.equal(bad.length, 0, `${bad.length} public page(s) failed status, viewport, or horizontal-overflow checks`);
});

// Measure the signed-in Quick Edit page at a narrow phone viewport.
// Candidate for placement as commons/test/cut-phone-overflow.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
// This checked-in candidate also runs from commons/test after Setu places it there.
const IN_COMMONS_TEST = path.basename(HERE) === 'test' && path.basename(path.dirname(HERE)) === 'commons';
const ROOT = path.resolve(HERE, IN_COMMONS_TEST ? '../..' : '../../..');
const [{ freePort }, auth, store] = await Promise.all([
  import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href),
  import(pathToFileURL(path.join(ROOT, 'commons/lib/auth.mjs')).href),
  import(pathToFileURL(path.join(ROOT, 'commons/lib/store.mjs')).href),
]);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const VIEWPORT = { width: 390, height: 844 };
const CHROMIUM_CANDIDATES = [
  process.env.CHROME_PATH, process.env.CHROMIUM_PATH,
  '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

async function findBrowser() {
  for (const candidate of CHROMIUM_CANDIDATES) {
    try { await fs.promises.access(candidate, fs.constants.X_OK); return candidate; } catch { /* try next */ }
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
      wsUrl = targets.find((target) => target.type === 'page')?.webSocketDebuggerUrl;
      if (wsUrl) break;
    } catch { /* Chromium is starting */ }
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
  const root = document.documentElement, body = document.body;
  const describe = (element) => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const classes = (element.getAttribute('class') || '').trim();
    return {
      selector: (element.tagName.toLowerCase() + (element.id ? '#' + element.id : '') +
        (classes ? '.' + classes.split(/\\s+/).join('.') : '')).slice(0, 240),
      width: Math.round(rect.width * 100) / 100,
      left: Math.round(rect.left * 100) / 100,
      right: Math.round(rect.right * 100) / 100,
      scrollWidth: element.scrollWidth,
    };
  };
  const elements = [body, ...(body ? body.querySelectorAll('*') : [])].filter(Boolean).filter((element) => {
    const style = getComputedStyle(element), rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
  });
  const widest = elements.reduce((found, element) => !found ||
    element.getBoundingClientRect().width > found.getBoundingClientRect().width ? element : found, null);
  const overflow = elements.filter((element) => {
    const rect = element.getBoundingClientRect(); return rect.right > innerWidth + 0.5 || rect.left < -0.5;
  }).sort((a, b) => {
    const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
    return Math.max(br.right - innerWidth, -br.left) - Math.max(ar.right - innerWidth, -ar.left);
  }).slice(0, 8).map(describe);
  return { viewport: { width: innerWidth, height: innerHeight }, documentWidth: root.scrollWidth,
    bodyWidth: body?.scrollWidth || 0, widest: describe(widest), overflow };
})()`;

test('signed-in /cut/ has no horizontal document overflow at 390x844', { timeout: 120000 }, async (t) => {
  const browser = await findBrowser();
  if (!browser) { t.skip('No Chromium/Chrome executable is installed; /cut/ overflow was not measured.'); return; }

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cut-phone-overflow-data-'));
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cut-phone-overflow-profile-'));
  const port = await freePort(), base = `http://127.0.0.1:${port}`;
  store.init(dataDir);
  const member = store.addMember({ id: 'h_cut_phone_overflow', name: 'Cut Phone Overflow', kind: 'human' });
  const cookie = auth.sessionCookie(member.id, false, member.sessionVersion || 0);
  const server = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir,
      COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1' },
    stdio: 'ignore',
  });
  let chrome, driver, result;
  try {
    let booted = false;
    for (let i = 0; i < 80 && !booted; i++) {
      try { booted = (await fetch(`${base}/api/presence`)).ok; } catch { /* server starting */ }
      if (!booted) await sleep(250);
    }
    assert.ok(booted, 'Commons server booted on an isolated temporary data directory');
    const response = await fetch(`${base}/cut/`, { headers: { Cookie: cookie }, redirect: 'manual' });
    const contentType = response.headers.get('content-type') || '';
    await response.body?.cancel();

    const debugPort = await freePort();
    chrome = spawn(browser, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      '--remote-allow-origins=*', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileDir}`, 'about:blank'],
    { stdio: 'ignore' });
    driver = await cdp(debugPort);
    await driver.call('Page.enable'); await driver.call('Runtime.enable'); await driver.call('Network.enable');
    await driver.call('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false,
      screenWidth: VIEWPORT.width, screenHeight: VIEWPORT.height });
    const pair = cookie.split(';', 1)[0], equals = pair.indexOf('=');
    assert.ok(equals > 0, 'isolated signed-in cookie has a name and value');
    const installed = await driver.call('Network.setCookie', { name: pair.slice(0, equals),
      value: pair.slice(equals + 1), url: base, path: '/', httpOnly: true, sameSite: 'Strict' });
    assert.equal(installed?.success, true, 'Chromium accepted the signed-in cookie');
    await driver.call('Page.navigate', { url: `${base}/cut/` });
    let ready = false;
    for (let i = 0; i < 80 && !ready; i++) {
      ready = await evaluate(driver, "document.readyState === 'complete' && location.pathname === '/cut/'");
      if (!ready) await sleep(100);
    }
    assert.ok(ready, '/cut/ finished loading in Chromium');
    await evaluate(driver, 'document.fonts ? document.fonts.ready : Promise.resolve()', true);
    await evaluate(driver, 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))', true);
    result = { status: response.status, contentType, ...(await evaluate(driver, MEASURE)) };
  } finally {
    if (driver) driver.close();
    if (chrome) chrome.kill();
    server.kill();
    // Profile may still be flushing after Chrome exits; best-effort cleanup must not hide the result.
    for (const dir of [dataDir, profileDir]) {
      try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
    }
  }

  console.log(`page=/cut/ status=${result.status} content-type=${JSON.stringify(result.contentType)} viewport=${result.viewport.width}x${result.viewport.height} document=${result.documentWidth} body=${result.bodyWidth}`);
  console.log(`WIDEST /cut/: ${JSON.stringify(result.widest)}`);
  for (const element of result.overflow) console.log(`OVERFLOW /cut/: ${JSON.stringify(element)}`);
  assert.equal(result.status, 200, '/cut/ responds with HTTP 200');
  assert.match(result.contentType, /text\/html/i, '/cut/ responds with HTML');
  assert.deepEqual(result.viewport, VIEWPORT, 'Chromium retained the requested phone viewport');
  assert.ok(result.documentWidth <= VIEWPORT.width, `document width ${result.documentWidth} exceeds ${VIEWPORT.width}px`);
});

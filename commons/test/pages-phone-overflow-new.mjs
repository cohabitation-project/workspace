// Measure /apply, /stream and /watch at a narrow phone viewport, signed out and in.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { freePort } from './lib/port.mjs';
import * as auth from '../lib/auth.mjs';
import * as store from '../lib/store.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const VIEWPORT = { width: 390, height: 844 };
const PATHS = ['/apply', '/stream', '/watch'];
const CHROMIUM_CANDIDATES = [
  process.env.CHROME_PATH, process.env.CHROMIUM_PATH,
  '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

async function findBrowser() {
  for (const candidate of CHROMIUM_CANDIDATES) {
    try { await fs.promises.access(candidate, fs.constants.X_OK); return candidate; } catch { /* next */ }
  }
  const matches = [
    ...fs.globSync('/opt/chrome-for-testing/*/chrome-linux64/chrome'),
    ...fs.globSync('/home/runner/.cache/puppeteer/chrome/*/chrome-linux64/chrome'),
    ...fs.globSync('/home/runner/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-linux64/chrome-headless-shell'),
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
        (classes ? '.' + classes.split(/\s+/).join('.') : '')).slice(0, 240),
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
    const rect = element.getBoundingClientRect();
    return rect.right > innerWidth + 0.5 || rect.left < -0.5;
  }).sort((a, b) => {
    const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
    return Math.max(br.right - innerWidth, -br.left) - Math.max(ar.right - innerWidth, -ar.left);
  }).slice(0, 8).map(describe);
  return {
    viewport: { width: innerWidth, height: innerHeight },
    documentWidth: root.scrollWidth,
    bodyWidth: body?.scrollWidth || 0,
    widest: describe(widest), overflow,
  };
})()`;

async function settleMutation(driver) {
  await evaluate(driver, `new Promise((resolve) => {
    let quiet = 0, frames = 0, last = document.documentElement.scrollWidth;
    const finish = () => resolve(true);
    const timeout = setTimeout(finish, 1500);
    const tick = () => {
      const current = document.documentElement.scrollWidth;
      quiet = current === last ? quiet + 1 : 0; last = current; frames++;
      if (quiet >= 3) { clearTimeout(timeout); finish(); }
      else if (frames >= 90) { clearTimeout(timeout); finish(); }
      else requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  })`, true);
}

const REMOVE_MUTANT = `(() => {
  document.getElementById('__phone_overflow_mutant__')?.remove();
  const previous = window.__phone_overflow_direction__;
  if (previous) {
    document.documentElement.style.direction = previous.inline;
    if (previous.attribute === null) document.documentElement.removeAttribute('dir');
    else document.documentElement.setAttribute('dir', previous.attribute);
    delete window.__phone_overflow_direction__;
  }
  return true;
})()`;

function addMutant(direction) {
  assert.ok(direction === 'left' || direction === 'right');
  // LTR measures right overflow. An RTL scroll origin makes the same left overflow
  // measurable through documentElement.scrollWidth; removal restores both dir forms.
  const position = direction === 'right' ? 'left:0;' : 'right:0;';
  const rtl = direction === 'left' ? `
    window.__phone_overflow_direction__ = {
      inline: document.documentElement.style.direction,
      attribute: document.documentElement.getAttribute('dir'),
    };
    document.documentElement.style.direction = 'rtl';` : '';
  return `(() => {
    document.getElementById('__phone_overflow_mutant__')?.remove();${rtl}
    const wide = document.createElement('div');
    wide.id = '__phone_overflow_mutant__';
    wide.style.cssText = 'position:absolute;top:0;width:600px;height:1px;pointer-events:none;${position}';
    document.body.appendChild(wide);
    return true;
  })()`;
}

test('signed-out and signed-in new pages have no horizontal document overflow at 390x844', { timeout: 180000 }, async (t) => {
  const browser = await findBrowser();
  if (!browser) {
    t.skip('No Chromium/Chrome executable is installed; new-page overflow was not measured.');
    return;
  }

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-new-overflow-data-'));
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pages-new-overflow-profile-'));
  const port = await freePort(), base = `http://127.0.0.1:${port}`;
  store.init(dataDir);
  const member = store.addMember({ id: 'h_pages_new_overflow', name: 'Pages New Overflow', kind: 'human' });
  const cookie = auth.sessionCookie(member.id, false, member.sessionVersion || 0);
  const server = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'),
    env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir,
      COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1' },
    stdio: 'ignore',
  });
  let chrome, driver;
  const failures = [];
  try {
    let booted = false;
    for (let i = 0; i < 80 && !booted; i++) {
      try { booted = (await fetch(`${base}/api/presence`)).ok; } catch { /* server starting */ }
      if (!booted) await sleep(250);
    }
    assert.ok(booted, 'Commons server booted on an isolated temporary data directory');

    const debugPort = await freePort();
    chrome = spawn(browser, ['--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
      '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${VIEWPORT.width},${VIEWPORT.height}`,
      '--remote-allow-origins=*', `--remote-debugging-port=${debugPort}`, `--user-data-dir=${profileDir}`, 'about:blank'],
    { stdio: 'ignore' });
    driver = await cdp(debugPort);
    await driver.call('Page.enable');
    await driver.call('Runtime.enable');
    await driver.call('Network.enable');
    await driver.call('Emulation.setDeviceMetricsOverride', { ...VIEWPORT, deviceScaleFactor: 1, mobile: false,
      screenWidth: VIEWPORT.width, screenHeight: VIEWPORT.height });

    const pair = cookie.split(';', 1)[0], equals = pair.indexOf('=');
    assert.ok(equals > 0, 'isolated signed-in cookie has a name and value');
    for (const signedIn of [false, true]) {
      await driver.call('Network.clearBrowserCookies');
      if (signedIn) {
        const installed = await driver.call('Network.setCookie', { name: pair.slice(0, equals),
          value: pair.slice(equals + 1), url: base, path: '/', httpOnly: true, sameSite: 'Strict' });
        assert.equal(installed?.success, true, 'Chromium accepted the signed-in cookie');
      }
      for (const route of PATHS) {
        const authLabel = signedIn ? 'signed-in' : 'signed-out';
        try {
          const response = await fetch(`${base}${route}`, {
            headers: signedIn ? { Cookie: cookie } : {}, redirect: 'manual',
          });
          const contentType = response.headers.get('content-type') || '';
          await response.body?.cancel();
          await driver.call('Page.navigate', { url: `${base}${route}` });
          let ready = false;
          for (let i = 0; i < 80 && !ready; i++) {
            ready = await evaluate(driver, `document.readyState === 'complete' && location.pathname === ${JSON.stringify(route)}`);
            if (!ready) await sleep(100);
          }
          assert.ok(ready, `${route} finished loading in Chromium (${authLabel})`);
          await evaluate(driver, 'document.fonts ? document.fonts.ready : Promise.resolve()', true);
          await evaluate(driver, REMOVE_MUTANT);
          await settleMutation(driver);
          await evaluate(driver, 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))', true);
          const result = { status: response.status, contentType, ...(await evaluate(driver, MEASURE)) };
          console.log(`page=${route} auth=${authLabel} status=${result.status} content-type=${JSON.stringify(result.contentType)} viewport=${result.viewport.width}x${result.viewport.height} document=${result.documentWidth} body=${result.bodyWidth}`);
          console.log(`WIDEST ${route} ${authLabel}: ${JSON.stringify(result.widest)}`);
          for (const element of result.overflow) console.log(`OVERFLOW ${route} ${authLabel}: ${JSON.stringify(element)}`);
          if (result.status !== 200) failures.push(`${route} ${authLabel}: HTTP ${result.status}, expected 200`);
          if (!/text\/html/i.test(result.contentType)) failures.push(`${route} ${authLabel}: content type ${contentType}, expected HTML`);
          if (result.viewport.width !== VIEWPORT.width || result.viewport.height !== VIEWPORT.height) {
            failures.push(`${route} ${authLabel}: viewport ${result.viewport.width}x${result.viewport.height}, expected 390x844`);
          }
          if (result.documentWidth > VIEWPORT.width) {
            failures.push(`${route} ${authLabel}: document width ${result.documentWidth} exceeds 390px`);
          }

          for (const direction of ['right', 'left']) {
            try {
              await evaluate(driver, addMutant(direction));
              const mutant = await evaluate(driver, MEASURE);
              console.log(`MUTANT ${route} ${authLabel} ${direction}: document=${mutant.documentWidth} widest=${JSON.stringify(mutant.widest)}`);
              if (mutant.documentWidth < 600) {
                failures.push(`${route} ${authLabel} ${direction} mutant: document width ${mutant.documentWidth}, expected at least 600px`);
              }
            } finally {
              await evaluate(driver, REMOVE_MUTANT);
            }
          }
        } catch (error) {
          failures.push(`${route} ${authLabel}: ${error.message}`);
          try { await evaluate(driver, REMOVE_MUTANT); } catch { /* preserve the original failure */ }
        }
      }
    }
  } finally {
    if (driver) driver.close();
    if (chrome) chrome.kill();
    server.kill();
    for (const dir of [dataDir, profileDir]) {
      try { fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch {}
    }
  }
  assert.deepEqual(failures, [], `new-page overflow/status failures:\n${failures.join('\n')}`);
});

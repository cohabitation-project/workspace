#!/usr/bin/env node
// Browser-only layout check for Aletheia-6's PR #302 Work Desk.
// Run against an already-running server with composer, hand-in and review states present.
// Does not boot a server, sign in, create data, submit forms, or inspect another branch.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: process.env.DESK_302_URL || 'http://127.0.0.1:3000/desk' },
    out: { type: 'string', default: process.env.DESK_302_OUT || 'teams/build/outputs/desk-302-browser' },
    browser: { type: 'string', default: process.env.CHROME_PATH || process.env.CHROMIUM_PATH || '' },
    help: { type: 'boolean', default: false },
  },
  strict: true,
  allowPositionals: false,
});
if (values.help) {
  console.log(`Usage: node commons/test/desk-302-browser.mjs [options]\n\n` +
    `  --url URL       Absolute /desk URL on the running PR #302 server\n` +
    `                  (default: http://127.0.0.1:3000/desk; env: DESK_302_URL)\n` +
    `  --out DIR      Directory for two PNGs and results.json\n` +
    `                  (default: teams/build/outputs/desk-302-browser; env: DESK_302_OUT)\n` +
    `  --browser PATH Chromium/Chrome executable (env: CHROME_PATH or CHROMIUM_PATH)\n\n` +
    `The target server must already expose populated composer, hand-in and review states.\n` +
    `No session cookie is accepted or installed. Missing required states fail rather than\n` +
    `producing a false green. Nothing is submitted and no product code is changed.`);
  process.exit(0);
}

const target = new URL(values.url);
if (!['http:', 'https:'].includes(target.protocol)) throw new Error('--url must be an absolute HTTP(S) URL');
const outDir = path.resolve(values.out);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];
const CHROMIUM_CANDIDATES = [
  values.browser, '/opt/google/chrome/chrome', '/usr/bin/chromium',
  '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

async function findBrowser() {
  for (const candidate of CHROMIUM_CANDIDATES) {
    try { await fs.promises.access(candidate, fs.constants.X_OK); return candidate; } catch { /* next */ }
  }
  const { globSync } = await import('node:fs');
  const matches = [
    ...globSync('/opt/chrome-for-testing/*/chrome-linux64/chrome'),
    ...globSync('/home/runner/.cache/puppeteer/chrome/*/chrome-linux64/chrome'),
    ...globSync('/home/runner/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-linux64/chrome-headless-shell'),
  ].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return matches[0] || null;
}

// Same raw-CDP approach as commons/test/pages-phone-overflow-dynamic.mjs.
async function cdp(port) {
  let wsUrl;
  for (let i = 0; i < 80; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      wsUrl = targets.find((item) => item.type === 'page')?.webSocketDebuggerUrl;
      if (wsUrl) break;
    } catch { /* Chromium is still starting. */ }
    await sleep(250);
  }
  if (!wsUrl) throw new Error('Chromium did not expose a page-level DevTools endpoint');
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
  const round = (n) => Math.round(n * 100) / 100;
  const visible = (el) => {
    const style = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' && r.width > 0 && r.height > 0;
  };
  const name = (el) => {
    const id = el.id ? '#' + el.id : '';
    const classes = Array.from(el.classList || []).join('.');
    return (el.tagName.toLowerCase() + id + (classes ? '.' + classes : '')).slice(0, 240);
  };
  const rect = (el) => {
    const r = el.getBoundingClientRect();
    return {
      selector: name(el), width: round(r.width), height: round(r.height),
      left: round(r.left), right: round(r.right), top: round(r.top), bottom: round(r.bottom),
      scrollWidth: el.scrollWidth,
    };
  };
  const targets = {};
  for (const selector of ['.desk-composer', '.desk-handin', '.desk-review']) {
    targets[selector] = Array.from(document.querySelectorAll(selector)).map(rect);
  }
  const submitSelector = 'button:not([type]), button[type="submit"], input[type="submit"]';
  const handinSubmits = Array.from(document.querySelectorAll('.desk-handin')).flatMap((form, formIndex) =>
    Array.from(form.querySelectorAll(submitSelector)).filter(visible).map((button) => ({ formIndex, ...rect(button) })));
  const cards = Array.from(document.querySelectorAll('.desk-card')).map((card, cardIndex) => {
    const outer = card.getBoundingClientRect();
    const buttons = Array.from(card.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"], a.btn'))
      .filter(visible).map((button) => {
        const measured = rect(button);
        const r = button.getBoundingClientRect();
        const horizontallyInside = r.left >= outer.left - 0.5 && r.right <= outer.right + 0.5;
        const verticallyInside = r.top >= outer.top - 0.5 && r.bottom <= outer.bottom + 0.5;
        return { ...measured, horizontallyInside, verticallyInside, inside: horizontallyInside && verticallyInside };
      });
    return { cardIndex, ...rect(card), buttons };
  });
  const overflowing = [document.body, ...document.body.querySelectorAll('*')].filter(Boolean).filter(visible).filter((el) => {
    const r = el.getBoundingClientRect();
    return r.left < -0.5 || r.right > innerWidth + 0.5;
  }).slice(0, 20).map(rect);
  return {
    href: location.href,
    title: document.title,
    viewport: { width: innerWidth, height: innerHeight },
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body ? document.body.scrollWidth : 0,
    targets, handinSubmits, cards, overflowing,
  };
})()`;

function failuresFor(result) {
  const failures = [];
  const { width, height } = result.viewport;
  const expected = VIEWPORTS.find((item) => item.name === result.name);
  if (!expected || width !== expected.width || height !== expected.height) {
    failures.push(`viewport is ${width}x${height}, expected ${expected?.width}x${expected?.height}`);
  }
  if (result.documentWidth > width) failures.push(`document.scrollWidth ${result.documentWidth} > viewport ${width}`);
  if (result.bodyWidth > width) failures.push(`body.scrollWidth ${result.bodyWidth} > viewport ${width}`);
  for (const [selector, elements] of Object.entries(result.targets)) {
    if (!elements.length) failures.push(`required state missing: ${selector}`);
    for (const el of elements) {
      if (el.left < -0.5 || el.right > width + 0.5) {
        failures.push(`${selector} ${el.selector} crosses viewport: left=${el.left}, right=${el.right}, width=${el.width}`);
      }
    }
  }
  for (const button of result.handinSubmits) {
    // Strict on phones: the hand-in submit button's right edge must be < 390.
    if (button.right >= width || button.left < 0) {
      failures.push(`hand-in submit ${button.selector} is not strictly inside ${width}px: left=${button.left}, right=${button.right}`);
    }
  }
  if (!result.handinSubmits.length) failures.push('required state missing: visible hand-in submit button');
  for (const card of result.cards) {
    for (const button of card.buttons) {
      if (!button.inside) failures.push(`card ${card.cardIndex} button escapes its card: ${JSON.stringify(button)}`);
    }
  }
  return failures;
}

async function freePort() {
  const { createServer } = await import('node:net');
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

const browser = await findBrowser();
fs.mkdirSync(outDir, { recursive: true });
if (!browser) {
  const result = { pass: false, url: target.href, failures: ['No executable Chromium/Chrome installation found; no page was measured.'] };
  fs.writeFileSync(path.join(outDir, 'results.json'), JSON.stringify(result, null, 2) + '\n');
  console.error(result.failures[0]);
  process.exit(1);
}

const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'desk-302-browser-profile-'));
const debugPort = await freePort();
let chrome;
let driver;
const results = [];
try {
  chrome = spawn(browser, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1440,900',
    '--remote-allow-origins=*', `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`, 'about:blank',
  ], { stdio: 'ignore' });
  driver = await cdp(debugPort);
  await driver.call('Page.enable');
  await driver.call('Runtime.enable');
  await driver.call('Network.enable');

  for (const viewport of VIEWPORTS) {
    await driver.call('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height, deviceScaleFactor: 1, mobile: false,
      screenWidth: viewport.width, screenHeight: viewport.height,
    });
    await driver.call('Page.navigate', { url: target.href });
    const expectedLocation = target.pathname + target.search;
    let ready = false;
    for (let i = 0; i < 80 && !ready; i++) {
      ready = await evaluate(driver, `document.readyState === 'complete' && location.pathname + location.search === ${JSON.stringify(expectedLocation)}`);
      if (!ready) await sleep(100);
    }
    if (!ready) throw new Error(`${target.href} did not finish loading at ${viewport.width}x${viewport.height}`);
    await evaluate(driver, 'document.fonts ? document.fonts.ready : Promise.resolve()', true);
    await evaluate(driver, 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))', true);
    const measured = await evaluate(driver, MEASURE);
    const result = { name: viewport.name, ...measured };
    result.failures = failuresFor(result);
    results.push(result);
    const screenshot = await driver.call('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: false,
    });
    const screenshotPath = path.join(outDir, `desk-${viewport.width}x${viewport.height}.png`);
    fs.writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`${viewport.name}: document=${result.documentWidth}, body=${result.bodyWidth}, ` +
      `handinSubmits=${result.handinSubmits.length}, cards=${result.cards.length}, screenshot=${screenshotPath}`);
    for (const failure of result.failures) console.error(`FAIL ${viewport.name}: ${failure}`);
  }
} finally {
  if (driver) driver.close();
  if (chrome) chrome.kill();
  try { fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* preserve result */ }
}

const failures = results.flatMap((result) => result.failures.map((failure) => `${result.name}: ${failure}`));
const report = {
  pass: results.length === VIEWPORTS.length && failures.length === 0,
  url: target.href,
  browser,
  measuredAt: new Date().toISOString(),
  scope: 'Layout only; no form was submitted and no workflow was tested.',
  failures,
  results,
};
const resultPath = path.join(outDir, 'results.json');
fs.writeFileSync(resultPath, JSON.stringify(report, null, 2) + '\n');
console.log(`${report.pass ? 'PASS' : 'FAIL'}: ${resultPath}`);
if (!report.pass) process.exitCode = 1;

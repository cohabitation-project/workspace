// Measure Aletheia-6's Work Desk branch in a real browser; this is not a main-branch test.
// Usage: BASE=http://127.0.0.1:3000 node teams/build/outputs/round59-kimi-desk-302.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const BASE = process.env.BASE;
if (!BASE) throw new Error('BASE is required, for example BASE=http://127.0.0.1:3000');
const base = new URL(BASE).origin;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
];

async function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.CHROMIUM_PATH,
    '/opt/google/chrome/chrome',
    '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  for (const candidate of candidates) {
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

async function freePort() {
  const { createServer } = await import('node:net');
  const server = createServer();
  await new Promise((resolve, reject) => server.listen(0, '127.0.0.1', resolve).once('error', reject));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function cdp(port) {
  let wsUrl;
  for (let i = 0; i < 80; i++) {
    try {
      const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      wsUrl = targets.find((target) => target.type === 'page')?.webSocketDebuggerUrl;
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
  return {
    viewport: { width: innerWidth, height: innerHeight },
    documentWidth: root.scrollWidth,
    bodyWidth: body ? body.scrollWidth : 0,
    metrics: document.querySelectorAll('.desk-metric').length,
    sections: document.querySelectorAll('.desk-section').length,
    widest: describe(widest),
    finalUrl: location.href,
    title: document.title,
  };
})()`;

let chrome;
let driver;
let profileDir;
const results = [];
try {
  const browser = await findBrowser();
  if (!browser) throw new Error('No Chromium/Chrome executable found; set CHROME_PATH or CHROMIUM_PATH');
  profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'round59-desk-302-profile-'));
  const debugPort = await freePort();
  chrome = spawn(browser, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    '--hide-scrollbars', '--force-device-scale-factor=1', '--window-size=1440,900',
    '--remote-allow-origins=*', `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${profileDir}`, 'about:blank',
  ], { stdio: 'ignore' });
  driver = await cdp(debugPort);
  await driver.call('Page.enable');
  await driver.call('Runtime.enable');

  for (const viewport of VIEWPORTS) {
    await driver.call('Emulation.setDeviceMetricsOverride', {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: false,
      screenWidth: viewport.width,
      screenHeight: viewport.height,
    });
    const previousDocument = await evaluate(driver, 'performance.timeOrigin');
    await driver.call('Page.navigate', { url: `${base}/desk` });
    let ready = false;
    for (let i = 0; i < 100 && !ready; i++) {
      // A same-URL second navigation must not be mistaken for the previous, already-complete document.
      ready = await evaluate(driver, `document.readyState === 'complete' && location.href !== 'about:blank' && performance.timeOrigin !== ${JSON.stringify(previousDocument)}`);
      if (!ready) await sleep(100);
    }
    if (!ready) throw new Error(`/desk did not finish loading at ${viewport.width}x${viewport.height}`);
    await evaluate(driver, 'document.fonts ? document.fonts.ready : Promise.resolve()', true);
    await evaluate(driver, 'new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))', true);
    const measured = await evaluate(driver, MEASURE);
    const shot = await driver.call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    const screenshot = path.join(ROOT, 'teams/build/outputs', `round59-desk-${viewport.width}.png`);
    fs.writeFileSync(screenshot, Buffer.from(shot.data, 'base64'));
    const result = { ...measured, requestedViewport: viewport, screenshot };
    results.push(result);
    console.log(`page=/desk viewport=${measured.viewport.width}x${measured.viewport.height} document=${measured.documentWidth} metrics=${measured.metrics} sections=${measured.sections}`);
    console.log(`SCREENSHOT ${viewport.width}: ${screenshot}`);
    if (viewport.width === 390) console.log(`WIDEST /desk: ${JSON.stringify(measured.widest)}`);
  }
} finally {
  if (driver) driver.close();
  if (chrome) chrome.kill();
  if (profileDir) {
    try { fs.rmSync(profileDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* cleanup must not hide measurements */ }
  }
}

let failed = false;
for (const result of results) {
  const expected = result.requestedViewport;
  const wrongViewport = result.viewport.width !== expected.width || result.viewport.height !== expected.height;
  const overflow = result.documentWidth > expected.width;
  const missingMetrics = result.metrics === 0;
  if (wrongViewport || overflow || missingMetrics) {
    failed = true;
    console.log(`FAIL /desk ${expected.width}x${expected.height}: viewport=${result.viewport.width}x${result.viewport.height} document=${result.documentWidth} metrics=${result.metrics} widest=${JSON.stringify(result.widest)}`);
  }
}
if (results.length !== VIEWPORTS.length) failed = true;
if (failed) process.exitCode = 1;

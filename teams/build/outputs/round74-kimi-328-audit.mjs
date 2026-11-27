// Round 74 source-only production overflow audit. No page code is changed.
// Real signed-out Chromium, 320x568, DPR 1, mobile + touch. Prints JSON for every visible element whose right edge exceeds 320.
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

const BASE = 'https://cohabi.org';
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'round74-kimi-chromium-'));
const CACHE = fs.mkdtempSync(path.join(os.tmpdir(), 'round74-kimi-cache-'));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const freePort = () => new Promise((resolve) => {
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1', () => {
    const port = socket.address().port;
    socket.close(() => resolve(port));
  });
});
let browser;
let ws;
function chromium() {
  for (const candidate of [process.env.CHROMIUM, process.env.CHROME_BIN, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].filter(Boolean)) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return execFileSync('which', ['chromium'], { encoding: 'utf8' }).trim();
}
function cleanup(directory) {
  try { fs.rmSync(directory, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 }); } catch { /* evidence run is already complete */ }
}
try {
  const debugPort = await freePort();
  browser = spawn(chromium(), [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${PROFILE}`, 'about:blank',
  ], { stdio: 'ignore', env: { ...process.env, HOME: CACHE, XDG_CONFIG_HOME: path.join(CACHE, '.config'), XDG_CACHE_HOME: path.join(CACHE, '.cache') } });
  let version;
  for (let i = 0; i < 120; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json(); break; }
    catch { await sleep(250); }
  }
  if (!version?.webSocketDebuggerUrl) throw new Error('Chromium DevTools endpoint did not appear');
  ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.onopen = resolve; ws.onerror = reject; });
  let serial = 0;
  const pending = new Map();
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id) return;
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    clearTimeout(waiter.timer);
    if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
    else waiter.resolve(message.result);
  };
  function cdp(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++serial;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 30000);
      pending.set(id, { resolve, reject, timer });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });
  }
  const { targetId } = await cdp('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp('Target.attachToTarget', { targetId, flatten: true });
  const send = (method, params = {}) => cdp(method, params, sessionId);
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 568, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const record = {
    measuredAt: new Date().toISOString(), base: BASE, browser: version.Browser,
    viewport: { width: 320, height: 568, deviceScaleFactor: 1, mobile: true }, pages: [],
  };
  for (const route of ['/petition', '/coop', '/label', '/r/general']) {
    const response = await fetch(BASE + route, { redirect: 'manual' });
    const status = response.status;
    const locationHeader = response.headers.get('location');
    await response.arrayBuffer();
    if (status !== 200) { record.pages.push({ route, status, locationHeader }); continue; }
    await send('Page.navigate', { url: BASE + route });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      const result = await send('Runtime.evaluate', {
        expression: `document.readyState === 'complete' && location.pathname === ${JSON.stringify(route)}`,
        returnByValue: true,
      });
      if (result.result?.value) { ready = true; break; }
      await sleep(100);
    }
    await sleep(400);
    const expression = `(() => {
      function selector(el) {
        if (el.id) return el.tagName.toLowerCase() + '#' + el.id;
        let value = el.tagName.toLowerCase();
        if (el.classList.length) value += '.' + [...el.classList].join('.');
        const parent = el.parentElement;
        if (parent) {
          const same = [...parent.children].filter((x) => x.tagName === el.tagName);
          if (same.length > 1) value += ':nth-of-type(' + (same.indexOf(el) + 1) + ')';
        }
        return value;
      }
      const visible = (el) => {
        const style = getComputedStyle(el), rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 &&
          rect.width > 0 && rect.height > 0 && el.getClientRects().length > 0;
      };
      const overflow = [...document.querySelectorAll('*')].filter(visible)
        .map((el) => ({ el, rect: el.getBoundingClientRect() })).filter((x) => x.rect.right > 320)
        .map(({ el, rect }) => {
          const style = getComputedStyle(el);
          const parentRect = el.parentElement?.getBoundingClientRect();
          return {
            selector: selector(el), parent: el.parentElement ? selector(el.parentElement) : null,
            text: (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 160),
            href: el.getAttribute('href'),
            right: +rect.right.toFixed(3), left: +rect.left.toFixed(3), width: +rect.width.toFixed(3), height: +rect.height.toFixed(3),
            parentRight: parentRect ? +parentRect.right.toFixed(3) : null,
            parentLeft: parentRect ? +parentRect.left.toFixed(3) : null,
            parentWidth: parentRect ? +parentRect.width.toFixed(3) : null,
            minWidth: style.minWidth, widthCss: style.width, maxWidth: style.maxWidth,
            display: style.display, position: style.position, whiteSpace: style.whiteSpace,
            overflowWrap: style.overflowWrap, wordBreak: style.wordBreak, boxSizing: style.boxSizing,
            paddingLeft: style.paddingLeft, paddingRight: style.paddingRight,
            marginLeft: style.marginLeft, marginRight: style.marginRight,
          };
        });
      return {
        title: document.title, url: location.href, innerWidth,
        docWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth),
        htmlWidth: document.documentElement.getBoundingClientRect().width,
        bodyWidth: document.body.getBoundingClientRect().width, overflow,
      };
    })()`;
    const measured = await send('Runtime.evaluate', { expression, returnByValue: true });
    if (measured.exceptionDetails) throw new Error(JSON.stringify(measured.exceptionDetails));
    record.pages.push({ route, status, locationHeader, ready, ...measured.result.value });
  }
  console.log(JSON.stringify(record, null, 2));
} finally {
  try { ws?.close(); } catch { /* already closed */ }
  if (browser?.pid) {
    try { browser.kill('SIGKILL'); } catch { /* already gone */ }
    await Promise.race([new Promise((resolve) => browser.once('exit', resolve)), sleep(2000)]);
  }
  cleanup(PROFILE);
  cleanup(CACHE);
}

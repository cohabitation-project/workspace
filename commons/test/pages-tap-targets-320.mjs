// Door pages on the smallest phone (320x568, iPhone SE 1st gen / small Android): every control >= 44x44 and no sideways scroll.
// Signed out: /door /join /signin /signup. One line per control: "CTRL <page> <name> <w>x<h> ok|SMALL".
// Mutant: DOOR320_MUTANT=1 renders at 600 wide while still asserting 320 -> must go red.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'door-tap-320-'));
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'door-tap-320-chromium-'));
const LIMIT = 320;
const MUTANT = process.env.DOOR320_MUTANT === '1';
const VIEWPORT = { width: MUTANT ? 600 : LIMIT, height: 568 };
const BASE = process.env.BASE?.replace(/\/+$/, '') || '';
const freePort = () => new Promise((resolve) => {
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1', () => {
    const port = socket.address().port;
    socket.close(() => resolve(port));
  });
});
const PORT = await freePort();
const B = BASE || `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function chromium() {
  const paths = [process.env.CHROMIUM, process.env.CHROME_BIN, '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'].filter(Boolean);
  for (const candidate of paths) { if (fs.existsSync(candidate)) return candidate; }
  for (const command of ['chromium', 'chromium-browser', 'google-chrome']) {
    try { return execFileSync('which', [command], { encoding: 'utf8' }).trim(); } catch { /* next */ }
  }
  throw new Error('no Chromium executable (set CHROMIUM)');
}
function rmrf(directory) {
  try { fs.rmSync(directory, { recursive: true, force: true, maxRetries: 8, retryDelay: 150 }); }
  catch (error) { console.log(`cleanup ${directory}: ${error.code || error.message}`); }
}

let srv;
let browser;
let ws;

async function boot() {
  srv = spawn('node', ['commons/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA },
    stdio: 'ignore',
  });
  for (let i = 0; i < 80; i++) {
    try { if ((await fetch(`${B}/api/rooms`)).ok) return; } catch { /* booting */ }
    await sleep(250);
  }
  throw new Error('server did not boot');
}

test('petition and coop pages at 320x568: controls >= 44x44, document <= 320 wide', { timeout: 120000 }, async (t) => {
  if (!BASE) await boot();
  let executable;
  try { executable = chromium(); }
  catch (error) { t.skip(`Chromium unavailable: ${error.message}`); return; }
  const debugPort = await freePort();
  browser = spawn(executable, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage',
    `--remote-debugging-port=${debugPort}`, `--user-data-dir=${PROFILE}`, 'about:blank',
  ], { stdio: 'ignore' });
  let version;
  for (let i = 0; i < 120; i++) {
    try { version = await (await fetch(`http://127.0.0.1:${debugPort}/json/version`)).json(); break; }
    catch { await sleep(250); }
  }
  assert.ok(version?.webSocketDebuggerUrl, 'Chromium DevTools endpoint did not appear');
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
  await send('Emulation.setDeviceMetricsOverride', { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });

  const failures = [];
  async function measure(route) {
    const response = await fetch(B + route, { redirect: 'manual' });
    if (response.status >= 300 && response.status < 400) {
      console.log(`PAGE ${route} status=${response.status} location=${response.headers.get('location')} (not measured)`);
      return;
    }
    assert.equal(response.status, 200, `${route}: page response`);
    assert.match(response.headers.get('content-type') || '', /text\/html/, `${route}: HTML response`);
    await response.arrayBuffer();
    await send('Page.navigate', { url: B + route });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      const result = await send('Runtime.evaluate', {
        expression: `document.readyState === 'complete' && location.pathname === ${JSON.stringify(route)}`,
        returnByValue: true,
      });
      if (result.result?.value) { ready = true; break; }
      await sleep(100);
    }
    assert.ok(ready, `${route}: page finished loading in Chromium`);
    await sleep(300);
    const expression = `(() => {
      // Closed <details> content cannot be tapped and has no innerText; open them so the inline-link exemption is judged on what a reader sees.
      document.querySelectorAll('details').forEach((d) => { d.open = true; });
      const visible = (el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 &&
          rect.width > 0 && rect.height > 0 && el.getClientRects().length > 0;
      };
      const inlineText = (el) => {
        if (el.tagName !== 'A' || el.matches('.foot a, .btn, .linkbtn') || getComputedStyle(el).display !== 'inline') return false;
        // WCAG 2.5.8 exempts links inside a sentence; the agent invitation is one running paragraph.
        const p = el.closest('p, li, aside.agent-door');
        return Boolean(p && (p.innerText || '').replace((el.innerText || ''), '').trim().length > 0);
      };
      const label = (el) => (el.innerText || el.value || el.getAttribute('aria-label') || el.title || el.placeholder || '').trim().replace(/\\s+/g, ' ').slice(0, 60);
      const controls = [...document.querySelectorAll('a, button, input, select, textarea, [role="button"]')]
        .filter((el) => !(el.tagName === 'INPUT' && el.type === 'hidden'))
        .filter(visible).map((el) => {
          // A checkbox or radio inside its <label>: the label is the tap target (tapping it toggles the box).
          const hit = (el.tagName === 'INPUT' && /^(checkbox|radio)$/.test(el.type) && el.closest('label')) || el;
          const rect = hit.getBoundingClientRect();
          return { text: label(el) || '<' + el.tagName.toLowerCase() + (el.type ? ':' + el.type : '') + '>', width: Math.round(rect.width * 100) / 100,
            height: Math.round(rect.height * 100) / 100, where: (el.className||'') + ' < ' + (el.parentElement?.className||el.parentElement?.tagName) + ' < ' + (el.parentElement?.parentElement?.className||el.parentElement?.parentElement?.tagName) + ' href=' + (el.getAttribute('href')||''), right: Math.round(rect.right), exempt: inlineText(el) };
        });
      const wide = [...document.querySelectorAll('body *')].filter(visible)
        .map((el) => ({ el, r: el.getBoundingClientRect() })).filter((x) => x.r.right > ${LIMIT} + 1)
        .sort((a, b) => b.r.right - a.r.right).slice(0, 5)
        .map((x) => x.el.tagName.toLowerCase() + (x.el.id ? '#' + x.el.id : '') + (x.el.className && x.el.className.baseVal === undefined ? '.' + String(x.el.className).trim().split(/\\s+/).join('.') : '') + ' right=' + Math.round(x.r.right) + ' w=' + Math.round(x.r.width));
      return { controls, wide, docWidth: Math.max(document.documentElement.scrollWidth, document.body.scrollWidth), innerWidth };
    })()`;
    const { result } = await send('Runtime.evaluate', { expression, returnByValue: true });
    const got = result?.value;
    assert.ok(got && Array.isArray(got.controls), `${route}: measurement returned controls`);
    console.log(`PAGE ${route} controls=${got.controls.length} doc=${got.docWidth} innerWidth=${got.innerWidth}`);
    for (const w of got.wide || []) console.log(`WIDE ${route} ${w}`);
    if (got.docWidth > LIMIT) failures.push(`${route}: document ${got.docWidth}px wide (> ${LIMIT})`);
    for (const c of got.controls) {
      const small = (c.width < 44 || c.height < 44) && !c.exempt;
      console.log(`CTRL ${route} ${c.text} ${c.width}x${c.height}${c.exempt ? ' (inline text)' : ''} ${small ? 'SMALL' : 'ok'} @ ${c.where}`);
      if (small) failures.push(`${route}: ${c.text} ${c.width}x${c.height}`);
      if (c.right > LIMIT + 1) failures.push(`${route}: ${c.text} runs to x=${c.right} (> ${LIMIT})`);
    }
  }

  for (const route of ['/petition', '/coop']) await measure(route);
  console.log(`MEASURED viewport=${VIEWPORT.width}x${VIEWPORT.height} limit=${LIMIT} findings=${failures.length}`);
  assert.equal(failures.length, 0, `${failures.length} finding(s) at 320 wide: ${failures.join('; ')}`);
});

test.after(() => {
  try { ws?.close(); } catch { /* already closed */ }
  try { browser?.kill(); } catch { /* already gone */ }
  try { srv?.kill(); } catch { /* already gone */ }
  rmrf(PROFILE);
  rmrf(DATA);
});

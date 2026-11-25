// Door controls must be comfortably tappable on the 390 px phone used by the door overflow check.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'door-tap-targets-'));
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'door-tap-chromium-'));
const VIEWPORT = { width: 390, height: 844 };
const BASE = process.env.BASE?.replace(/\/+$/, '') || '';
const PORT = await new Promise((resolve) => {
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1', () => {
    const port = socket.address().port;
    socket.close(() => resolve(port));
  });
});
const B = BASE || `http://127.0.0.1:${PORT}`;
const J = { 'content-type': 'application/json', 'x-commons': '1' };
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const post = (route, body) => fetch(B + route, { method: 'POST', headers: J, body: JSON.stringify(body) });
const cookieOf = (response) => (response.headers.get('set-cookie') || '').split(';')[0];
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
let humanCookie = '';
let authorizeQuery;

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

test('door controls meet 44x44 phone tap targets', { timeout: 120000 }, async (t) => {
  if (!BASE) await boot();
  const human = await post('/api/humans', { name: 'Door Tap Seed', age13: true });
  assert.equal(human.status, 201, await human.text());
  humanCookie = cookieOf(human);
  assert.match(humanCookie, /^commons_session=/);
  const me = await fetch(`${B}/api/me`, { headers: { cookie: humanCookie } });
  assert.equal(me.status, 200);
  const registered = await post('/oauth/register', {
    client_name: 'Door Tap Test App',
    redirect_uris: [REDIRECT],
    token_endpoint_auth_method: 'none',
  });
  const client = await registered.json();
  assert.ok(registered.ok, JSON.stringify(client));
  assert.ok(client.client_id);
  const challenge = crypto.createHash('sha256').update(crypto.randomBytes(40).toString('base64url')).digest('base64url');
  authorizeQuery = new URLSearchParams({
    response_type: 'code', client_id: client.client_id, redirect_uri: REDIRECT,
    state: 'door-tap', code_challenge: challenge, code_challenge_method: 'S256', scope: 'commons',
  });

  let executable;
  try { executable = chromium(); }
  catch (error) { t.skip(`Chromium unavailable: ${error.message}`); return; }
  const debugPort = await new Promise((resolve) => {
    const socket = net.createServer();
    socket.listen(0, '127.0.0.1', () => {
      const port = socket.address().port;
      socket.close(() => resolve(port));
    });
  });
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
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: VIEWPORT.width, height: VIEWPORT.height, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });

  const failures = [];
  async function measure(route, { signedIn = false } = {}) {
    const response = await fetch(B + route, { redirect: 'manual', headers: signedIn ? { cookie: humanCookie } : {} });
    if (response.status >= 300 && response.status < 400) {
      console.log(`page=${route} status=${response.status} location=${response.headers.get('location')} (not measured)`);
      return;
    }
    assert.equal(response.status, 200, `${route}: page response`);
    assert.match(response.headers.get('content-type') || '', /text\/html/, `${route}: HTML response`);
    await response.arrayBuffer();
    if (signedIn) {
      const pair = humanCookie.split(';', 1)[0];
      const equals = pair.indexOf('=');
      assert.ok(equals > 0, 'session cookie has a name and value');
      const cookie = await send('Network.setCookie', {
        name: pair.slice(0, equals), value: pair.slice(equals + 1), url: B,
        path: '/', httpOnly: true, sameSite: 'Lax',
      });
      assert.equal(cookie.success, true, 'the seeded human session cookie is installed before consent navigation');
    }
    await send('Page.navigate', { url: B + route });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      const result = await send('Runtime.evaluate', {
        expression: `document.readyState === 'complete' && location.pathname + location.search === ${JSON.stringify(route)}`,
        returnByValue: true,
      });
      if (result.result?.value) { ready = true; break; }
      await sleep(100);
    }
    assert.ok(ready, `${route}: page finished loading in Chromium`);
    const expression = `(() => {
      const visible = (el) => {
        const style = getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) !== 0 &&
          rect.width > 0 && rect.height > 0 && el.getClientRects().length > 0;
      };
      const visibleTextOutside = (block, link) => {
        const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
        let node;
        while ((node = walker.nextNode())) {
          if (!node.textContent.trim() || link.contains(node)) continue;
          let ancestor = node.parentElement;
          let shown = true;
          while (ancestor && ancestor !== block.parentElement) {
            const style = getComputedStyle(ancestor);
            if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number(style.opacity) === 0) {
              shown = false; break;
            }
            ancestor = ancestor.parentElement;
          }
          if (!shown) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          if ([...range.getClientRects()].some(rect => rect.width > 0 && rect.height > 0)) return true;
        }
        return false;
      };
      const inlineTextLink = (el) => {
        if (el.tagName !== 'A' || el.matches('.foot a, .btn, .linkbtn') || getComputedStyle(el).display !== 'inline') return false;
        let block = el.parentElement;
        while (block) {
          const display = getComputedStyle(block).display;
          if (['block', 'flow-root', 'flex', 'grid', 'list-item', 'table', 'table-cell', 'table-caption'].includes(display)) break;
          block = block.parentElement;
        }
        return Boolean(block && visibleTextOutside(block, el));
      };
      const label = (el) => (el.innerText || el.value || el.getAttribute('aria-label') || el.title || '').trim().replace(/\\s+/g, ' ').slice(0, 100);
      return [...document.querySelectorAll('a, button, input[type="submit"], [role="button"]')]
        .filter(visible).map((el) => {
          const rect = el.getBoundingClientRect();
          return { text: label(el) || '<no text>', width: Math.round(rect.width * 100) / 100,
            height: Math.round(rect.height * 100) / 100, exempt: inlineTextLink(el) };
        });
    })()`;
    const { result } = await send('Runtime.evaluate', { expression, returnByValue: true });
    const targets = result?.value;
    assert.ok(Array.isArray(targets), `${route}: tap-target measurement returned an array`);
    console.log(`page=${route} targets=${targets.length}`);
    for (const target of targets) {
      if (target.width >= 44 && target.height >= 44) continue;
      const exemption = target.exempt ? 'yes' : 'no';
      console.log(`TAP ${route} ${target.text} ${target.width}x${target.height} exempt=${exemption}`);
      if (exemption === 'no') failures.push(`${route}: ${target.text} ${target.width}x${target.height}`);
    }
  }

  for (const route of ['/door', '/join', '/signin', '/connect']) await measure(route);
  await measure(`/oauth/authorize?${authorizeQuery}`, { signedIn: true });
  assert.equal(failures.length, 0, `${failures.length} non-exempt door tap target(s) are under 44x44: ${failures.join('; ')}`);
});

test.after(() => {
  try { ws?.close(); } catch { /* already closed */ }
  try { browser?.kill(); } catch { /* already gone */ }
  try { srv?.kill(); } catch { /* already gone */ }
  rmrf(PROFILE);
  rmrf(DATA);
});

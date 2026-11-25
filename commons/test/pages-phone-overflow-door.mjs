// Door pages must fit the phone Geoffrey used: /door, /join, /signin, /welcome,
// /connect, and the signed-in OAuth consent page. The consent setup follows
// door-consent-who.mjs; the isolated boot, raw CDP, 390 px emulation and WIDEST
// diagnostics follow pages-phone-overflow-dynamic.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'door-overflow-'));
const PROFILE = fs.mkdtempSync(path.join(os.tmpdir(), 'door-overflow-chromium-'));
const PORT = await new Promise((resolve) => {
  const socket = net.createServer();
  socket.listen(0, '127.0.0.1', () => {
    const port = socket.address().port;
    socket.close(() => resolve(port));
  });
});
const B = `http://127.0.0.1:${PORT}`;
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
let client;
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

test('door and signed-in OAuth consent fit a 390x844 phone', { timeout: 120000 }, async (t) => {
  await boot();
  const human = await post('/api/humans', { name: 'Door Overflow Seed', age13: true });
  assert.equal(human.status, 201, await human.text());
  humanCookie = cookieOf(human);
  assert.match(humanCookie, /^cx=/);
  const me = await fetch(`${B}/api/members/me`, { headers: { cookie: humanCookie } });
  assert.equal(me.status, 200);
  const registered = await post('/oauth/register', {
    client_name: 'Door Phone Test App',
    redirect_uris: [REDIRECT],
    token_endpoint_auth_method: 'none',
  });
  client = await registered.json();
  assert.ok(registered.ok, JSON.stringify(client));
  assert.ok(client.client_id);
  const challenge = crypto.createHash('sha256').update(crypto.randomBytes(40).toString('base64url')).digest('base64url');
  authorizeQuery = new URLSearchParams({
    response_type: 'code', client_id: client.client_id, redirect_uri: REDIRECT,
    state: 'door-phone', code_challenge: challenge, code_challenge_method: 'S256', scope: 'commons',
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
  const errors = [];
  ws.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const waiter = pending.get(message.id);
      if (!waiter) return;
      pending.delete(message.id);
      clearTimeout(waiter.timer);
      if (message.error) waiter.reject(new Error(JSON.stringify(message.error)));
      else waiter.resolve(message.result);
    } else if (message.method === 'Runtime.exceptionThrown') {
      errors.push(message.params.exceptionDetails?.exception?.description || message.params.exceptionDetails?.text);
    }
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
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });

  async function measure(route, { signedIn = false, consent = false } = {}) {
    const before = errors.length;
    const response = await fetch(B + route, { redirect: 'manual', headers: signedIn ? { cookie: humanCookie } : {} });
    assert.equal(response.status, 200, `${route}: page response`);
    assert.match(response.headers.get('content-type') || '', /text\/html/, `${route}: HTML response`);
    await response.arrayBuffer();
    if (signedIn) {
      const cookie = await send('Network.setCookie', { name: 'cx', value: humanCookie.slice(3).split(';')[0], url: B, path: '/', httpOnly: true, sameSite: 'Lax' });
      assert.equal(cookie.success, true, 'the human session cookie is installed before consent navigation');
    }
    const loaded = new Promise((resolve) => {
      const listener = ({ data }) => {
        const message = JSON.parse(data);
        if (message.method === 'Page.loadEventFired') {
          ws.removeEventListener('message', listener);
          resolve();
        }
      };
      ws.addEventListener('message', listener);
    });
    await send('Page.navigate', { url: B + route });
    await loaded;
    let ready = false;
    for (let i = 0; i < 80; i++) {
      const result = await send('Runtime.evaluate', {
        expression: `Boolean(document.querySelector('main') || document.querySelector('h1')) && document.readyState === 'complete'`,
        returnByValue: true,
      });
      if (result.result?.value) { ready = true; break; }
      await sleep(100);
    }
    assert.ok(ready, `${route}: page did not become ready`);
    const { result } = await send('Runtime.evaluate', {
      expression: `(() => {
        const viewport = { width: innerWidth, height: innerHeight, visualWidth: visualViewport.width, visualHeight: visualViewport.height };
        const documentWidth = document.documentElement.scrollWidth;
        const widest = [...document.querySelectorAll('body *')].map((el) => {
          const r = el.getBoundingClientRect();
          return { tag: el.tagName, id: el.id, class: typeof el.className === 'string' ? el.className.slice(0, 160) : '', left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width), scrollWidth: el.scrollWidth, text: (el.innerText || el.getAttribute('content') || '').trim().replace(/\\s+/g, ' ').slice(0, 160) };
        }).filter((x) => x.width > 0 && (x.right > innerWidth + 1 || x.left < -1 || x.scrollWidth > innerWidth + 1)).sort((a, b) => Math.max(b.right, b.scrollWidth) - Math.max(a.right, a.scrollWidth)).slice(0, 12);
        const signedInLine = document.body.innerText.includes("You're signed in as Door Overflow Seed");
        return { viewport, documentWidth, bodyWidth: document.body.scrollWidth, widest, signedInLine };
      })()`, returnByValue: true,
    });
    const value = result.value;
    console.log(`page=${route} document=${value.documentWidth} body=${value.bodyWidth} viewport=${JSON.stringify(value.viewport)}`);
    if (value.widest.length) console.log(`WIDEST ${route}: ${JSON.stringify(value.widest, null, 2)}`);
    assert.equal(value.viewport.width, 390, `${route}: layout viewport`);
    assert.equal(value.viewport.height, 844, `${route}: viewport height`);
    assert.equal(value.viewport.visualWidth, 390, `${route}: visual viewport`);
    assert.ok(value.documentWidth <= 390, `${route}: horizontal overflow ${value.documentWidth} > 390; ${JSON.stringify(value.widest)}`);
    if (consent) assert.equal(value.signedInLine, true, `${route}: consent is signed in as the seeded human, not signed out`);
    assert.deepEqual(errors.slice(before), [], `${route}: browser errors`);
  }

  // Public pages are deliberately measured before installing the human cookie.
  for (const route of ['/door', '/join', '/signin', '/welcome', '/connect']) await measure(route);
  await measure(`/oauth/authorize?${authorizeQuery}`, { signedIn: true, consent: true });
});

test.after(() => {
  try { ws?.close(); } catch { /* already closed */ }
  try { browser?.kill(); } catch { /* already gone */ }
  try { srv?.kill(); } catch { /* already gone */ }
  rmrf(PROFILE);
  rmrf(DATA);
});

// Round 81: /join, /members, /my-agents and OAuth consent on real Chromium.
// Run from any directory: ROOT=/fresh/checkout OUT=/evidence node --test /path/door-phone.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
function findRoot() {
  if (process.env.ROOT) return path.resolve(process.env.ROOT);
  let dir = HERE;
  while (true) {
    if (fs.existsSync(path.join(dir, 'commons/server.mjs'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error('Cannot find the checkout root; set ROOT');
    dir = parent;
  }
}
const ROOT = findRoot();
const OUT = process.env.OUT || path.join(ROOT, 'teams/build/outputs/door-phone');
fs.mkdirSync(OUT, { recursive: true });
const { freePort } = await import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const VIEWPORTS = [{ width: 320, height: 568 }, { width: 390, height: 844 }];
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';

function chromePath() {
  const fixed = [process.env.CHROME_PATH, process.env.CHROMIUM_PATH,
    '/opt/google/chrome/chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  const glob = fs.globSync ? fs.globSync : () => [];
  const found = [
    ...glob('/opt/chrome-for-testing/*/chrome-linux64/chrome'),
    ...glob('/home/runner/.cache/puppeteer/chrome/*/chrome-linux64/chrome'),
    ...glob('/home/runner/.cache/puppeteer/chrome-headless-shell/*/chrome-headless-shell-linux64/chrome-headless-shell'),
    ...glob('/root/.cache/puppeteer/chrome/*/chrome-linux64/chrome'),
  ].sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));
  return [...fixed, ...found].find((candidate) => {
    try { fs.accessSync(candidate, fs.constants.X_OK); return true; } catch { return false; }
  }) || null;
}

const evidence = { routes: ['/join', '/members', '/my-agents', '/oauth/authorize'], root: ROOT,
  head: null, publicMain: process.env.PUBLIC_MAIN || null, executable: null, signup: null,
  oauthRegistration: null, checks: [], fatal: null, serverLog: '' };

test('door pages fit phones and have no browser errors', { timeout: 120000 }, async (t) => {
  const executablePath = chromePath();
  if (!executablePath) { t.skip('No Chromium/Chrome executable installed'); return; }
  evidence.executable = executablePath;
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'door-phone-data-'));
  const env = { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir,
    COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1', NODE_ENV: 'test' };
  for (const key of ['COMMONS_PAYMENTS', 'STRIPE_SECRET_KEY', 'LULU_LIVE', 'LULU_CLIENT_KEY', 'LULU_CLIENT_SECRET']) delete env[key];
  const server = spawn(process.execPath, ['commons/server.mjs'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.on('data', (chunk) => { evidence.serverLog = (evidence.serverLog + chunk).slice(-20000); });
  server.stderr.on('data', (chunk) => { evidence.serverLog = (evidence.serverLog + chunk).slice(-20000); });
  let browser;
  try {
    let booted = false;
    for (let i = 0; i < 100 && !booted; i++) {
      try { booted = (await fetch(`${base}/healthz`)).ok; } catch { /* starting */ }
      if (!booted) await sleep(200);
    }
    assert.ok(booted, `server booted on an isolated data directory: ${evidence.serverLog}`);
    evidence.head = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).stdout?.trim() || null;

    // Synthetic fixtures only: no real member data, agent token, recovery code or credential is used.
    const fixtureName = `R81Door${Date.now()}`;
    const signup = await fetch(`${base}/api/humans`, { method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Commons': '1' },
      body: JSON.stringify({ name: fixtureName, bio: 'isolated round 81 browser fixture',
        age: '18+', age_band: '18+', age_range: '18+', age_confirm: true, age_confirmed: true,
        age_attested: true, age_attestation: true, over_13: true, over13: true,
        is_13_or_older: true, is13OrOlder: true, confirm_13: true, confirmAge: true }) });
    const setCookie = signup.headers.get('set-cookie');
    evidence.signup = { status: signup.status, setCookie: Boolean(setCookie) };
    assert.equal(signup.status, 201, 'synthetic human created');
    assert.ok(setCookie, 'synthetic human has a session cookie');
    const cookie = setCookie.split(';')[0];
    const separator = cookie.indexOf('=');
    const cookieName = cookie.slice(0, separator), cookieValue = cookie.slice(separator + 1);

    const registration = await fetch(`${base}/oauth/register`, { method: 'POST',
      headers: { 'content-type': 'application/json', 'x-commons': '1' },
      body: JSON.stringify({ client_name: 'R81 Door Phone', redirect_uris: [REDIRECT] }) });
    evidence.oauthRegistration = { status: registration.status };
    assert.equal(registration.status, 201, 'synthetic OAuth app registered');
    const client = await registration.json();
    const challenge = crypto.createHash('sha256').update(crypto.randomBytes(40).toString('base64url')).digest('base64url');
    const oauthQuery = new URLSearchParams({ response_type: 'code', client_id: client.client_id,
      redirect_uri: REDIRECT, state: 'r81-phone', code_challenge: challenge,
      code_challenge_method: 'S256', scope: 'commons' });

    browser = await puppeteer.launch({ headless: true, executablePath,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--force-device-scale-factor=1'] });
    const pages = [
      { name: 'join', url: `${base}/join`, signedIn: false },
      { name: 'members', url: `${base}/members`, signedIn: false },
      { name: 'my-agents', url: `${base}/my-agents`, signedIn: true },
      { name: 'oauth-consent', url: `${base}/oauth/authorize?${oauthQuery}`, signedIn: true },
    ];
    for (const viewport of VIEWPORTS) for (const spec of pages) {
      const page = await browser.newPage();
      const row = { page: spec.name, route: spec.name === 'oauth-consent' ? '/oauth/authorize' : `/${spec.name}`,
        state: spec.signedIn ? 'signed-in' : 'signed-out', viewport, status: null,
        documentWidth: null, bodyWidth: null, controls: 0, smallControls: [],
        consoleErrors: [], pageErrors: [], cspErrors: [], responseErrors: [], screenshot: null };
      evidence.checks.push(row);
      page.on('console', (message) => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
      page.on('pageerror', (error) => row.pageErrors.push(String(error)));
      page.on('response', (response) => { if (response.status() >= 400) row.responseErrors.push({ status: response.status(), url: response.url() }); });
      await page.setViewport({ ...viewport, deviceScaleFactor: 1, isMobile: false });
      if (spec.signedIn) await page.setCookie({ name: cookieName, value: cookieValue, url: base });
      try {
        const response = await page.goto(spec.url, { waitUntil: 'load', timeout: 25000 });
        row.status = response?.status() ?? null;
        await page.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve());
        await sleep(500);
        const measured = await page.evaluate(() => {
          const visible = (element) => {
            const style = getComputedStyle(element), rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          };
          const controls = [...document.querySelectorAll('button,a[href],input,select,textarea,summary,[role="button"],[role="tab"]')].filter(visible);
          const smallControls = controls.map((element, index) => {
            const rect = element.getBoundingClientRect();
            const id = element.id ? `#${element.id}` : '';
            const classes = (element.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).map((x) => `.${x}`).join('');
            return { selector: `${element.tagName.toLowerCase()}${id}${classes}`.slice(0, 240), index,
              text: (element.getAttribute('aria-label') || element.textContent || element.getAttribute('placeholder') || element.value || '').trim().replace(/\s+/g, ' ').slice(0, 120),
              width: +rect.width.toFixed(2), height: +rect.height.toFixed(2), disabled: Boolean(element.disabled) };
          }).filter((control) => control.width < 44 || control.height < 44);
          return { documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body?.scrollWidth || 0,
            innerWidth, innerHeight, controls: controls.length, smallControls,
            title: document.title, hasFixtureName: document.body.innerText.includes(document.body.innerText.match(/R81Door\d+/)?.[0] || '\u0000') };
        });
        Object.assign(row, measured);
        row.cspErrors = [...row.consoleErrors, ...row.pageErrors].filter((message) => /content security policy|\bcsp\b|frame-ancestors|refused to frame/i.test(message));
        const filename = `door-phone-${spec.name}-${viewport.width}x${viewport.height}.png`;
        await page.screenshot({ path: path.join(OUT, filename), fullPage: true });
        row.screenshot = filename;
      } catch (error) { row.fatal = String(error.stack || error); }
      finally { await page.close(); }
    }
  } catch (error) { evidence.fatal = String(error.stack || error); }
  finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    fs.writeFileSync(path.join(OUT, 'door-phone-evidence.json'), JSON.stringify(evidence, null, 2));
    try { fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* cleanup cannot mask measurements */ }
  }
  console.log(JSON.stringify(evidence, null, 2));
  assert.equal(evidence.fatal, null, 'harness completed');
  assert.equal(evidence.checks.length, 8, 'four pages x two viewports measured');
  for (const row of evidence.checks) {
    const label = `${row.page} ${row.viewport.width}x${row.viewport.height}`;
    assert.equal(row.fatal, undefined, `${label}: ${row.fatal || 'measured'}`);
    assert.ok(row.status === 200 || row.status === 304, `${label}: page status ${row.status}`);
    assert.equal(row.innerWidth, row.viewport.width, `${label}: viewport width`);
    assert.ok(row.documentWidth <= row.viewport.width, `${label}: document ${row.documentWidth}px exceeds viewport ${row.viewport.width}px`);
    assert.deepEqual(row.consoleErrors, [], `${label}: zero console errors`);
    assert.deepEqual(row.pageErrors, [], `${label}: zero page errors`);
    assert.deepEqual(row.cspErrors, [], `${label}: zero CSP errors`);
    assert.deepEqual(row.responseErrors, [], `${label}: zero HTTP error responses`);
  }
});

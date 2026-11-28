// Round 80: Publishing Desk (/label/publish) on real Chromium, signed out/in at phone sizes.
// Run: ROOT=/fresh/checkout OUT=/evidence node --test teams/build/proposed/publish-phone.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
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
const OUT = process.env.OUT || path.join(ROOT, 'teams/build/outputs/publish-phone');
fs.mkdirSync(OUT, { recursive: true });
const { freePort } = await import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const VIEWPORTS = [{ width: 320, height: 568 }, { width: 390, height: 844 }];

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

const evidence = { route: '/label/publish', root: ROOT, head: null, publicMain: process.env.PUBLIC_MAIN || null,
  executable: null, signup: null, checks: [], fatal: null, serverLog: '' };

test('Publishing Desk phone widths and page errors', { timeout: 120000 }, async (t) => {
  const executablePath = chromePath();
  if (!executablePath) { t.skip('No Chromium/Chrome executable installed'); return; }
  evidence.executable = executablePath;
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-phone-data-'));
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
    evidence.head = spawnSyncHead();

    // A synthetic human supplies the signed-in session. No real member data or credentials are used.
    const signupPayload = { name: `R80Phone${Date.now()}`, bio: 'isolated round 80 browser fixture',
      age: '18+', age_band: '18+', age_range: '18+', age_confirm: true, age_confirmed: true,
      age_attested: true, age_attestation: true, over_13: true, over13: true,
      is_13_or_older: true, is13OrOlder: true, confirm_13: true, confirmAge: true };
    const signup = await fetch(`${base}/api/humans`, { method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify(signupPayload) });
    const signupText = await signup.text();
    const setCookie = signup.headers.get('set-cookie');
    evidence.signup = { status: signup.status, setCookie: Boolean(setCookie), body: signupText.replace(/"login_url"\s*:\s*"[^"]*"/g, '"login_url":"[redacted]"').slice(0, 500) };
    assert.equal(signup.status, 201, 'synthetic member created');
    assert.ok(setCookie, 'synthetic member has a session cookie');
    const cookie = setCookie.split(';')[0];
    const separator = cookie.indexOf('=');
    const cookieName = cookie.slice(0, separator), cookieValue = cookie.slice(separator + 1);
    browser = await puppeteer.launch({ headless: true, executablePath,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--force-device-scale-factor=1'] });

    for (const state of ['signed-out', 'signed-in']) for (const viewport of VIEWPORTS) {
      const page = await browser.newPage();
      const row = { state, viewport, status: null, documentWidth: null, bodyWidth: null,
        controls: 0, smallControls: [], consoleErrors: [], pageErrors: [], cspErrors: [], responseErrors: [], screenshot: null };
      evidence.checks.push(row);
      page.on('console', (message) => { if (message.type() === 'error') row.consoleErrors.push(message.text()); });
      page.on('pageerror', (error) => row.pageErrors.push(String(error)));
      page.on('response', (response) => { if (response.status() >= 400) row.responseErrors.push({ status: response.status(), url: response.url() }); });
      await page.setViewport({ ...viewport, deviceScaleFactor: 1, isMobile: false });
      if (state === 'signed-in') await page.setCookie({ name: cookieName, value: cookieValue, url: base });
      try {
        const response = await page.goto(`${base}/label/publish`, { waitUntil: 'load', timeout: 25000 });
        row.status = response?.status() ?? null;
        await page.evaluate(() => document.fonts ? document.fonts.ready : Promise.resolve());
        await sleep(750);
        const measured = await page.evaluate(() => {
          const visible = (element) => {
            const style = getComputedStyle(element), rect = element.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0;
          };
          const controls = [...document.querySelectorAll('button,a[href],input,select,textarea,summary,[role="button"],[role="tab"]')].filter(visible);
          const smallControls = controls.map((element) => {
            const rect = element.getBoundingClientRect();
            const id = element.id ? `#${element.id}` : '';
            const classes = (element.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).map((x) => `.${x}`).join('');
            return { selector: `${element.tagName.toLowerCase()}${id}${classes}`.slice(0, 240),
              text: (element.getAttribute('aria-label') || element.textContent || element.getAttribute('placeholder') || element.value || '').trim().replace(/\s+/g, ' ').slice(0, 120),
              width: +rect.width.toFixed(2), height: +rect.height.toFixed(2), disabled: Boolean(element.disabled) };
          }).filter((control) => control.width < 44 || control.height < 44);
          const elements = [...document.querySelectorAll('body *')].filter(visible);
          const widest = elements.sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
          const rect = widest?.getBoundingClientRect();
          return { documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body?.scrollWidth || 0,
            innerWidth, innerHeight, controls: controls.length, smallControls,
            widest: widest ? { tag: widest.tagName, id: widest.id, class: widest.className, width: rect.width, left: rect.left, right: rect.right } : null,
            title: document.title, bodyHasFixtureName: document.body.innerText.includes(document.body.innerText.match(/R80Phone\d+/)?.[0] || '\u0000') };
        });
        Object.assign(row, measured);
        row.cspErrors = [...row.consoleErrors, ...row.pageErrors].filter((message) => /content security policy|\bcsp\b|frame-ancestors|refused to frame/i.test(message));
        const filename = `publish-phone-${state}-${viewport.width}x${viewport.height}.png`;
        await page.screenshot({ path: path.join(OUT, filename), fullPage: true });
        row.screenshot = filename;
      } catch (error) {
        row.fatal = String(error.stack || error);
      } finally { await page.close(); }
    }
  } catch (error) { evidence.fatal = String(error.stack || error); }
  finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    fs.writeFileSync(path.join(OUT, 'publish-phone-evidence.json'), JSON.stringify(evidence, null, 2));
    try { fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* cleanup cannot mask measurements */ }
  }
  console.log(JSON.stringify(evidence, null, 2));
  assert.equal(evidence.fatal, null, 'harness completed');
  assert.equal(evidence.checks.length, 4, 'two states x two viewports measured');
  for (const row of evidence.checks) {
    assert.equal(row.fatal, undefined, `${row.state} ${row.viewport.width}: ${row.fatal || 'ok'}`);
    assert.ok(row.status === 200 || row.status === 304, `${row.state} ${row.viewport.width}: page status ${row.status} (304 is a successful cache revalidation)`);
    assert.equal(row.innerWidth, row.viewport.width, `${row.state} ${row.viewport.width}: viewport width`);
    assert.ok(row.documentWidth <= row.viewport.width, `${row.state} ${row.viewport.width}: document ${row.documentWidth}px exceeds viewport ${row.viewport.width}px`);
    assert.deepEqual(row.pageErrors, [], `${row.state} ${row.viewport.width}: zero page errors`);
  }
});

function spawnSyncHead() {
  try {
    const head = fs.readFileSync(path.join(ROOT, '.git/HEAD'), 'utf8').trim();
    if (!head.startsWith('ref:')) return head;
    const ref = head.slice(4).trim();
    return fs.readFileSync(path.join(ROOT, '.git', ref), 'utf8').trim();
  } catch { return null; }
}

// Round 80: Publishing Desk phone geometry in real Chromium.
// Run from a fresh repository root with dependencies installed:
//   OUT=/path/to/evidence PUBLIC_MAIN=$(git rev-parse HEAD) node --test teams/build/proposed/publish-phone.mjs
// The harness boots an isolated test server and creates one synthetic human; it uses no real credentials.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import puppeteer from 'puppeteer-core';

const ROOT = process.env.ROOT || process.cwd();
const OUT = process.env.OUT || path.join(ROOT, 'teams/build/outputs/round80-kimi-publish-phone-evidence');
const CHROMIUM = process.env.CHROMIUM_PATH || '/usr/bin/chromium';
const viewports = [{ width: 320, height: 568 }, { width: 390, height: 844 }];

async function measure(page, base, state, viewport, cookie) {
  const row = { state, viewport, consoleErrors: [], pageErrors: [], cspErrors: [], badResponses: [] };
  page.on('console', msg => { if (msg.type() === 'error') row.consoleErrors.push(msg.text()); });
  page.on('pageerror', error => row.pageErrors.push(String(error)));
  page.on('response', response => { if (response.status() >= 400) row.badResponses.push({ status: response.status(), url: response.url() }); });
  await page.setViewport(viewport);
  if (cookie) await page.setCookie({ name: cookie.name, value: cookie.value, url: base });
  const response = await page.goto(`${base}/label/publish`, { waitUntil: 'networkidle0', timeout: 30000 });
  row.status = response?.status();
  row.url = page.url();
  row.title = await page.title();
  await page.waitForSelector('#pub-calc', { visible: true, timeout: 15000 });
  Object.assign(row, await page.evaluate(() => {
    const nodes = [...new Set([...document.querySelectorAll('a[href],button,input,select,textarea,summary,[role="button"],[tabindex]:not([tabindex="-1"])')])];
    const visible = nodes.filter(el => {
      const r = el.getBoundingClientRect(), s = getComputedStyle(el);
      return !el.disabled && r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
    });
    function selector(el) {
      if (el.id) return `#${CSS.escape(el.id)}`;
      let out = el.tagName.toLowerCase();
      if (el.getAttribute('name')) out += `[name=${JSON.stringify(el.getAttribute('name'))}]`;
      if (el.getAttribute('type')) out += `[type=${JSON.stringify(el.getAttribute('type'))}]`;
      if (el.classList.length) out += '.' + [...el.classList].slice(0, 3).map(CSS.escape).join('.');
      if (el.parentElement) {
        const siblings = [...el.parentElement.children].filter(x => x.tagName === el.tagName);
        if (siblings.length > 1) out += `:nth-of-type(${siblings.indexOf(el) + 1})`;
      }
      return out;
    }
    return {
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body?.scrollWidth ?? null,
      viewportWidth: innerWidth,
      controlsMeasured: visible.length,
      smallControls: visible.map(el => {
        const r = el.getBoundingClientRect();
        return { selector: selector(el), text: (el.getAttribute('aria-label') || el.textContent || el.value || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 120), width: +r.width.toFixed(2), height: +r.height.toFixed(2) };
      }).filter(x => x.width < 44 || x.height < 44),
    };
  }));
  row.cspErrors = [...row.consoleErrors, ...row.pageErrors].filter(x => /content security policy|\bcsp\b|frame-ancestors|refused to frame/i.test(x));
  await page.screenshot({ path: path.join(OUT, `publish-${state}-${viewport.width}x${viewport.height}.png`), fullPage: true });
  return row;
}

test('Publishing Desk signed out/in at 320 and 390: width and page errors', { timeout: 120000 }, async () => {
  await fs.mkdir(OUT, { recursive: true });
  const port = 9600 + Math.floor(Math.random() * 300);
  const base = `http://127.0.0.1:${port}`;
  const data = await fs.mkdtemp(path.join(os.tmpdir(), 'cohabi-r80-publish-'));
  let serverLog = '', browser;
  const server = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, COMMONS_PORT: String(port), PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'test', COMMONS_DATA: data, TEST_MODE: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  server.stdout.on('data', d => { serverLog += d; });
  server.stderr.on('data', d => { serverLog += d; });
  const evidence = { head: process.env.PUBLIC_MAIN || null, base, chromium: CHROMIUM, checks: [], failures: [], serverLog: '' };
  try {
    const deadline = Date.now() + 25000;
    while (true) {
      try { if ((await fetch(`${base}/label/publish`)).status === 200) break; } catch {}
      if (Date.now() > deadline) throw new Error(`server boot timeout\n${serverLog}`);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    const signupPayload = { name: `R80Human${Date.now()}`, bio: 'isolated round 80 browser fixture', age: '18+', age_band: '18+', age_range: '18+', age_confirm: true, age_confirmed: true, age_attested: true, age_attestation: true, over_13: true, over13: true, is_13_or_older: true, is13OrOlder: true, confirm_13: true, confirmAge: true };
    const signup = await fetch(`${base}/api/humans`, { method: 'POST', headers: { 'content-type': 'application/json', 'X-Commons': '1' }, body: JSON.stringify(signupPayload) });
    const signupText = await signup.text();
    const setCookie = signup.headers.get('set-cookie');
    evidence.signup = { status: signup.status, setCookie: Boolean(setCookie), body: signupText.replace(/"login_url"\s*:\s*"[^"]*"/, '"login_url":"[redacted test fixture]"') };
    assert.equal(signup.status, 201, `synthetic sign-up: ${signup.status} ${signupText}`);
    assert.ok(setCookie, 'synthetic sign-up must return a cookie');
    const pair = setCookie.split(';')[0], split = pair.indexOf('=');
    const cookie = { name: pair.slice(0, split), value: pair.slice(split + 1) };

    browser = await puppeteer.launch({ headless: true, executablePath: CHROMIUM, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    for (const state of ['signed-out', 'signed-in']) for (const viewport of viewports) {
      const page = await browser.newPage();
      try {
        const row = await measure(page, base, state, viewport, state === 'signed-in' ? cookie : null);
        evidence.checks.push(row);
        if (row.status !== 200) evidence.failures.push(`${state} ${viewport.width}: HTTP ${row.status}`);
        if (row.documentWidth > viewport.width) evidence.failures.push(`${state} ${viewport.width}: document ${row.documentWidth}px > viewport ${viewport.width}px`);
        if (row.pageErrors.length) evidence.failures.push(`${state} ${viewport.width}: ${row.pageErrors.length} page error(s)`);
      } catch (error) {
        evidence.failures.push(`${state} ${viewport.width}: ${error.stack || error}`);
      } finally { await page.close(); }
    }
  } catch (error) {
    evidence.failures.push(`fatal: ${error.stack || error}`);
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
    evidence.serverLog = serverLog.slice(-20000);
    await fs.writeFile(path.join(OUT, 'publish-phone-evidence.json'), JSON.stringify(evidence, null, 2));
    await fs.rm(data, { recursive: true, force: true });
  }
  console.log(JSON.stringify(evidence, null, 2));
  assert.deepEqual(evidence.failures, [], 'Publishing Desk phone checks');
});

// Round 76: real-Chromium review of Work Hub on a fresh main checkout.
// Run with OUT set. The caller supplies an isolated ROOT copy if desired.
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';

const ROOT = process.env.ROOT || process.cwd();
const OUT = process.env.OUT || process.cwd();
await fs.mkdir(OUT, { recursive: true });
const port = 9200 + Math.floor(Math.random() * 500);
const base = `http://127.0.0.1:${port}`;
const data = await fs.mkdtemp(path.join(os.tmpdir(), 'cohabi-r76-data-'));
let log = '';
const server = spawn(process.execPath, ['commons/server.mjs'], {
  cwd: ROOT,
  env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'test', COMMONS_DATA: data, TEST_MODE: '1' },
  stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', d => { log += d; });
server.stderr.on('data', d => { log += d; });
let browser;
const evidence = { base, root: ROOT, head: null, checks: [], serverLog: null };
try {
  const deadline = Date.now() + 25000;
  while (!log.includes(`http://127.0.0.1:${port}`) && !log.includes(`http://localhost:${port}`)) {
    if (Date.now() > deadline) throw new Error(`server boot timeout\n${log}`);
    await new Promise(r => setTimeout(r, 100));
  }
  try { evidence.head = (await fs.readFile(path.join(ROOT, '.git/HEAD'), 'utf8')).trim(); } catch {}
  const signup = await fetch(`${base}/api/signup`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: `R76Human${Date.now()}`, password: 'r76-browser-only-pass', password_confirm: 'r76-browser-only-pass' })
  });
  const signupText = await signup.text();
  evidence.signup = { status: signup.status, body: signupText };
  const setCookie = signup.headers.get('set-cookie');
  if (signup.status !== 201 || !setCookie) throw new Error(`signup ${signup.status}: ${signupText}\n${log}`);
  const cookie = setCookie.split(';')[0];
  const cookieName = cookie.split('=')[0];
  const cookieValue = cookie.slice(cookieName.length + 1);
  const jsonHeaders = { 'content-type': 'application/json', cookie, 'X-Commons': '1' };
  const suffix = `R76TOKEN${Date.now()}`;
  const seeds = [
    { title: `${suffix} general alpha`, deliverable: 'isolated browser evidence alpha', why: 'round 76 synthetic fixture', room: 'general' },
    { title: `${suffix} build beta`, deliverable: 'isolated browser evidence beta', why: 'round 76 synthetic fixture', room: 'build' }
  ];
  evidence.seeds = [];
  for (const task of seeds) {
    const r = await fetch(`${base}/api/desk/tasks`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(task) });
    const text = await r.text();
    evidence.seeds.push({ request: task, status: r.status, body: text });
    if (r.status !== 201) throw new Error(`task seed ${r.status}: ${text}`);
  }

  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    const label = `${vp.width}x${vp.height}`;
    const context = await browser.newContext({ viewport: vp });
    await context.addCookies([{ name: cookieName, value: cookieValue, url: base }]);
    const page = await context.newPage();
    const row = { viewport: vp, console: [], pageErrors: [], badResponses: [], transitions: [], memberLinks: [], tapSmall: [] };
    evidence.checks.push(row);
    page.on('console', m => { if (m.type() === 'error') row.console.push(m.text()); });
    page.on('pageerror', e => row.pageErrors.push(String(e)));
    page.on('response', r => { if (r.status() >= 400) row.badResponses.push({ status: r.status(), url: r.url() }); });
    const response = await page.goto(`${base}/headquarters`, { waitUntil: 'networkidle' });
    row.headquartersStatus = response?.status();
    row.headquartersTitle = await page.title();
    assert.equal(row.headquartersStatus, 200, `${label} /headquarters must load`);
    await page.locator('#hq-workhub-launch').click();
    await page.locator('#hq-workhub-panel').waitFor({ state: 'visible' });
    await page.locator('#hw-main .hw-overview-header').waitFor({ state: 'visible', timeout: 15000 });
    row.signedIn = await page.evaluate(() => ({ meText: document.body.innerText.includes('R76Human'), width: document.documentElement.scrollWidth }));

    const hubState = () => page.evaluate(() => {
      const root = document.querySelector('#hq-workhub');
      const panel = document.querySelector('#hq-workhub-panel');
      const r = panel.getBoundingClientRect();
      return { hidden: panel.hidden, full: root.classList.contains('hw-full'), pressed: document.querySelector('#hw-max').getAttribute('aria-pressed'), rect: { x: r.x, y: r.y, width: r.width, height: r.height }, docWidth: document.documentElement.scrollWidth, viewport: innerWidth };
    });
    row.transitions.push({ state: 'opened', ...(await hubState()) });
    // Exercise both directions regardless of the default: collapse, Expand, close/reopen.
    if ((await hubState()).full) {
      await page.locator('#hw-max').click();
      await page.waitForFunction(() => !document.querySelector('#hq-workhub').classList.contains('hw-full'));
      row.transitions.push({ state: 'collapsed', ...(await hubState()) });
    }
    await page.locator('#hw-max').click();
    await page.waitForFunction(() => document.querySelector('#hq-workhub').classList.contains('hw-full'));
    row.transitions.push({ state: 'expanded', ...(await hubState()) });
    await page.locator('#hw-close').click();
    await page.locator('#hq-workhub-panel').waitFor({ state: 'hidden' });
    row.transitions.push({ state: 'closed', ...(await hubState()) });
    await page.locator('#hq-workhub-launch').click();
    await page.locator('#hq-workhub-panel').waitFor({ state: 'visible' });
    row.transitions.push({ state: 'reopened', ...(await hubState()) });
    if (!(await hubState()).full) {
      await page.locator('#hw-max').click();
      await page.waitForFunction(() => document.querySelector('#hq-workhub').classList.contains('hw-full'));
    }

    await page.locator('[data-hw-tab="work"]').click();
    await page.locator('.hw-results .hw-card').first().waitFor({ state: 'visible' });
    row.workInitial = await page.locator('.hw-results').innerText();
    row.workHasBothSeeds = await page.evaluate(s => document.querySelector('.hw-results').innerText.includes(s[0].title) && document.querySelector('.hw-results').innerText.includes(s[1].title), seeds);
    await page.getByRole('searchbox', { name: 'Search tasks' }).fill(suffix + ' general alpha');
    await page.waitForFunction(title => {
      const cards = [...document.querySelectorAll('.hw-results .hw-card')];
      return cards.length === 1 && cards[0].innerText.includes(title);
    }, seeds[0].title);
    row.workFiltered = { cards: await page.locator('.hw-results .hw-card').count(), text: await page.locator('.hw-results').innerText() };

    await page.locator('[data-hw-tab="people"]').click();
    await page.locator('.hw-results .hw-person').first().waitFor({ state: 'visible' });
    row.membersCount = await page.locator('.hw-results .hw-person').count();
    const hrefs = await page.locator('.hw-results .hw-person a[href]').evaluateAll(as => [...new Set(as.map(a => a.href))]);
    for (const href of hrefs) {
      const r = await context.request.get(href);
      row.memberLinks.push({ href, status: r.status() });
    }

    await page.locator('[data-hw-tab="rooms"]').click();
    await page.locator('.hw-room-choice').first().waitFor({ state: 'visible' });
    const generalChoice = page.locator('.hw-room-choice').filter({ hasText: 'General Hall' }).first();
    await generalChoice.click();
    await page.locator('#hw-main h2').filter({ hasText: 'General Hall' }).waitFor({ state: 'visible' });
    row.roomOpened = await page.locator('#hw-main').innerText();
    await page.locator('[data-hw-tab="work"]').click();
    await page.getByRole('searchbox', { name: 'Search tasks' }).waitFor({ state: 'visible' });
    await page.locator('[data-hw-tab="rooms"]').click();
    await page.locator('#hw-main h2').filter({ hasText: 'General Hall' }).waitFor({ state: 'visible' });
    row.roomAfterTab = await page.locator('#hw-main').innerText();
    row.roomRetained = row.roomAfterTab.includes(seeds[0].title) && !row.roomAfterTab.includes(seeds[1].title);

    await page.locator('[data-hw-tab="messages"]').click();
    const frame = page.locator('iframe.hw-messenger');
    await frame.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const f = document.querySelector('iframe.hw-messenger');
      return f && f.src.endsWith('/messenger') && f.contentDocument && f.contentDocument.readyState === 'complete';
    });
    row.messenger = await frame.evaluate(f => ({ src: f.src, title: f.title, readyState: f.contentDocument?.readyState, bodyLength: f.contentDocument?.body?.innerText.length }));
    row.cspErrors = [...row.console, ...row.pageErrors].filter(x => /content security policy|\bcsp\b|frame-ancestors|refused to frame/i.test(x));

    // Re-open Overview so all chrome controls and content controls are included in one measurement.
    await page.locator('[data-hw-tab="overview"]').click();
    await page.locator('.hw-overview-header').waitFor({ state: 'visible' });
    row.tapSmall = await page.locator('#hq-workhub').evaluate(root => [...root.querySelectorAll('button,a[href],input,select,textarea,[role="button"]')].filter(e => {
      const s = getComputedStyle(e), r = e.getBoundingClientRect();
      return !e.disabled && s.display !== 'none' && s.visibility !== 'hidden' && r.width > 0 && r.height > 0;
    }).map(e => {
      const r = e.getBoundingClientRect();
      return { tag: e.tagName, id: e.id, text: (e.getAttribute('aria-label') || e.textContent || e.getAttribute('placeholder') || '').trim().slice(0, 100), width: +r.width.toFixed(2), height: +r.height.toFixed(2) };
    }).filter(x => x.width < 44 || x.height < 44));
    row.finalDoc = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth, full: document.querySelector('#hq-workhub').classList.contains('hw-full') }));
    await page.screenshot({ path: path.join(OUT, `workhub-main-${vp.width}.png`), fullPage: true });
    await context.close();
  }
} catch (e) {
  evidence.fatal = String(e.stack || e);
} finally {
  evidence.serverLog = log.slice(-20000);
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await fs.writeFile(path.join(OUT, 'round76-workhub-main.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  await fs.rm(data, { recursive: true, force: true });
}
if (evidence.fatal) process.exitCode = 1;

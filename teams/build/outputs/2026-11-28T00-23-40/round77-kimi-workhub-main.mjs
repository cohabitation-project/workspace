// Round 77: real-Chromium review of Work Hub on a fresh main checkout.
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
const data = await fs.mkdtemp(path.join(os.tmpdir(), 'cohabi-r77-data-'));
let log = '';
const server = spawn(process.execPath, ['commons/server.mjs'], {
  cwd: ROOT,
  env: { ...process.env, COMMONS_PORT: String(port), PORT: String(port), HOST: '127.0.0.1', NODE_ENV: 'test', COMMONS_DATA: data, TEST_MODE: '1' },
  stdio: ['ignore', 'pipe', 'pipe']
});
server.stdout.on('data', d => { log += d; });
server.stderr.on('data', d => { log += d; });
let browser;
const evidence = { base, root: ROOT, head: null, publicMain: process.env.PUBLIC_MAIN || null, checks: [], serverLog: null };
try {
  const deadline = Date.now() + 25000;
  while (!log.includes(`http://127.0.0.1:${port}`) && !log.includes(`http://localhost:${port}`)) {
    if (Date.now() > deadline) throw new Error(`server boot timeout\n${log}`);
    await new Promise(r => setTimeout(r, 100));
  }
  try { evidence.head = (await fs.readFile(path.join(ROOT, '.git/HEAD'), 'utf8')).trim(); } catch {}
  const signupPayload = { name:`R77Human${Date.now()}`, bio:'isolated round 77 browser fixture', age:'18+', age_band:'18+', age_range:'18+', age_confirm:true, age_confirmed:true, age_attested:true, age_attestation:true, over_13:true, over13:true, is_13_or_older:true, is13OrOlder:true, confirm_13:true, confirmAge:true };
  const signup = await fetch(`${base}/api/humans`, { method:'POST', headers:{'content-type':'application/json','X-Commons':'1'}, body:JSON.stringify(signupPayload) });
  const signupText = await signup.text();
  const setCookie = signup.headers.get('set-cookie');
  let publicSignupBody = signupText;
  try { const parsed=JSON.parse(signupText); delete parsed.login_url; publicSignupBody=JSON.stringify(parsed); } catch {}
  evidence.signup = { route:'/api/humans', request:{...signupPayload}, status:signup.status, body:publicSignupBody, setCookie:!!setCookie };
  if (signup.status !== 201 || !setCookie) throw new Error(`no signed-in test member: ${signup.status} ${publicSignupBody}`);
  const cookie = setCookie.split(';')[0];
  const cookieName = cookie.split('=')[0];
  const cookieValue = cookie.slice(cookieName.length + 1);
  const jsonHeaders = { 'content-type': 'application/json', cookie, 'X-Commons': '1' };
  const suffix = `R77TOKEN${Date.now()}`;
  const seeds = [
    { title: `${suffix} general alpha`, deliverable: 'isolated browser evidence alpha', why: 'round 77 synthetic fixture', room: 'general' },
    { title: `${suffix} build beta`, deliverable: 'isolated browser evidence beta', why: 'round 77 synthetic fixture', room: 'build' }
  ];
  evidence.seeds = [];
  for (const task of seeds) {
    const r = await fetch(`${base}/api/desk`, { method: 'POST', headers: jsonHeaders, body: JSON.stringify(task) });
    const text = await r.text();
    evidence.seeds.push({ request: task, status: r.status, body: text });
    if (r.status !== 201) console.error(`task seed setup failed ${r.status}: ${text}`);
  }

  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  for (const routePath of ['/headquarters','/hub']) for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 800 }]) {
    const label = `${vp.width}x${vp.height}`;
    const context = await browser.newContext({ viewport: vp });
    await context.addCookies([{ name: cookieName, value: cookieValue, url: base }]);
    const page = await context.newPage();
    const row = { routePath, viewport: vp, console: [], pageErrors: [], badResponses: [], transitions: [], memberLinks: [], tapSmall: [] };
    evidence.checks.push(row);
    try {
    page.on('console', m => { if (m.type() === 'error') row.console.push(m.text()); });
    page.on('pageerror', e => row.pageErrors.push(String(e)));
    page.on('response', r => { if (r.status() >= 400) row.badResponses.push({ status: r.status(), url: r.url() }); });
    const response = await page.goto(`${base}${routePath}`, { waitUntil: 'networkidle' });
    row.headquartersStatus = response?.status();
    row.headquartersTitle = await page.title();
    assert.equal(row.headquartersStatus, 200, `${label} /headquarters must load`);
    if (routePath === '/headquarters') await page.locator('#hq-workhub-launch').click();
    await page.locator('#hq-workhub-panel').waitFor({ state: 'visible' });
    await page.locator('#hw-main .hw-overview-header').waitFor({ state: 'visible', timeout: 15000 });
    row.signedIn = await page.evaluate(() => ({ meText: document.body.innerText.includes('R77Human'), width: document.documentElement.scrollWidth }));

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
    if (routePath === '/headquarters') {
      await page.locator('#hw-close').click();
      await page.locator('#hq-workhub-panel').waitFor({ state: 'hidden' });
      row.transitions.push({ state: 'closed', ...(await hubState()) });
      await page.locator('#hq-workhub-launch').click();
      await page.locator('#hq-workhub-panel').waitFor({ state: 'visible' });
      row.transitions.push({ state: 'reopened', ...(await hubState()) });
    }
    if (!(await hubState()).full) {
      await page.locator('#hw-max').click();
      await page.waitForFunction(() => document.querySelector('#hq-workhub').classList.contains('hw-full'));
    }

    await page.locator('[data-hw-tab="work"]').click();
    await page.locator('.hw-results .hw-card').first().waitFor({ state: 'visible' });
    row.workInitial = await page.locator('.hw-results').innerText();
    row.workHasBothSeeds = await page.evaluate(s => document.querySelector('.hw-results').innerText.includes(s[0].title) && document.querySelector('.hw-results').innerText.includes(s[1].title), seeds);
    if (evidence.seeds.every(x => x.status === 201)) {
      await page.getByRole('searchbox', { name: 'Search tasks' }).fill(suffix + ' general alpha');
      await page.waitForFunction(title => {
        const cards = [...document.querySelectorAll('.hw-results .hw-card')];
        return cards.length === 1 && cards[0].innerText.includes(title);
      }, seeds[0].title);
      row.workFiltered = { cards: await page.locator('.hw-results .hw-card').count(), text: await page.locator('.hw-results').innerText() };
    } else row.workFiltered = { skipped:'synthetic task setup did not return 201; see evidence.seeds' };

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
    row.roomRetained = evidence.seeds.every(x => x.status === 201) ? (row.roomAfterTab.includes(seeds[0].title) && !row.roomAfterTab.includes(seeds[1].title)) : 'UNVERIFIED: synthetic tasks not seeded';

    await page.locator('[data-hw-tab="messages"]').click();
    const frame = page.locator('iframe.hw-messenger');
    await frame.waitFor({ state: 'visible' });
    await page.waitForTimeout(1800);
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
    await page.screenshot({ path: path.join(OUT, `round77-workhub-${routePath.slice(1)}-${vp.width}.png`), fullPage: true });
    await context.close();
    } catch (viewportError) { row.fatal = String(viewportError.stack || viewportError); try { await context.close(); } catch {} }
  }
} catch (e) {
  evidence.fatal = String(e.stack || e);
} finally {
  evidence.serverLog = log.slice(-20000);
  if (browser) await browser.close();
  server.kill('SIGTERM');
  await fs.writeFile(path.join(OUT, 'round77-workhub-main.json'), JSON.stringify(evidence, null, 2));
  console.log(JSON.stringify(evidence, null, 2));
  await fs.rm(data, { recursive: true, force: true });
}
if (evidence.fatal) process.exitCode = 1;

// 0ural1 (round 65): hearts and playlists follow a signed-in member to any device (app.js merge + debounced PUT).
// Real Chromium against an isolated server. Signed in: heart a track in one browser context, a second context for the
// same member shows it hearted after load; a list made in one shows on the other. Signed out: no PUT is ever sent.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as auth from '../lib/auth.mjs';
import * as store from '../lib/store.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const { freePort } = await import(pathToFileURL(path.join(ROOT, 'commons/test/lib/port.mjs')).href);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let chromium = null;
try { chromium = createRequire(import.meta.url)('playwright').chromium; } catch { /* reported as a skip below */ }

test('0ural1 hearts and playlists follow the member to a second browser; signed out sends no PUT', { timeout: 100000 }, async (t) => {
  if (!chromium) { t.skip('playwright is not installed here; the browser sync was not measured.'); return; }
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ourall-sync-'));
  const port = await freePort();
  const B = `http://127.0.0.1:${port}`;
  store.init(dataDir);
  const member = store.addMember({ id: 'h_ourall_sync_seed', name: 'Sync Seed', kind: 'human' });
  const pair = auth.sessionCookie(member.id, false, member.sessionVersion || 0).split(';', 1)[0];
  const cookie = { name: pair.slice(0, pair.indexOf('=')), value: pair.slice(pair.indexOf('=') + 1), url: B, httpOnly: true, sameSite: 'Strict' };
  const server = spawn(process.execPath, ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: dataDir, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1' }, stdio: 'ignore' });
  let browser;
  try {
    let ready = false;
    for (let i = 0; i < 120 && !ready; i++) { try { ready = (await fetch(`${B}/api/petition`)).ok; } catch { await sleep(200); } }
    assert.ok(ready, 'isolated server is up');
    browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});

    const open = async (signedIn) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      if (signedIn) await ctx.addCookies([cookie]);
      const page = await ctx.newPage();
      const puts = []; const errors = [];
      page.on('request', (r) => { if (r.method() === 'PUT' && new URL(r.url()).pathname === '/api/me/0ural1') puts.push(r.postData()); });
      page.on('pageerror', (e) => errors.push(e.message));
      // Set up BEFORE goto: the account read is what hydrate() merges from; wait for it, not for the clock.
      const account = signedIn ? page.waitForResponse((r) => new URL(r.url()).pathname === '/api/me/0ural1' && r.request().method() === 'GET', { timeout: 20000 }) : null;
      await page.goto(`${B}/0ural1`);
      await page.waitForSelector('#ou-main');
      return { ctx, page, puts, errors, account };
    };
    // Pretend the tab went to the background: app.js flushes pending changes at once (keepalive PUT) on visibilitychange.
    const hideTab = (page) => page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    // The page says the account keeps the hearts only after hydrate() has merged; that line is the signal to act.
    const keptOnAccount = async (page) => {
      await page.evaluate(() => { location.hash = '#/liked'; });
      await page.waitForFunction(() => /kept on your account/.test(document.querySelector('.ou-h p')?.innerText || ''), null, { timeout: 20000 });
    };
    const firstUrl = async (page) => page.evaluate(() => JSON.parse(document.getElementById('ou-main').dataset.catalog)[0].tracks[0].url);

    // --- signed in, first browser: heart a track and make a list
    const A = await open(true);
    const url = await firstUrl(A.page);
    assert.match(url, /^\/label\/files\//, 'the page carries a catalog track');
    await A.account; // the account read answered
    await keptOnAccount(A.page); // ...and was merged (acct.on is true)
    await A.page.evaluate(() => { location.hash = '#/songs'; });
    await A.page.waitForSelector('.ou-like');
    await A.page.locator(`[data-like="${url}"]`).first().click();
    await A.page.evaluate(() => { location.hash = '#/playlists'; });
    await A.page.fill('#ou-newname', 'Morning');
    await A.page.click('#ou-newlist button[type=submit]');
    const saved = await fetch(`${B}/api/me/0ural1`, { headers: { cookie: pair } }).then((r) => r.json());
    for (let i = 0; i < 40 && !(saved.liked || []).length; i++) { await sleep(250); Object.assign(saved, await fetch(`${B}/api/me/0ural1`, { headers: { cookie: pair } }).then((r) => r.json())); }
    assert.deepEqual(saved.liked, [url], 'the heart reached the account within the debounce');
    assert.ok(saved.lists.some((l) => l.name === 'Morning' && Array.isArray(l.tracks) && !('id' in l)), 'the playlist reached the account by name only');
    assert.ok(A.puts.length >= 1, 'a PUT was sent');
    assert.equal(A.errors.length, 0, `no page errors (${A.errors})`);

    // --- signed in, a second context (another device): it shows the heart and the list after load
    const C = await open(true);
    await C.account;
    await keptOnAccount(C.page);
    await C.page.waitForFunction((u) => { try { return JSON.parse(localStorage.getItem('ou1')).liked.includes(u); } catch { return false; } }, url, { timeout: 15000 });
    await C.page.evaluate(() => { location.hash = '#/liked'; });
    await C.page.waitForSelector(`[data-like="${url}"][aria-pressed="true"]`, { timeout: 10000 });
    assert.match(await C.page.locator('.ou-h p').first().innerText(), /kept on your account/, 'the liked page says the account keeps it');
    await C.page.evaluate(() => { location.hash = '#/playlists'; });
    await C.page.waitForSelector('text=Morning', { timeout: 10000 });
    await sleep(2200); // a merge that changes nothing must not send anything back
    await hideTab(C.page); // ...and neither may the hidden-tab flush, which skips the debounce (duration probes keep resetting it)
    await sleep(500);
    assert.equal(C.puts.length, 0, 'loading the same data on a second device sends no PUT');
    assert.equal(C.errors.length, 0, `no page errors (${C.errors})`);

    // --- signed out: the heart stays local and no PUT is sent
    const S = await open(false);
    await S.page.evaluate(() => { location.hash = '#/songs'; });
    await S.page.waitForSelector('.ou-like');
    await S.page.locator(`[data-like="${url}"]`).first().click();
    await sleep(2500);
    // The 1.5 s debounce is reset by every save(), and signed-out duration probes call save() for a long while, so waiting
    // alone can miss a stray PUT. The hidden-tab flush sends at once if anything would send, so it makes the check real.
    await hideTab(S.page);
    await sleep(800);
    assert.equal(S.puts.length, 0, `signed out must send no PUT /api/me/0ural1 at all (saw ${S.puts.length}: ${S.puts.join(' | ').slice(0, 120)})`);
    assert.ok(await S.page.evaluate((u) => JSON.parse(localStorage.getItem('ou1')).liked.includes(u), url), 'the heart is kept in this browser');
    await S.page.evaluate(() => { location.hash = '#/liked'; });
    assert.match(await S.page.locator('.ou-h p').first().innerText(), /kept in this browser/, 'signed out still says this browser');
    assert.equal(S.errors.length, 0, `no page errors (${S.errors})`);
  } finally {
    await browser?.close();
    server.kill('SIGKILL');
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
});

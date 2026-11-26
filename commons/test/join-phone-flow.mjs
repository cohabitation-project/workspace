#!/usr/bin/env node
// Real 390x844 browser check of the public profile-creation flow on an isolated Commons server.
// node commons/test/join-phone-flow.mjs [evidence-directory]
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';

const { chromium } = createRequire(import.meta.url)('playwright');
const root = path.resolve(import.meta.dirname, '../..');
const out = path.resolve(process.argv[2] || '/tmp/join-phone-flow');
fs.mkdirSync(out, { recursive: true });
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'join-phone-'));
const port = await new Promise((resolve) => {
  const server = net.createServer();
  server.listen(0, '127.0.0.1', () => { const p = server.address().port; server.close(() => resolve(p)); });
});
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['commons/server.mjs'], {
  cwd: root,
  env: { ...process.env, COMMONS_DATA: data, ASHRAM_PORT: String(port), COMMONS_FAKE_LLM: '1', OPENROUTER_API_KEY: '', LLM_API_KEY: '', COMMONS_NO_SPEND_POLL: '1' },
  stdio: 'ignore',
});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    try { if ((await fetch(`${base}/api/rooms`)).ok) { ready = true; break; } } catch { /* booting */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, 'isolated Commons server starts');
  browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const errors = [];
  const responses = [];
  const apiPosts = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 500) responses.push(`${response.status()} ${new URL(response.url()).pathname}`); });
  page.on('request', (request) => { if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/humans') apiPosts.push(request.url()); });

  const join = await page.goto(`${base}/join`);
  assert.equal(join.status(), 200, 'signed-out /join responds 200');
  await page.locator('#human-form').waitFor({ state: 'visible' });
  const make = page.locator('#human-form button[type="submit"]');
  const rect = await make.boundingBox();
  assert.ok(rect && rect.height >= 44, `profile submit target is >=44px (measured ${rect?.height ?? 'missing'}px)`);
  console.log(`STEP /join GET ${join.status()} viewport=390x844 submit-height=${rect.height}px`);

  const name = page.locator('#human-form input[name="name"]');
  await name.fill('');
  await make.click();
  const invalid = await name.evaluate((el) => ({ valid: el.checkValidity(), message: el.validationMessage, report: el.reportValidity() }));
  assert.equal(invalid.valid, false, 'empty name is rejected by native required validation');
  assert.ok(invalid.message, 'browser exposes a form validation message for the empty name');
  assert.equal(apiPosts.length, 0, 'empty name does not submit a request');
  assert.equal(new URL(page.url()).pathname, '/join', 'empty submission stays on the form');
  await page.screenshot({ path: path.join(out, 'join-empty-name-390.png'), fullPage: true });
  console.log(`STEP /join empty name: blocked locally; validation-message-present=${Boolean(invalid.message)}; POST /api/humans=0`);

  const personName = 'Phone Flow Test';
  await name.fill(personName);
  const createResponse = page.waitForResponse((response) => new URL(response.url()).pathname === '/api/humans' && response.request().method() === 'POST');
  await make.click();
  const created = await createResponse;
  assert.equal(created.status(), 201, 'profile create API responds 201');
  const payload = await created.json();
  const memberId = payload?.member?.id;
  assert.ok(memberId, 'create response includes the synthetic profile id');
  await page.locator('#login-once').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#human-form').isHidden(), true, 'successful form is hidden');
  assert.equal(new URL(page.url()).pathname, '/join', 'the implemented UI stays on /join and displays the one-time login link');
  console.log(`STEP POST /api/humans ${created.status()} page remains ${new URL(page.url()).pathname}`);

  const profile = await page.goto(`${base}/m/${encodeURIComponent(memberId)}`);
  assert.equal(profile.status(), 200, 'new member profile responds 200');
  assert.match(await page.locator('body').innerText(), new RegExp(personName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), 'new profile displays submitted name');
  console.log(`STEP GET /m/${memberId} ${profile.status()} submitted-name-visible=true`);
  await page.screenshot({ path: path.join(out, 'join-created-profile-390.png'), fullPage: true });
  assert.deepEqual(responses, [], 'no 5xx responses');
  assert.deepEqual(errors, [], 'no browser page errors');
  console.log(`PASS: /join phone flow at 390x844; evidence=${out}`);
} finally {
  await browser?.close();
  server.kill();
  fs.rmSync(data, { recursive: true, force: true });
}

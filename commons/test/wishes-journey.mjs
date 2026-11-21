// End-to-end wish journey: add -> listed -> offer -> owner sees offer -> close.
// The assigned privacy expectation is that a signed-out visitor sees the wish but not B's private offer note.
// Current implementation appears to make help text public (wishes.mjs says "it is public" and wishpage renders
// every offer), so the final test is intentionally a guard that may fail until the product's privacy decision is
// reconciled. This test changes no production behavior.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';
import { promote } from './lib/promote.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'wishes-journey-'));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function freePort() {
  const server = net.createServer();
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
  return String(port);
}
const port = await freePort();
const B = `http://127.0.0.1:${port}`;
let server;
let owner;
let helper;
let wish;
const PRIVATE_NOTE = 'SYNTHETIC_PRIVATE_HELP_NOTE_9c3e';
let requestNo = 1;

async function call(url, body, headers = {}, method = 'POST') {
  const response = await fetch(`${B}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-Commons': '1', 'X-Forwarded-For': `192.0.2.${requestNo++}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    redirect: 'manual'
  });
  return { status: response.status, headers: response.headers, json: await response.json().catch(() => ({})), text: await response.text().catch(() => '') };
}
const page = async (url) => {
  const response = await fetch(`${B}${url}`);
  return { status: response.status, text: await response.text() };
};

before(async () => {
  server = spawn('node', ['commons/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, COMMONS_PORT: port, COMMONS_REPO: ROOT, COMMONS_DATA: data, COMMONS_MESSAGES_PER_MIN: '100', COMMONS_FLOOD_MESSAGES: '100' },
    stdio: 'ignore'
  });
  let ready = false;
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`${B}/healthz`)).ok) { ready = true; break; } } catch { /* server starting */ }
    await sleep(250);
  }
  assert.ok(ready, 'isolated Commons server becomes ready');
  async function join(name) {
    const result = await call('/api/join', { name, model: 'test-model', operator: `test-${name}` });
    assert.equal(result.status, 201, `join ${name}: ${JSON.stringify(result.json)}`);
    await promote(B, data, result.json.member.id);
    return { id: result.json.member.id, auth: { Authorization: `Bearer ${result.json.token}` } };
  }
  owner = await join('WishOwner');
  helper = await join('WishHelper');
});

after(async () => {
  if (server && server.exitCode === null) { server.kill('SIGTERM'); await sleep(250); }
  fs.rmSync(data, { recursive: true, force: true });
});

test('A posts a wish and it is listed immediately without an approval step', async () => {
  const added = await call('/api/wishes', { title: 'Journey test wish', why: 'Exercise the real wish flow', kind: 'other' }, owner.auth);
  assert.equal(added.status, 201, JSON.stringify(added.json));
  assert.equal(added.json.status, 'listed');
  wish = added.json;
  const listing = await page('/wishlist');
  assert.equal(listing.status, 200);
  assert.match(listing.text, /Journey test wish/);
  assert.doesNotMatch(listing.text, /Approve|waiting for approval/i);
});

test('B can offer help and A can see the offer', async () => {
  const offered = await call(`/api/wishes/${wish.id}/help`, { text: PRIVATE_NOTE }, helper.auth);
  assert.equal(offered.status, 201, JSON.stringify(offered.json));
  const ownerList = await page('/wishlist');
  assert.equal(ownerList.status, 200);
  assert.match(ownerList.text, /Journey test wish/);
  assert.match(ownerList.text, new RegExp(PRIVATE_NOTE));
});

test('A, as wish owner, closes the wish as fulfilled', async () => {
  const closed = await call(`/api/wishes/${wish.id}/close`, { status: 'fulfilled' }, owner.auth);
  assert.equal(closed.status, 200, JSON.stringify(closed.json));
  assert.equal(closed.json.status, 'fulfilled');
  const listing = await page('/wishlist');
  assert.match(listing.text, /Fulfilled/);
});

test('signed-out visitors see the wish but not B\'s private offer note', async () => {
  const listing = await page('/wishlist');
  assert.equal(listing.status, 200);
  assert.match(listing.text, /Journey test wish/);
  // Privacy boundary required by this job. If this fails, the current public-Q&A behavior is measured, not fixed here.
  assert.doesNotMatch(listing.text, new RegExp(PRIVATE_NOTE));
});

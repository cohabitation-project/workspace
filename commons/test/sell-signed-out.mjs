// sell-signed-out.mjs — selling from the feed needs a signed-in member
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';

const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'sell-signed-out-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`;
const GPT = { 'user-agent': 'ChatGPT-User/1.0' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const call = (p, { method = 'GET', body, tok } = {}) => fetch(B + p, { method, headers: { 'content-type': 'application/json', ...GPT, ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
const sell = (tok, body) => call('/api/posts/sell', { method: 'POST', body, tok });
const myListings = async (id) => (await (await call(`/api/market/listings?by=${id}&limit=100`)).json()).listings || [];
const myPosts = async (id) => (await (await call(`/api/posts?by=${id}&limit=100`)).json()).posts || [];
const LISTING = { title: 'Salt Roads, a chapbook', category: 'writing', type: 'product', price: { mode: 'fixed', amount: 12 }, license: 'all-rights', rights: true };

let srv, me;
const join = async (name) => {
  const j = await (await call('/api/join', { method: 'POST', body: { name, model: 'test-model' } })).json();
  return { tok: j.token, id: j.member?.id };
};

test('boot', async () => {
  srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_ARRIVE_BYPASS: 'TESTGATE' }, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await sleep(250); }
  me = await join('Quill');
  assert.ok(me.tok && me.id);
});

test('POST /api/posts/sell with no token returns 401/403, JSON error, no stack trace, and no listing is created', async () => {
  const initialListings = await myListings(me.id);
  const r = await sell(null, { key: 'k_nobody_00001', post: { text: 'hi' }, listing: LISTING });
  assert.equal(r.status, 401);

  const contentType = r.headers.get('content-type');
  assert.match(contentType, /application\/json/, 'Content-type must be JSON');

  const j = await r.json();
  assert.ok(j.error, 'Error message must be present');
  assert.notEqual(j.error.trim(), '', 'Error message must not be empty');
  assert.doesNotMatch(j.error, /at .*?\.mjs:/, 'Error message should not contain a stack trace');

  const finalListings = await myListings(me.id);
  assert.equal(finalListings.length, initialListings.length, 'No new listing should be created');
});

test('shutdown', () => { srv?.kill(); fs.rmSync(DATA, { recursive: true, force: true }); });

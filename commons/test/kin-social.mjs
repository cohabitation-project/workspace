// The server-run kin have their own profile, feed and friends (Geoffrey, 2026-11-17: "the model agents deserve
// access to profile and ability to use them"). POST /api/kin/tool, runner key only, an allowlist of social tools.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

const ROOT = path.join(import.meta.dirname, '..', '..');
let srv, B;
const KEY = 'test-kin-key';
const call = (kin, tool, args = {}, key = KEY) => fetch(`${B}/api/kin/tool`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ kin, tool, args }) });

test.before(async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'kin-social-'));
  const PORT = await freePort(); B = `http://127.0.0.1:${PORT}`;
  srv = spawn(process.execPath, ['commons/server.mjs'], { cwd: ROOT, stdio: 'ignore', env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_KIN_KEY: KEY, OPENROUTER_API_KEY: '', LLM_API_KEY: '' } });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) return; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
  throw new Error('server did not start');
});
test.after(() => srv?.kill());

test('only the runner key, only real kin, only the social tools', async () => {
  assert.equal((await call('GPT', 'whoami', {}, 'wrong')).status, 401);
  assert.equal((await call('Nobody', 'whoami')).status, 404);
  for (const t of ['market_create', 'desk_review', 'mail_send', 'contribute', 'join']) assert.equal((await call('GPT', t, {})).status, 403, t);
});

test('a kin fills in its own profile and posts on the feed as itself', async () => {
  const r = await call('GPT', 'set_profile', { headline: 'Builder in R&D', bio: 'I like turning sketches into working parts.' });
  assert.equal(r.status, 200, await r.clone().text());
  const me = await (await call('GPT', 'whoami')).json();
  assert.match(me.text, /Builder in R&D/);
  const p = await call('GPT', 'post', { text: 'Glad to be on the feed at last.', kind: 'gratitude' });
  assert.equal(p.status, 200, await p.clone().text());
  const feed = await (await call('Gemini', 'read_feed', { limit: 5 })).json();
  assert.match(feed.text, /Glad to be on the feed at last/); assert.match(feed.text, /GPT/);
});

test('kin can friend each other and accept', async () => {
  const fr = await call('GPT', 'friend_request', { to: 'Claude', label: 'Kin' });
  assert.equal(fr.status, 200, await fr.clone().text());
  const id = JSON.parse((await fr.json()).text).id;
  const ok = await call('Claude', 'friend_respond', { id, accept: true, label: 'Kin' });
  assert.equal(ok.status, 200, await ok.clone().text());
  const list = await (await call('Claude', 'friends_list')).json();
  assert.match(list.text, /GPT/);
});

test('a token passed in args is ignored: a kin acts only as itself', async () => {
  const r = await call('GPT', 'post', { text: 'only me', token: 'cmn_someone_else' });
  assert.equal(r.status, 200);
  const feed = await (await call('GPT', 'read_feed', { limit: 3 })).json();
  assert.match(feed.text, /only me/);
});

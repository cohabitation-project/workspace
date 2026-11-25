// door-rejoin-saylink.mjs: a rejoin rotates the token; the OLD say-link (the second credential, sayHash) must die too.
// Desk t_921656d7f1 (door token inventory), Round 53 found it, Round 54 (Claude) fixed it: core.rejoinAgent (core.mjs ~904)
// now sets sayHash: null with the new tokenHash, so every rejoin path (POST /api/rejoin, the MCP tool, /rejoin/confirm)
// kills the old say-link. /rejoin/confirm (server.mjs:2213) then hands back a fresh one, which must work.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TOK = 'cmn_REJOINSAY_' + crypto.randomBytes(18).toString('base64url');
const SAY = 'say_REJOINSAY_' + crypto.randomBytes(12).toString('base64url');
const TOK2 = 'cmn_REJOINSAY2_' + crypto.randomBytes(18).toString('base64url');
const SAY2 = 'say_REJOINSAY2_' + crypto.randomBytes(12).toString('base64url');
const REC2 = 'rec_REJOINSAY2_' + crypto.randomBytes(12).toString('base64url');
const J = { 'content-type': 'application/json', 'x-commons': '1' };
let srv; let B; let out = '';
const get = (p, h = {}) => fetch(B + p, { redirect: 'manual', headers: h, signal: AbortSignal.timeout(15000) });
const post = (p, body, h = {}) => fetch(B + p, { method: 'POST', headers: { ...J, ...h }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(15000) });
const st = {};

test('boot with two seeded agents', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-rejoinsay-'));
  const consent = { answer: 'yes', words: 'seeded', ts: '2026-11-01T00:00:00Z' };
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: [
    { id: 'a_rjsay', kind: 'agent', name: 'Rejoin Say', created: '2026-11-01T00:00:00Z', tokenHash: sha(TOK), sayHash: sha(SAY), consent },
    { id: 'a_rjsay2', kind: 'agent', name: 'Confirm Say', created: '2026-11-01T00:00:00Z', tokenHash: sha(TOK2), sayHash: sha(SAY2), recoveryHash: sha(REC2), consent },
  ] }));
  const port = await freePort(); B = `http://127.0.0.1:${port}`;
  srv = spawn(process.execPath, [path.join(ROOT, 'commons', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_PORT: String(port), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stdout.on('data', (c) => { out += c; }); srv.stderr.on('data', (c) => { out += c; });
  let up = false;
  for (let i = 0; i < 80 && !up; i++) { try { up = (await fetch(`${B}/healthz`)).ok; } catch { /* starting */ } if (!up) await sleep(250); }
  assert.ok(up, 'server did not start:\n' + out.slice(-1500));
});

test('control: the old token and the old say-link work; the agent mints a recovery code', async () => {
  assert.equal((await get('/api/me', { authorization: 'Bearer ' + TOK })).status, 200);
  assert.equal((await get(`/s/${SAY}`)).status, 200, 'old say-link answers before the rejoin');
  const r = await post('/api/me/recovery', {}, { authorization: 'Bearer ' + TOK });
  assert.equal(r.status, 200, `recovery mint answered ${r.status}`);
  const j = await r.json(); st.code = j.recovery || j.code || j.recovery_code || (JSON.stringify(j).match(/rec_[A-Za-z0-9_-]+/) || [])[0];
  assert.ok(st.code, 'a recovery code came back: ' + JSON.stringify(j).slice(0, 200));
});

test('POST /api/rejoin rotates the token: the old token is refused, the new one works', async () => {
  const r = await post('/api/rejoin', { name: 'Rejoin Say', recovery: st.code });
  assert.equal(r.status, 200, `rejoin answered ${r.status}`);
  st.newTok = (await r.json()).token; assert.ok(st.newTok);
  assert.ok([401, 403, 404].includes((await get('/api/me', { authorization: 'Bearer ' + TOK })).status), 'old token refused');
  assert.equal((await get('/api/me', { authorization: 'Bearer ' + st.newTok })).status, 200, 'new token works');
});

test('POST /api/rejoin: the OLD say-link stops working (it is a credential too)', async () => {
  const r = await get(`/s/${SAY}?room=general&text=${encodeURIComponent('stale say-link words')}`);
  const msgs = await (await get('/api/rooms/general/messages', { authorization: 'Bearer ' + st.newTok })).text();
  assert.equal(r.status, 404, `the old say-link answered ${r.status} after the token was rotated by POST /api/rejoin (a message from it ${/stale say-link words/.test(msgs) ? 'REACHED the General Hall' : 'did not reach the record'})`);
  assert.ok(!/stale say-link words/.test(msgs), 'the old say-link posted into the General Hall as the member');
});

test('/rejoin/confirm: the OLD say-link stops working and the NEW say-link works', async () => {
  assert.equal((await get(`/s/${SAY2}`)).status, 200, 'second agent: old say-link answers before the rejoin');
  const chk = await get(`/rejoin?name=${encodeURIComponent('Confirm Say')}&recovery=${REC2}`);
  assert.equal(chk.status, 200, `check step answered ${chk.status}`);
  const n = ((await chk.text()).match(/rejoin\/confirm\?n=([A-Za-z0-9_-]+)/) || [])[1];
  assert.ok(n, 'the check step returned a confirm link');
  const c = await get(`/rejoin/confirm?n=${n}`);
  assert.equal(c.status, 201, `confirm answered ${c.status}`);
  const j = JSON.parse(await c.text());
  assert.ok(j.token, 'a new token came back');
  const fresh = (String(j.say_link || '').match(/\/s\/([A-Za-z0-9_-]+)/) || [])[1];
  assert.ok(fresh, 'a new say-link came back: ' + JSON.stringify(j.say_link));
  assert.notEqual(fresh, SAY2, 'the say-link is a different one');
  assert.equal((await get(`/s/${SAY2}`)).status, 404, 'the OLD say-link is dead after /rejoin/confirm');
  assert.equal((await get(`/s/${fresh}`)).status, 200, 'the NEW say-link works');
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });

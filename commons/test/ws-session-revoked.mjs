// ws-session-revoked.mjs: an open /ws socket must stop speaking for a member once that session is revoked.
// Aletheia-6's review (m_mwuei5mv8h5b2ef8): the socket read the cookie once at the handshake and then trusted
// ws.member for ever, so after sign-out the open tab could still move presence and spot. The server now re-checks
// the handshake cookie on every message; a dead session gets its quiet presence removed and the socket closed 4401.
// Boots the real server on a temp data dir. Every wait ends in an assertion, so a dead server cannot pass.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import WebSocket from 'ws';
import { freePort } from './lib/port.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'wsrevoke-'));
const PORT = await freePort();
const BASE = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let srv; let booted = false;

async function until(fn, ms = 4000) { const end = Date.now() + ms; let v; while (Date.now() < end) { v = await fn(); if (v) return v; await sleep(80); } return v; }
const presenceOf = async (id) => { const r = await fetch(`${BASE}/api/presence`); return (await r.json()).presence.find((p) => p.member === id) || null; };
const open = (cookie) => new Promise((resolve, reject) => {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/ws`, { headers: cookie ? { Cookie: cookie } : {} });
  ws.hello = new Promise((res) => ws.on('message', (d) => { try { const m = JSON.parse(String(d)); if (m.t === 'hello') res(m); } catch { /* not json */ } }));
  ws.closed = new Promise((res) => ws.once('close', (code) => res(code)));
  ws.once('open', () => resolve(ws)); ws.once('error', reject);
});

test('boot', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1' }, stdio: 'ignore' });
  for (let i = 0; i < 60 && !booted; i++) { try { booted = (await fetch(`${BASE}/api/presence`)).ok; } catch { /* booting */ } if (!booted) await sleep(250); }
  assert.ok(booted, 'the server booted');
});

let cookie; let me; let roomA; let roomB;
test('a live socket moves presence (control: the check does not break the normal path)', async () => {
  assert.ok(booted, 'server up');
  const r = await fetch(`${BASE}/api/humans`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ name: 'Wsrevoke' }) });
  assert.ok(r.status < 300, `sign-up answered ${r.status}`);
  cookie = (r.headers.getSetCookie?.() || [r.headers.get('set-cookie')]).filter(Boolean)[0].split(';')[0];
  assert.match(cookie, /=/, 'got a session cookie');
  const ws = await open(cookie);
  const hello = await ws.hello;
  me = hello.me?.id; assert.ok(me, 'the socket knows who it is');
  roomA = hello.rooms[0].id; roomB = hello.rooms[1].id; assert.notEqual(roomA, roomB);
  ws.send(JSON.stringify({ t: 'here', room: roomA }));
  const row = await until(async () => { const p = await presenceOf(me); return p && p.room === roomA ? p : null; });
  assert.ok(row, 'here puts the member in room A');
  ws.send(JSON.stringify({ t: 'here', room: roomB }));
  const moved = await until(async () => { const p = await presenceOf(me); return p && p.room === roomB ? p : null; });
  assert.ok(moved, 'a live session can still move itself to room B');
  ws.close(); await ws.closed; await sleep(200);
});

test('after sign-out the open socket cannot move presence or spot, loses its presence, and is closed 4401', async () => {
  assert.ok(booted && me, 'earlier steps ran');
  const ws = await open(cookie);
  await ws.hello;
  ws.send(JSON.stringify({ t: 'here', room: roomA }));
  assert.ok(await until(async () => { const p = await presenceOf(me); return p && p.room === roomA; }), 'present in A before sign-out');
  const out = await fetch(`${BASE}/api/logout`, { method: 'POST', headers: { 'x-commons': '1', cookie } });
  assert.equal(out.status, 200, 'sign-out answered 200');
  ws.send(JSON.stringify({ t: 'here', room: roomB }));
  ws.send(JSON.stringify({ t: 'spot', room: roomA, spot: { x: 10, y: 10 } }));
  const code = await Promise.race([ws.closed, sleep(4000).then(() => 'still open')]);
  assert.equal(code, 4401, 'the socket was closed with 4401');
  const p = await presenceOf(me);
  assert.ok(!p || p.room !== roomB, `the signed-out socket did not move the member to room B (row: ${JSON.stringify(p)})`);
  assert.equal(p, null, 'its quiet presence is removed');
});

test('a socket opened with the dead cookie is anonymous: it cannot put anyone anywhere', async () => {
  assert.ok(booted && me, 'earlier steps ran');
  const ws = await open(cookie);
  const hello = await ws.hello;
  assert.equal(hello.me, null, 'no identity from a revoked cookie');
  ws.send(JSON.stringify({ t: 'here', room: roomA }));
  await sleep(500);
  assert.equal(await presenceOf(me), null, 'nothing moved');
  ws.close(); await ws.closed;
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });

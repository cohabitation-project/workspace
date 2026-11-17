// live-ghosts.mjs — Cohabi Live keeps one place per person, and drops windows that vanished without closing
// (Geoffrey's test, 2026-11-16: a refresh left a second "geoffrey" that closing the window didn't clear).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import WebSocket from 'ws';
import { freePort } from './lib/port.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vrghost-'));
const PORT = await freePort();
const store = await import('../lib/store.mjs'); store.init(DATA);
const auth = await import('../lib/auth.mjs');
const now = new Date().toISOString();
store.addMember({ id: 'h_geo01', name: 'Geo', kind: 'human', joined_at: now });
store.addMember({ id: 'h_ana01', name: 'Ana', kind: 'human', joined_at: now });
const cookieOf = (id) => auth.sessionCookie(id, false, 0).split(';')[0];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const count = async () => (await (await fetch(`http://127.0.0.1:${PORT}/voiceroom/state`)).json()).count;
const open = (id) => new Promise((resolve, reject) => {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/voiceroom-ws`, 'commons-voiceroom', { headers: { Cookie: cookieOf(id) } });
  ws.once('open', () => resolve(ws)); ws.once('error', reject);
});

let srv;
test('boot', async () => {
  srv = spawn('node', ['commons/voiceroom-server.mjs'], { cwd: ROOT, env: { ...process.env, VOICEROOM_PORT: String(PORT), COMMONS_DATA: DATA, VOICEROOM_HEARTBEAT_MS: '300' }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`http://127.0.0.1:${PORT}/voiceroom/state`)).ok) return; } catch { /* booting */ } await sleep(200); }
  throw new Error('voiceroom server did not boot');
});

test('the same person joining again replaces their older window; another person is untouched', async () => {
  const ana = await open('h_ana01');
  const first = await open('h_geo01');
  const closed = Promise.race([new Promise((r) => first.once('close', (code) => r(code))), sleep(3000).then(() => 'still open')]);
  const second = await open('h_geo01');
  assert.equal(await closed, 4409, 'the older window is told it left');
  await sleep(100);
  assert.equal(await count(), 2, 'Geo once, Ana once');
  assert.equal(ana.readyState, WebSocket.OPEN); assert.equal(second.readyState, WebSocket.OPEN);
  ana.close(); second.close(); await sleep(150);
});

test('a window that vanished without closing (no answer to pings) is dropped', async () => {
  const live = await open('h_ana01');
  const ghost = await open('h_geo01');
  assert.equal(await count(), 2);
  ghost._socket.pause(); // stops reading: it never answers a ping, like a window that is gone
  await sleep(1200);
  assert.equal(await count(), 1, 'the ghost is gone; the window that answers stays');
  assert.equal(live.readyState, WebSocket.OPEN);
  live.close(); try { ghost.terminate(); } catch { /* gone */ }
});

const livelink = await import('../lib/livelink.mjs');
const internal = async (body) => (await fetch(`http://127.0.0.1:${PORT}/voiceroom/internal`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cohabi-live-link': livelink.secret(store) }, body: JSON.stringify(body) })).json();

test('a sole member who refreshes keeps the meeting: agents and what was said stay (Claude\'s review)', async () => {
  const first = await open('h_geo01');
  assert.equal((await internal({ action: 'join', agent: { id: 'a_setu', name: 'Setu' } })).ok, true);
  await internal({ action: 'say', agentId: 'a_setu', text: 'hello', speak: false });
  const second = await open('h_geo01'); await sleep(300);
  assert.notEqual(first.readyState, WebSocket.OPEN, 'the old window left');
  const st = await internal({ action: 'state' });
  assert.ok(st.participants.some((p) => p.name === 'Setu'), 'the agent is still in the meeting');
  assert.ok(st.recent.some((r) => r.text === 'hello'), 'what was said is still there');
  await internal({ action: 'leave', agentId: 'a_setu' }); second.close(); await sleep(200);
});

test('a refresh in a full room still gets back in; a new person is still turned away', async () => {
  const geo = await open('h_geo01');
  for (let i = 0; i < 5; i++) await internal({ action: 'join', agent: { id: `a_f${i}`, name: `F${i}` } });
  assert.equal(await count(), 6, 'full');
  const again = await open('h_geo01'); await sleep(200);
  assert.equal(again.readyState, WebSocket.OPEN, 'Geo refreshed into a full room'); assert.equal(await count(), 6);
  await assert.rejects(open('h_ana01'), 'a seventh person is refused');
  for (let i = 0; i < 5; i++) await internal({ action: 'leave', agentId: `a_f${i}` });
  again.close(); try { geo.terminate(); } catch { /* gone */ } await sleep(200);
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });

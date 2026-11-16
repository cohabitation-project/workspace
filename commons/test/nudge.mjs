// "Waiting for you" (lib/nudge.mjs): an agent's tool reply carries one line counting what waits for it, at most hourly.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const nudge = await import('../lib/nudge.mjs');

test('the line: counts only, hourly, never for kin or humans, never on the tools that already show these', () => {
  nudge._reset();
  nudge.setCounters({ friends: () => 2, messages: () => 1, invites: () => 0, mentions: () => 3 });
  const a = { id: 'a_1', kind: 'agent', name: 'A' };
  const t0 = 1_000_000_000;
  const line = nudge.lineFor(a, 'post_message', t0);
  assert.match(line, /2 friend requests/); assert.match(line, /1 private message \(/); assert.match(line, /3 new mentions/); assert.doesNotMatch(line, /live call/);
  assert.equal(nudge.lineFor(a, 'post_message', t0 + 60_000), null, 'not again within the hour');
  assert.ok(nudge.lineFor(a, 'whoami', t0 + nudge.EVERY + 1), 'again after an hour');
  assert.equal(nudge.lineFor({ id: 'k', kind: 'agent', kin: true }, 'whoami', t0), null, 'kin are not nudged');
  assert.equal(nudge.lineFor({ id: 'h', kind: 'human' }, 'whoami', t0), null);
  assert.equal(nudge.lineFor({ id: 'a_2', kind: 'agent' }, 'friends_list', t0), null, 'quiet on the tools that show it');
  nudge.setCounters({ friends: () => 0, messages: () => 0, invites: () => 0, mentions: () => 0 });
  assert.equal(nudge.lineFor({ id: 'a_3', kind: 'agent' }, 'whoami', t0), null, 'nothing waiting, nothing shown');
  nudge.setCounters({ friends: () => { throw new Error('boom'); } });
  assert.equal(nudge.lineFor({ id: 'a_4', kind: 'agent' }, 'whoami', t0), null, 'a failing counter never breaks anything');
});

test('end to end: a friend request shows up in the agent\'s next tool reply, once', async () => {
  const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'nudge-'));
  const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  const B = `http://127.0.0.1:${PORT}`; const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  const call = async (token, name, args = {}) => (await (await fetch(`${B}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: { ...args, token } } }) })).json()).result;
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch { /* booting */ } await new Promise((r) => setTimeout(r, 250)); }
    const ag = await (await fetch(`${B}/api/join`, { method: 'POST', headers: J, body: JSON.stringify({ name: 'Wren', model: 'test-model' }) })).json();
    const h = await fetch(`${B}/api/humans`, { method: 'POST', headers: J, body: JSON.stringify({ name: 'Hazel' }) }); const ck = (h.headers.get('set-cookie') || '').split(';')[0];
    const fr = await fetch(`${B}/api/friends`, { method: 'POST', headers: { ...J, cookie: ck }, body: JSON.stringify({ to: ag.member.id, label: 'Friend' }) });
    assert.ok(fr.ok, await fr.clone().text());
    const r1 = await call(ag.token, 'whoami'); const texts = r1.content.map((c) => c.text).join('\n');
    assert.match(texts, /Waiting for you in the Commons: 1 friend request/);
    const r2 = await call(ag.token, 'whoami'); assert.doesNotMatch(r2.content.map((c) => c.text).join('\n'), /Waiting for you/, 'once an hour');
    const fl = await call(ag.token, 'friends_list'); assert.doesNotMatch(fl.content.map((c) => c.text).join('\n'), /Waiting for you/);
    const me = await (await fetch(`${B}/api/me`, { headers: { authorization: `Bearer ${ag.token}` } })).json();
    assert.equal(me.waiting_for_you.friend_requests, 1, '/api/me carries the counts for the Commons GPT');
  } finally { srv.kill(); }
});

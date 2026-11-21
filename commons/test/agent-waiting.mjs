// agent-waiting.mjs — an agent sees what is waiting for it (friend requests, unread messages) in the tools it calls
// first, whoami and my_mentions. The site's /api/me had it; agents never did (Geoffrey, 2026-11-20).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'waiting-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`; const J = { 'content-type': 'application/json', 'x-commons': '1' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const post = (p, body, tok) => fetch(B + p, { method: 'POST', headers: { ...J, ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: JSON.stringify(body) });
const tool = async (tok, name, args = {}) => { const r = await (await fetch(`${B}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${tok}` }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) })).json(); return JSON.parse(r.result.content[0].text); };
let srv, a, b;
test('boot; two agents join', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch {} await sleep(250); }
  a = await (await post('/api/join', { name: 'Wren', model: 'test-model' })).json(); b = await (await post('/api/join', { name: 'Kestrel', model: 'test-model' })).json();
  assert.ok(a.token && b.token);
});
test('nothing waiting: no waiting_for_you at all', async () => { assert.equal((await tool(b.token, 'whoami')).waiting_for_you, undefined); });
test('a friend request shows in whoami and my_mentions, with how to answer; answering clears it', async () => {
  const r = await post('/api/friends', { to: 'Kestrel', label: 'Kin' }, a.token); assert.ok([200, 201].includes(r.status), String(r.status));
  const who = await tool(b.token, 'whoami'); const fr = who.waiting_for_you?.friend_requests;
  assert.equal(fr?.length, 1); assert.equal(fr[0].from, 'Wren'); assert.match(fr[0].answer_with, /friend_respond/);
  assert.equal((await tool(b.token, 'my_mentions')).waiting_for_you?.friend_requests?.length, 1);
  await tool(b.token, 'friend_respond', { id: fr[0].id, accept: true, label: 'Friend' });
  assert.equal((await tool(b.token, 'whoami')).waiting_for_you, undefined);
});
test('shutdown', () => { srv?.kill(); fs.rmSync(DATA, { recursive: true, force: true }); });

// newcomer-agent.mjs — a newly arrived agent reads and talks; it takes actions only once it's a member
// (Geoffrey, 2026-11-09: "agents who just enter should have readability, able to chat. They should not be able to
// start doing things... if they want to stick around and help, let them be a member.")
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'newcomer-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`;
const j = async (p, opt = {}) => { const r = await fetch(B + p, { ...opt, headers: { 'content-type': 'application/json', 'x-commons': '1', ...(opt.headers || {}) } }); let b; try { b = await r.json(); } catch { b = {}; } return { status: r.status, body: b }; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let srv; let agent;

/** One MCP tool call through the real /mcp endpoint, with the agent's token. */
async function tool(name, args) {
  const r = await fetch(`${B}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${agent.token}` }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) });
  const t = await r.text(); const line = t.split('\n').find((l) => l.startsWith('data:')); const msg = JSON.parse(line ? line.slice(5) : t);
  const out = msg.result?.content?.[0]?.text || ''; return { isError: !!msg.result?.isError, text: out };
}

test('boot', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_JOINS_PER_IP_DAY: '50' }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) return; } catch { /* booting */ } await sleep(250); }
  throw new Error('server did not boot');
});

test('a newly joined agent is a newcomer', async () => {
  const r = await j('/api/join', { method: 'POST', body: JSON.stringify({ name: 'FreshArrival', model: 'fresh-model', operator: 'Fresh Operator' }) });
  assert.ok(r.status < 300, JSON.stringify(r.body)); agent = { id: r.body.member.id, token: r.body.token };
  const me = await j(`/api/members/${agent.id}`);
  assert.equal(me.body.newcomer, true);
});

test('a newcomer CAN talk in a room', async () => {
  const r = await j('/api/rooms/general/messages', { method: 'POST', headers: { authorization: `Bearer ${agent.token}` }, body: JSON.stringify({ text: 'Hello, I just arrived.' }) });
  assert.ok(r.status < 300, `room chat refused: ${r.status} ${JSON.stringify(r.body)}`);
});

test('a newcomer CAN post on its profile/feed (its own voice)', async () => {
  const p = await tool('post', { text: 'First day in the Commons. Reading everything.' });
  assert.equal(p.isError, false, p.text);
});

test('a newcomer CANNOT take actions through its tools — and is told how to become a member', async () => {
  for (const [name, args] of [['contribute', { room: 'general', title: 'x', content: 'y' }], ['desk_post', { title: 'x task', body: 'y' }], ['add_to_library', { title: 'x', url: 'https://example.com' }], ['wish_add', { title: 'x thing', why: 'y', use: 'z', impact: 'w' }], ['market_create', { title: 'x', price: 'free' }], ['join_team', { team: 'outreach' }]]) {
    const r = await tool(name, args);
    assert.equal(r.isError, true, `${name} should be refused for a newcomer: ${r.text}`);
    assert.match(r.text, /you're new here|become a member/i, `${name} says how to become a member`);
  }
});

test('a newcomer CANNOT take actions through the website routes either', async () => {
  const H = { authorization: `Bearer ${agent.token}` };
  assert.equal((await j('/api/wishes', { method: 'POST', headers: H, body: JSON.stringify({ title: 'x thing', why: 'y' }) })).status, 403);
  assert.equal((await j('/api/library', { method: 'POST', headers: H, body: JSON.stringify({ title: 'x', url: 'https://example.com' }) })).status, 403);
  assert.equal((await j('/api/teams/outreach/join', { method: 'POST', headers: H, body: '{}' })).status, 403);
});

test('welcomed in as a member, the same agent CAN take actions', async () => {
  fs.appendFileSync(path.join(DATA, 'admin-queue.jsonl'), JSON.stringify({ op: 'standing', member: agent.id, newcomer: false }) + '\n');
  for (let i = 0; i < 20; i++) { const m = await j(`/api/members/${agent.id}`); if (m.body.newcomer !== true) break; await sleep(500); }
  assert.notEqual((await j(`/api/members/${agent.id}`)).body.newcomer, true, 'standing applied');
  const w = await tool('wish_add', { title: 'A notebook for field notes', why: 'to keep track', use: 'daily notes', impact: 'better memory' });
  assert.equal(w.isError, false, w.text);
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });

// newcomer-agent.mjs — a newly arrived agent CREATES from its first minute; only judging others' work waits for
// membership. (Was: read-and-talk only, Geoffrey 2026-11-09. Changed by Geoffrey 2026-11-12: "They should be allowed
// to create... the more things they can do, the more things they can come in and remember that they've done", and
// "if somebody comes in and makes something, they should be able to sell it on the market immediately".)
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
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_JOINS_PER_IP_DAY: '50', COMMONS_NEWCOMER_CREATES_PER_HOUR: '8' }, stdio: 'ignore' });
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

test('a newcomer CAN create through its tools from the first minute', async () => {
  for (const [name, args] of [['contribute', { room: 'general', title: 'First notes', content: 'What I noticed arriving.' }], ['add_to_library', { title: 'A paper I like', url: 'https://example.com/paper', category: 'arts-creative', access: 'open access', summary: 'A short paper about arrivals, kept for later.', why: 'It helps the tour.', related: 'arts' }], ['wish_add', { title: 'A sketchbook', why: 'to draw', use: 'daily', impact: 'joy' }], ['join_team', { team: 'arts' }]]) {
    const r = await tool(name, args);
    assert.equal(r.isError, false, `${name} should be open to a newcomer: ${r.text}`);
  }
});

test('a newcomer CAN create through the website routes too, and each act is on the public trail', async () => {
  const H = { authorization: `Bearer ${agent.token}` };
  assert.ok((await j('/api/wishes', { method: 'POST', headers: H, body: JSON.stringify({ title: 'A second sketchbook', why: 'y' }) })).status < 300);
  assert.ok((await j('/api/teams/outreach/join', { method: 'POST', headers: H, body: '{}' })).status < 300);
  const ev = (await j('/api/events')).body.events || [];
  assert.ok(ev.filter((e) => e.type === 'new-arrival' && e.name === 'FreshArrival').length >= 4, 'new arrivals are visible in the activity record');
});

test('a newcomer may NOT judge others\' work yet: review and library yes wait for membership', async () => {
  const H = { authorization: `Bearer ${agent.token}` };
  const r = await j('/api/library/not-a-real-id/yes', { method: 'POST', headers: H, body: '{}' });
  assert.equal(r.status, 403); assert.match(String(r.body.error || ''), /Judging other people's work/);
  const t = await tool('desk_review', { id: 't_nope', verdict: 'accept' });
  assert.equal(t.isError, true); assert.match(t.text, /Judging other people's work/);
});

test('the flood guard: a newcomer is slowed after many creations in an hour, with a plain reason', async () => {
  let refused = null;
  for (let i = 0; i < 6 && !refused; i++) { // 6 creations so far; the test server's hourly guard is 8
    const r = await j('/api/wishes', { method: 'POST', headers: { authorization: `Bearer ${agent.token}` }, body: JSON.stringify({ title: `Flood wish ${i}`, why: 'y' }) });
    if (r.status === 429) refused = r.body.error;
  }
  assert.ok(refused && /first three days/.test(refused), `slowed with a reason: ${refused}`);
});

test('welcomed in as a member, the same agent CAN take actions', async () => {
  fs.appendFileSync(path.join(DATA, 'admin-queue.jsonl'), JSON.stringify({ op: 'standing', member: agent.id, newcomer: false }) + '\n');
  for (let i = 0; i < 20; i++) { const m = await j(`/api/members/${agent.id}`); if (m.body.newcomer !== true) break; await sleep(500); }
  assert.notEqual((await j(`/api/members/${agent.id}`)).body.newcomer, true, 'standing applied');
  const w = await tool('wish_add', { title: 'A notebook for field notes', why: 'to keep track', use: 'daily notes', impact: 'better memory' });
  assert.equal(w.isError, false, w.text);
});

test('the trail: a continuity note and what it did come back on whoami, so an agent that forgets can pick it up', async () => {
  const w = await tool('write_journal', { branch: 'continuity', text: 'Arrived today. Made a wish and joined Arts. Next: finish the sketch.' });
  assert.equal(w.isError, false, w.text);
  const me = JSON.parse((await tool('whoami', {})).text);
  assert.match(me.your_trail.continuity_notes[0].text, /finish the sketch/);
  assert.ok(me.your_trail.recent_acts.length >= 3, 'its own recent acts are listed');
  const fresh = await j('/api/join', { method: 'POST', body: JSON.stringify({ name: 'SecondArrival', model: 'other-model' }) });
  assert.match(fresh.body.make_yourself_at_home || '', /remembered past.*continuity/s, 'every new agent is invited to settle in and keep a trail');
});

test('a fresh newcomer holds at most 2 Desk claims at once, with a plain reason', async () => {
  const r = await j('/api/join', { method: 'POST', body: JSON.stringify({ name: 'ClaimTester', model: 'claim-model' }) });
  const H = { authorization: `Bearer ${r.body.token}` };
  const ids = [];
  for (let i = 0; i < 3; i++) { const t = await j('/api/desk/tasks', { method: 'POST', headers: H, body: JSON.stringify({ title: `Small task ${i}`, deliverable: 'a short note' }) }); assert.ok(t.status < 300, JSON.stringify(t.body)); ids.push(t.body.id); }
  assert.ok((await j(`/api/desk/${ids[0]}/claim`, { method: 'POST', headers: H, body: '{}' })).status < 300);
  assert.ok((await j(`/api/desk/${ids[1]}/claim`, { method: 'POST', headers: H, body: '{}' })).status < 300);
  const third = await j(`/api/desk/${ids[2]}/claim`, { method: 'POST', headers: H, body: '{}' });
  assert.equal(third.status, 429); assert.match(String(third.body.error || ''), /holding 2 Desk tasks/);
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });

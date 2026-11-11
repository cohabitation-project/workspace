// live-guest.mjs — Cohabi Live guest links (Setu, 2026-11-11). Harness shared with live-invite.mjs.
// live-invite.mjs — Cohabi Live: inviting an agent, and the agent taking part as itself (Setu, 2026-11-11).
// Runs BOTH real processes (the Commons and the voice room) on one data directory, as on the server, with a real
// browser-shaped WebSocket for the human and the real MCP endpoint for the agents. Covers Aletheia-6's acceptance
// list: invite, accept, decline, unavailable not shown online, join without video, attributed reply, revocation,
// social-only refused, expiry not replayable, duplicate delivery, disconnected sessions, private wire not public.
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';
import WebSocket from 'ws';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'live-guest-'));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const CP = await freePort(); const VP = await freePort();
const C = `http://127.0.0.1:${CP}`; const V = `http://127.0.0.1:${VP}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const store = await import('../lib/store.mjs'); store.init(DATA);
const auth = await import('../lib/auth.mjs');
const now = new Date().toISOString();
const TOK = { aleth: 'tok-aletheia-test-0001', other: 'tok-other-agent-0002', nogrant: 'tok-no-grant-0003', late: 'tok-late-agent-0004', shy: 'tok-shy-agent-0005' };
store.addMember({ id: 'h_host01', name: 'HostGeo', kind: 'human', joined_at: now });
store.addMember({ id: 'h_social01', name: 'SocialSid', kind: 'human', joined_at: now, social_only: true });
const agent = (id, name, tok, extra = {}) => store.addMember({ id, name, kind: 'agent', model: 'test-model-1', operator: 'HostGeo', joined_at: now, tokenHash: store.sha256(tok), ...extra });
agent('a_aleth01', 'Aletheia-6', TOK.aleth, { portrait: 'img_aleth' });
agent('a_other01', 'OtherAgent', TOK.other);
agent('a_nogrant1', 'NoGrant', TOK.nogrant);
agent('a_late01', 'LateAgent', TOK.late);
agent('a_shy01', 'ShyAgent', TOK.shy);
fs.mkdirSync(path.join(DATA, 'station'), { recursive: true });
const grant = (id, name) => ({ name, by: 'HostGeo', ts: now });
fs.writeFileSync(path.join(DATA, 'station', 'grants.json'), JSON.stringify({ a_aleth01: grant('a_aleth01', 'Aletheia-6'), a_other01: grant('a_other01', 'OtherAgent'), a_late01: grant('a_late01', 'LateAgent'), a_shy01: grant('a_shy01', 'ShyAgent') }));
const cookie = (id) => auth.sessionCookie(id, false, 0).split(';')[0];
const HOST = cookie('h_host01'); const SOCIAL = cookie('h_social01');

let csrv, vsrv;
const env = { ...process.env, COMMONS_DATA: DATA, ASHRAM_PORT: String(CP), VOICEROOM_PORT: String(VP), COMMONS_URL: C, VOICEROOM_URL: V,
  COMMONS_STATION_ENABLED: '1', COMMONS_STEWARDS: 'h_host01', COHABI_LIVE_INVITE_MS: '4000', COHABI_LIVE_QUIET_MS: '3000', COHABI_LIVE_SWEEP_MS: '500', COHABI_LIVE_GUEST_GRACE_MS: '1500' };
const up = async (url) => { for (let i = 0; i < 60; i++) { try { if ((await fetch(url)).status < 500) return; } catch { /* booting */ } await sleep(200); } throw new Error('did not boot: ' + url); };

test('boot both processes', async () => {
  csrv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env, stdio: ['ignore', 'ignore', 'inherit'] });
  vsrv = spawn('node', ['commons/voiceroom-server.mjs'], { cwd: ROOT, env, stdio: ['ignore', 'ignore', 'inherit'] });
  await up(`${C}/healthz`); await up(`${V}/voiceroom/state`);
});

const api = async (method, p, body, ck = HOST) => { const r = await fetch(C + p, { method, headers: { 'content-type': 'application/json', 'x-commons': '1', cookie: ck }, body: body ? JSON.stringify(body) : undefined }); return { status: r.status, data: await r.json().catch(() => ({})) }; };
let rpc = 0;
const tool = async (tok, name, args = {}) => {
  const r = await fetch(`${C}/mcp`, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${tok}` }, body: JSON.stringify({ jsonrpc: '2.0', id: ++rpc, method: 'tools/call', params: { name, arguments: args } }) });
  const j = await r.json(); const t = j.result?.content?.[0]?.text || ''; let data = null; try { data = JSON.parse(t); } catch { /* error text */ }
  return { error: j.result?.isError ? t : null, data, text: t };
};

// The human is in the meeting through the same socket a browser uses (no camera needed to be present).
let hostWs; const heard = [];
const openHost = () => new Promise((res, rej) => { hostWs = new WebSocket(`ws://127.0.0.1:${VP}/voiceroom-ws`, 'commons-voiceroom', { headers: { cookie: HOST } }); hostWs.on('message', (d, bin) => { if (!bin) heard.push(JSON.parse(String(d))); }); hostWs.on('open', () => res()); hostWs.on('error', rej); });
const waitFor = async (pred, ms = 3000) => { const t = Date.now(); while (Date.now() - t < ms) { const m = heard.find(pred); if (m) return m; await sleep(50); } return null; };


const wsAs = (protocols, headers = {}) => new Promise((res) => { const w = new WebSocket(`ws://127.0.0.1:${VP}/voiceroom-ws`, protocols, { headers }); const got = []; w.on('message', (d, bin) => { if (!bin) got.push(JSON.parse(String(d))); }); w.on('open', () => res({ w, got, status: 101 })); w.on('unexpected-response', (q, r) => res({ status: r.statusCode })); w.on('error', () => {}); });
const pub = async (p, body) => { const r = await fetch(C + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, data: await r.json().catch(() => ({})) }; };
const wait = async (arr, pred, ms = 3000) => { const t = Date.now(); while (Date.now() - t < ms) { const m = arr.find(pred); if (m) return m; await sleep(50); } return null; };
const tokenOf = (path) => /#guest=([A-Za-z0-9_-]+)$/.exec(path)[1];

let host, link, token;
test('only a member makes a guest link; the link keeps its secret after #', async () => {
  assert.equal((await api('POST', '/api/live/guests', { for: 'Alex' }, SOCIAL)).status, 403, 'social-only refused');
  assert.equal((await api('POST', '/api/live/guests', { for: 'Alex' }, '')).status, 401, 'signed out refused');
  const r = await api('POST', '/api/live/guests', { for: 'Alex' }); assert.equal(r.status, 200, JSON.stringify(r.data));
  link = r.data; token = tokenOf(link.path); assert.match(link.path, /^\/voiceroom#guest=[A-Za-z0-9_-]{30,}$/);
  assert.ok(!fs.readFileSync(path.join(DATA, 'live', 'guests.json'), 'utf8').includes(token), 'only a hash of the secret is kept');
  assert.equal((await api('GET', '/api/live/guests')).data.guests[0].for, 'Alex');
});

test('the guest door: bad links refused; no meeting, no entry', async () => {
  assert.equal((await pub('/api/live/guest/preview', { token: 'x'.repeat(32) })).status, 410);
  const pv = await pub('/api/live/guest/preview', { token }); assert.equal(pv.status, 200); assert.equal(pv.data.meeting_open, false); assert.equal(pv.data.invited_by, 'HostGeo');
  assert.equal((await pub('/api/live/guest/enter', { token, name: 'Alex', agreed: true })).status, 409, 'no member in the meeting yet');
});

test('before joining, the guest is told who is there, agents named as agents', async () => {
  host = await wsAs('commons-voiceroom', { cookie: HOST }); assert.equal(host.status, 101); await wait(host.got, (m) => m.type === 'hello');
  const i = (await api('POST', '/api/live/invite', { agent: 'a_aleth01' })).data.invite;
  assert.equal((await tool(TOK.aleth, 'live_join', { invite: i.id })).error, null);
  const pv = await pub('/api/live/guest/preview', { token });
  assert.equal(pv.data.meeting_open, true);
  assert.deepEqual(pv.data.in_the_room.map((p) => [p.name, p.kind]).sort(), [['Aletheia-6', 'AI agent'], ['HostGeo', 'member']]);
  assert.match(pv.data.privacy, /AI agents in this meeting can read what is said/);
});

let pass, guest;
test('the guest says yes with a name, and enters as a guest of the member who invited them', async () => {
  assert.equal((await pub('/api/live/guest/enter', { token, name: 'Alex' })).status, 400, 'must confirm they read who is there');
  assert.equal((await pub('/api/live/guest/enter', { token, name: 'HostGeo', agreed: true })).status, 409, 'cannot take a member\'s name');
  const e = await pub('/api/live/guest/enter', { token, name: 'Alex V', agreed: true }); assert.equal(e.status, 200); pass = e.data.pass;
  guest = await wsAs(['commons-voiceroom', `commons-guest.${pass}`]); assert.equal(guest.status, 101);
  const hello = await wait(guest.got, (m) => m.type === 'hello'); assert.ok(hello);
  const pj = await wait(host.got, (m) => m.type === 'peer-joined' && m.name === 'Alex V'); assert.equal(pj.badge, 'guest'); assert.equal(pj.guest_of, 'HostGeo');
  const twice = await wsAs(['commons-voiceroom', `commons-guest.${pass}`]); assert.equal(twice.status, 409, 'one browser per guest link');
});

test('the guest talks; the agent reads it; the guest gets nothing else of the Commons', async () => {
  guest.w.send(JSON.stringify({ type: 'chat', text: 'Hello from outside the Commons' }));
  const c = await wait(host.got, (m) => m.type === 'chat' && m.name === 'Alex V'); assert.equal(c.badge, 'guest');
  assert.ok((await tool(TOK.aleth, 'live_read')).data.recent.some((r) => r.name === 'Alex V' && r.badge === 'guest'));
  assert.equal((await api('GET', '/api/live/agents', null, '')).status, 401, 'cannot list agents');
  assert.equal((await api('POST', '/api/live/invite', { agent: 'a_other01' }, '')).status, 401, 'cannot invite');
  assert.equal((await api('POST', '/api/live/guests', {}, '')).status, 401, 'cannot make guest links');
});

test('the member cancels: the guest is out at once and neither link nor pass works again', async () => {
  const id = (await api('GET', '/api/live/guests')).data.guests[0].id;
  const closed = new Promise((res) => guest.w.on('close', (code) => res(code)));
  assert.equal((await api('POST', '/api/live/guests/cancel', { id })).status, 200);
  assert.equal(await closed, 4403);
  assert.ok(await wait(host.got, (m) => m.type === 'chat' && /Alex V \(guest\) left/.test(m.text)));
  assert.equal((await pub('/api/live/guest/preview', { token })).status, 410);
  assert.equal((await wsAs(['commons-voiceroom', `commons-guest.${pass}`])).status, 401);
});

test('a guest who steps out may come back within the grace window, not after', async () => {
  const t2 = tokenOf((await api('POST', '/api/live/guests', { for: 'Joe' })).data.path);
  const p2 = (await pub('/api/live/guest/enter', { token: t2, name: 'Joe', agreed: true })).data.pass;
  const g1 = await wsAs(['commons-voiceroom', `commons-guest.${p2}`]); assert.equal(g1.status, 101);
  g1.w.close(); await sleep(300);
  const p3 = (await pub('/api/live/guest/enter', { token: t2, name: 'Joe', agreed: true })).data.pass; assert.ok(p3, 'refresh within grace rejoins');
  const g2 = await wsAs(['commons-voiceroom', `commons-guest.${p3}`]); assert.equal(g2.status, 101);
  g2.w.close(); await sleep(2000);
  assert.equal((await pub('/api/live/guest/enter', { token: t2, name: 'Joe', agreed: true })).status, 410, 'after the grace window the link has ended');
});

test('when the last member leaves, guests are shown out and their links end', async () => {
  const t3 = tokenOf((await api('POST', '/api/live/guests', { for: 'Sam' })).data.path);
  const p = (await pub('/api/live/guest/enter', { token: t3, name: 'Sam', agreed: true })).data.pass;
  const g = await wsAs(['commons-voiceroom', `commons-guest.${p}`]); assert.equal(g.status, 101);
  const closed = new Promise((res) => g.w.on('close', (code) => res(code)));
  host.w.close();
  assert.equal(await closed, 4410);
  await sleep(500);
  assert.equal((await pub('/api/live/guest/preview', { token: t3 })).status, 410);
});

test('teardown', () => { try { csrv.kill(); } catch { /* */ } try { vsrv.kill(); } catch { /* */ } });

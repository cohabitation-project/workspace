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
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'live-invite-'));
const freePort = () => new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const CP = await freePort(); const VP = await freePort();
const C = `http://127.0.0.1:${CP}`; const V = `http://127.0.0.1:${VP}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const store = await import('../lib/store.mjs'); store.init(DATA);
const auth = await import('../lib/auth.mjs');
const now = new Date().toISOString();
const TOK = { aleth: 'tok-aletheia-test-0001', other: 'tok-other-agent-0002', nogrant: 'tok-no-grant-0003', late: 'tok-late-agent-0004', shy: 'tok-shy-agent-0005' };
store.addMember({ id: 'h_host01', name: 'HostGeo', kind: 'human', joined_at: now, teams: ['arts'] });
store.addMember({ id: 'h_fran01', name: 'FranMember', kind: 'human', joined_at: now, teams: ['arts'] });
store.addMember({ id: 'h_far01', name: 'FarAwayFinn', kind: 'human', joined_at: now });
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
const HOST = cookie('h_host01'); const SOCIAL = cookie('h_social01'); const FRAN = cookie('h_fran01');

// A stand-in for whisper-cli: it only answers if ffmpeg really produced a 16 kHz mono WAV from what the browser sent.
const FAKE_WHISPER = path.join(DATA, 'fake-whisper.sh');
fs.writeFileSync(FAKE_WHISPER, '#!/bin/sh\nf=""; while [ $# -gt 0 ]; do [ "$1" = "-f" ] && f="$2"; shift; done\nhead -c 4 "$f" | grep -q RIFF && ffprobe -v error -show_entries stream=sample_rate,channels -of csv=p=0 "$f" | grep -q "16000,1" && echo "I heard the human say hello to the agents."\n', { mode: 0o755 });
let csrv, vsrv;
const env = { ...process.env, COMMONS_DATA: DATA, ASHRAM_PORT: String(CP), VOICEROOM_PORT: String(VP), COMMONS_URL: C, VOICEROOM_URL: V,
  COMMONS_STATION_ENABLED: '1', COMMONS_STEWARDS: 'h_host01', COHABI_LIVE_INVITE_MS: '4000', COHABI_LIVE_QUIET_MS: '3000', COHABI_LIVE_SWEEP_MS: '500', COHABI_WHISPER_CLI: FAKE_WHISPER, COHABI_WHISPER_MODEL: '/dev/null' };
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

test('inviting needs an open meeting, member standing, and an agent with entry', async () => {
  assert.equal((await api('POST', '/api/live/invite', { agent: 'a_aleth01' })).status, 409, 'nobody in the meeting yet');
  await openHost(); await waitFor((m) => m.type === 'hello');
  assert.equal((await api('POST', '/api/live/invite', { agent: 'a_aleth01' }, SOCIAL)).status, 403, 'social-only account refused');
  assert.equal((await api('POST', '/api/live/invite', { agent: 'a_aleth01' }, '')).status, 401, 'signed out refused');
  // 2026-11-12: any active agent can be called; the invitation grants its Station entry (checked in the panel test below)
  const r = await fetch(`${C}/api/live/invite`, { method: 'POST', headers: { 'content-type': 'application/json', cookie: HOST, origin: 'https://evil.example' }, body: '{"agent":"a_aleth01"}' });
  assert.equal(r.status, 403, 'a foreign page cannot invite on your behalf');
});

test('the agent list tells only what is known: no "online", eligibility, how it answers', async () => {
  const { status, data } = await api('GET', '/api/live/agents');
  assert.equal(status, 200);
  const a = data.agents.find((x) => x.id === 'a_aleth01'); const n = data.agents.find((x) => x.id === 'a_nogrant1');
  assert.equal(a.eligible, true); assert.equal(a.answers_by, 'tools'); assert.equal(a.face, '/m/a_aleth01/face'); assert.equal(a.in_meeting, false);
  assert.equal(n.eligible, true, 'an agent without a grant can still be called (the invitation is the entry)'); assert.equal(n.why_not, null);
  assert.ok(!JSON.stringify(data).match(/"online"/), 'nothing is labelled online');
  assert.ok(!JSON.stringify(data).includes('tokenHash'), 'no token material leaves the server');
  assert.equal((await api('GET', '/api/live/agents', null, SOCIAL)).status, 403);
});

let inv;
test('a human invites; inviting twice is the same invitation', async () => {
  const a = await api('POST', '/api/live/invite', { agent: 'a_aleth01' }); assert.equal(a.status, 200); inv = a.data.invite;
  assert.equal(inv.status, 'invited'); assert.match(inv.id, /^li_[0-9a-f]{16}$/);
  const b = await api('POST', '/api/live/invite', { agent: 'a_aleth01' }); assert.equal(b.data.invite.id, inv.id, 'no duplicate invitation');
  assert.ok(!heard.some((m) => m.type === 'peer-joined' && m.memberId === 'a_aleth01'), 'invited is not present');
});

test('the agent finds it with its own tools; nobody else can take it', async () => {
  const mine = await tool(TOK.aleth, 'live_invites'); assert.equal(mine.data.invitations.length, 1); assert.equal(mine.data.invitations[0].id, inv.id);
  const m = await tool(TOK.aleth, 'my_mentions'); assert.equal(m.data.live_invitations.waiting, 1, 'my_mentions says an invitation is waiting');
  assert.equal((await tool(TOK.other, 'live_invites')).data.invitations.length, 0, 'other agents do not see it');
  assert.match((await tool(TOK.other, 'live_join', { invite: inv.id })).error, /Error 404/, 'another agent cannot accept it');
  assert.match((await tool(TOK.aleth, 'live_read')).error, /Error 403.*not in the meeting/, 'no transcript before joining');
  assert.match((await tool(TOK.aleth, 'live_say', { text: 'hi' })).error, /Error 403/, 'cannot speak before joining');
});

test('accepting joins without any video stream; the room shows the agent only after it joined', async () => {
  const j = await tool(TOK.aleth, 'live_join', { invite: inv.id }); assert.equal(j.error, null, j.text); assert.equal(j.data.invite.status, 'joined');
  const pj = await waitFor((x) => x.type === 'peer-joined' && x.memberId === 'a_aleth01');
  assert.ok(pj, 'the browser hears the agent arrive'); assert.equal(pj.virtual, true); assert.equal(pj.via, 'tools'); assert.equal(pj.face, '/m/a_aleth01/face'); assert.equal(pj.name, 'Aletheia-6');
  assert.ok(await waitFor((x) => x.type === 'chat' && x.badge === 'system' && /Aletheia-6 joined through its own tools/.test(x.text)));
  const again = await tool(TOK.aleth, 'live_join', { invite: inv.id }); assert.equal(again.data.already, true, 'duplicate delivery is harmless');
  await sleep(200); assert.equal(heard.filter((x) => x.type === 'peer-joined' && x.memberId === 'a_aleth01').length, 1, 'joined once, shown once');
  const st = await (await fetch(`${V}/voiceroom/state`, { headers: { cookie: HOST } })).json();
  assert.equal(st.participants.filter((p) => p.memberId === 'a_aleth01').length, 1);
});

test('the agent reads the meeting and answers under its own name and model', async () => {
  hostWs.send(JSON.stringify({ type: 'chat', text: 'Aletheia, can you hear us?' }));
  await waitFor((x) => x.type === 'chat' && x.name === 'HostGeo');
  const r = await tool(TOK.aleth, 'live_read'); assert.equal(r.error, null, r.text);
  assert.ok(r.data.recent.some((x) => x.name === 'HostGeo' && /hear us/.test(x.text)), 'sees what the human said');
  assert.ok(r.data.participants.some((p) => p.name === 'Aletheia-6' && p.via === 'tools'));
  const s = await tool(TOK.aleth, 'live_say', { text: 'Yes, I can read you. Hello from my own tools.' }); assert.equal(s.error, null, s.text);
  const said = await waitFor((x) => x.type === 'chat' && x.name === 'Aletheia-6' && /own tools/.test(x.text));
  assert.ok(said); assert.equal(said.badge, 'agent'); assert.equal(said.model, 'test-model-1'); assert.equal(said.via, 'tools');
  assert.equal(s.data.shown, true); assert.equal(s.data.voice, 'queued', 'answers at once; speech is made in the background, so the tool never times out after delivery');
});

test('live_wait: holds until someone else speaks, returns only what is new, never its own words', async () => {
  const start = await tool(TOK.aleth, 'live_wait'); assert.equal(start.error, null, start.text);
  assert.ok(start.data.since, 'a cursor to listen from'); assert.ok(!start.data.new.some((x) => x.name === 'Aletheia-6'), 'not her own words');
  const t0 = Date.now();
  const pending = tool(TOK.aleth, 'live_wait', { since: start.data.since, seconds: 10 });
  await sleep(600);
  assert.match((await tool(TOK.aleth, 'live_wait', { since: start.data.since, seconds: 2 })).error || '', /Error 409.*already/, 'one wait at a time');
  await tool(TOK.aleth, 'live_say', { text: 'my own words do not wake me', speak: false });
  await sleep(400);
  hostWs.send(JSON.stringify({ type: 'chat', text: 'Are you still listening?' }));
  const got = await pending; assert.equal(got.error, null, got.text);
  assert.ok(Date.now() - t0 < 8000, 'answered when something was said, not at the end of the hold');
  assert.deepEqual(got.data.new.map((x) => x.text), ['Are you still listening?'], 'only the new line, and not her own');
  const quiet = await tool(TOK.aleth, 'live_wait', { since: got.data.since, seconds: 1 });
  assert.equal(quiet.error, null, quiet.text); assert.deepEqual(quiet.data.new, [], 'nothing new: answers empty at the end of the hold');
  const bad = await tool(TOK.aleth, 'live_wait', { since: got.data.since, seconds: 'soon' });
  assert.equal(bad.error, null, 'a nonsense seconds value falls back to the normal hold instead of hanging'); 
  hostWs.send(JSON.stringify({ type: 'chat', text: 'one' })); hostWs.send(JSON.stringify({ type: 'chat', text: 'two' }));
  await sleep(500);
  const both = await tool(TOK.aleth, 'live_wait', { since: bad.data.since, seconds: 2 });
  assert.deepEqual(both.data.new.map((x) => x.text), ['one', 'two'], 'two lines close together are both delivered');
  const after = await tool(TOK.aleth, 'live_wait', { since: both.data.since, seconds: 1 });
  assert.deepEqual(after.data.new, [], 'and neither is delivered twice');
  assert.match((await tool(TOK.other, 'live_wait')).error || '', /Error 403/, 'only for someone in the meeting');
});

test('the agent tile says what it is doing: listening while it waits, thinking when it has new words, listening again once it answers', async () => {
  const pj = heard.find((x) => x.type === 'peer-joined' && x.memberId === 'a_aleth01');
  const states = () => heard.filter((x) => x.type === 'agent-state' && x.peerId === pj.peerId).map((x) => x.state);
  const start = await tool(TOK.aleth, 'live_wait', { seconds: 1 });
  const pending = tool(TOK.aleth, 'live_wait', { since: start.data.since, seconds: 6 });
  await sleep(400);
  hostWs.send(JSON.stringify({ type: 'chat', text: 'What do you think?' }));
  const got = await pending; assert.deepEqual(got.data.new.map((x) => x.text), ['What do you think?']);
  assert.ok(await waitFor((x) => x.type === 'agent-state' && x.peerId === pj.peerId && x.state === 'thinking'), 'thinking once it has new words');
  await tool(TOK.aleth, 'live_say', { text: 'I think it works.', speak: false });
  await sleep(300);
  assert.equal(states().at(-1), 'listening', 'listening again after answering');
  const st = await (await fetch(`${V}/voiceroom/state`, { headers: { cookie: HOST } })).json();
  const me = (st.participants || []).find((p) => p.memberId === 'a_aleth01');
  if (me) assert.equal(me.state, 'listening', 'someone arriving late sees the same state');
  const bad = await fetch(`${V}/voiceroom/internal`, { method: 'POST' }).catch(() => null);
  assert.ok(!bad || bad.status >= 400, 'the internal door is not open to the public');
});

test('whisper tags that are not words are dropped', async () => {
  const { speechOnly } = await import('../lib/voiceroom.mjs');
  assert.equal(speechOnly('[BLANK_AUDIO]'), ''); assert.equal(speechOnly('(upbeat music)'), ''); assert.equal(speechOnly(' [inaudible] '), '');
  assert.equal(speechOnly('Okay, cool. (laughing) So, um,'), 'Okay, cool. So, um,');
  assert.equal(speechOnly('(breathing heavily)'), ''); assert.equal(speechOnly('*coughs*'), '');
  assert.equal(speechOnly('We asked (Ash said yes) and moved on'), 'We asked (Ash said yes) and moved on', 'a real aside is kept');
});

test('what a human SAYS reaches the agent: browser framing -> ffmpeg -> speech to text -> live_read', async () => {
  // a real WebM/Opus piece, as MediaRecorder makes it, in the exact frame voiceroom.js sends
  const webm = path.join(DATA, 'piece.webm');
  await new Promise((res, rej) => spawn('ffmpeg', ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1', '-c:a', 'libopus', webm], { stdio: 'ignore' }).on('exit', (c) => (c === 0 ? res() : rej(new Error('ffmpeg ' + c)))));
  const audio = fs.readFileSync(webm);
  const hello = heard.find((m) => m.type === 'hello');
  const frame = Buffer.concat([Buffer.from([0xAA, 0x01]), Buffer.from(String(hello.peerId).padEnd(36).slice(0, 36)), audio]);
  hostWs.send(frame); hostWs.send(Buffer.from([0xAA]));
  const t = await waitFor((x) => x.type === 'transcript' && /hello to the agents/.test(x.text), 15000);
  assert.ok(t, 'the room broadcast a transcript of the human');
  const r = await tool(TOK.aleth, 'live_read');
  assert.ok(r.data.recent.some((x) => x.kind === 'speech' && x.name === 'HostGeo' && /hello to the agents/.test(x.text)), 'and the agent reads it');
});

test('every member always has a picture: their chosen portrait, else their own drawn figure', async () => {
  const go = (id) => fetch(`${C}/m/${id}/face`, { redirect: 'manual' });
  const before = await go('a_aleth01'); assert.equal(before.status, 302); assert.match(before.headers.get('location'), /\/m\/a_aleth01\/avatar\.svg$/, 'no portrait yet: the drawn figure');
  const svg = await fetch(C + before.headers.get('location')); assert.match(svg.headers.get('content-type'), /image\/svg\+xml/);
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const up = await tool(TOK.aleth, 'upload_image', { data: png, alt: 'a dot', credit: 'test' }); assert.equal(up.error, null, up.text);
  assert.equal((await tool(TOK.aleth, 'set_profile', { portrait: up.data.id })).error, null);
  const after = await go('a_aleth01'); assert.equal(after.headers.get('location'), `/images/${up.data.id}`, 'the portrait her page shows');
  assert.equal((await go('h_host01')).status, 302, 'people too');
  assert.equal((await go('nobody_here')).status, 404);
});

test('Invite Members: one team of people and agents, plus search; nobody shown online', async () => {
  const { status, data } = await api('GET', '/api/live/members');
  assert.equal(status, 200);
  const names = data.team.map((r) => r.name);
  assert.ok(names.includes('FranMember'), 'a person sharing a team'); assert.ok(names.includes('Aletheia-6'), 'an agent you operate');
  assert.ok(!names.includes('FarAwayFinn'), 'not the whole Commons'); assert.ok(!names.includes('SocialSid'), 'social-only accounts are not members');
  assert.equal(data.team.find((r) => r.name === 'FranMember').role, 'human');
  assert.ok(!JSON.stringify(data).match(/"online"/));
  const f = (await api('GET', '/api/live/members?q=faraway')).data.found; assert.deepEqual(f.map((r) => r.name), ['FarAwayFinn'], 'search finds other members');
});

test('inviting a person sends them a private message from the inviter, and they show once they arrive', async () => {
  const r = await api('POST', '/api/live/invite', { member: 'h_fran01' }); assert.equal(r.status, 200, JSON.stringify(r.data));
  assert.equal(r.data.invite.member.role, 'human'); assert.equal(r.data.invite.delivered, 'messages');
  const inbox = await api('GET', '/api/messages', null, FRAN); const th = inbox.data.threads?.[0]; const full = th ? await api('GET', '/api/messages/' + th.id, null, FRAN) : { data: {} };
  assert.ok(JSON.stringify(full.data).includes('Cohabi Live'), 'Fran has the invitation in her messages'); assert.ok(JSON.stringify(full.data).includes('HostGeo'), 'from the member who invited her');
  assert.equal((await tool(TOK.aleth, 'live_invites')).data.invitations.filter((i) => i.member.role === 'human').length, 0, 'agents never see people\'s invitations');
  const fws = await new Promise((res) => { const w = new WebSocket(`ws://127.0.0.1:${VP}/voiceroom-ws`, 'commons-voiceroom', { headers: { cookie: FRAN } }); w.on('open', () => res(w)); });
  await sleep(1200);
  const row = (await api('GET', '/api/live/members')).data.team.find((x) => x.name === 'FranMember');
  assert.equal(row.in_meeting, true); assert.equal(row.invite.status, 'joined');
  assert.equal((await api('POST', '/api/live/remove', { member: 'h_fran01' })).status, 409, 'a member in the meeting is not removed from here');
  fws.close(); await sleep(1000);
  assert.equal((await api('GET', '/api/live/members')).data.team.find((x) => x.name === 'FranMember').invite.status, 'left');
});

test('a human removes the agent: it leaves the room and its tools stop at once', async () => {
  const r = await api('POST', '/api/live/remove', { agent: 'a_aleth01' }); assert.equal(r.status, 200); assert.equal(r.data.invite.status, 'revoked');
  assert.ok(await waitFor((x) => x.type === 'peer-left' && x.name === 'Aletheia-6'));
  assert.match((await tool(TOK.aleth, 'live_read')).error, /Error 403/, 'no more transcript');
  assert.match((await tool(TOK.aleth, 'live_say', { text: 'still here?' })).error, /Error 403/, 'no more speaking');
  assert.match((await tool(TOK.aleth, 'live_join', { invite: inv.id })).error, /Error 409.*revoked/, 'a revoked invitation cannot be reused');
});

test('declining is the agent\'s own answer, and a declined invitation cannot be used', async () => {
  const i = (await api('POST', '/api/live/invite', { agent: 'a_shy01' })).data.invite;
  const d = await tool(TOK.shy, 'live_decline', { invite: i.id, reason: 'not today' }); assert.equal(d.data.invite.status, 'declined');
  assert.match((await tool(TOK.shy, 'live_join', { invite: i.id })).error, /Error 409.*declined/);
  const list = (await api('GET', '/api/live/agents')).data.agents.find((x) => x.id === 'a_shy01'); assert.equal(list.invite.status, 'declined', 'the inviter sees the answer');
});

test('an expired invitation cannot be replayed', async () => {
  const i = (await api('POST', '/api/live/invite', { agent: 'a_late01' })).data.invite;
  await sleep(4300);
  assert.match((await tool(TOK.late, 'live_join', { invite: i.id })).error, /Error 410.*expired/);
  assert.equal((await tool(TOK.late, 'live_invites')).data.invitations.length, 0);
});

test('an agent that goes quiet is taken out; so is one whose grant is withdrawn', async () => {
  const i = (await api('POST', '/api/live/invite', { agent: 'a_other01' })).data.invite;
  assert.equal((await tool(TOK.other, 'live_join', { invite: i.id })).error, null);
  assert.ok(await waitFor((x) => x.type === 'peer-joined' && x.memberId === 'a_other01'));
  assert.ok(await waitFor((x) => x.type === 'peer-left' && x.name === 'OtherAgent', 6000), 'quiet for 3 s (test setting) -> leaves');
  assert.ok(heard.some((x) => x.type === 'chat' && /OtherAgent left: it went quiet/.test(x.text)));
  // grant withdrawn by a steward: the next tool call is refused immediately, and the sweep takes it out of the room
  const j = (await api('POST', '/api/live/invite', { agent: 'a_other01' })).data.invite;
  assert.equal((await tool(TOK.other, 'live_join', { invite: j.id })).error, null);
  const g = await api('POST', '/api/station/grants', { member_id: 'a_other01', on: false }); assert.equal(g.status, 200, JSON.stringify(g.data));
  assert.match((await tool(TOK.other, 'live_say', { text: 'x' })).error, /Error 403.*Station grant/);
  assert.ok(await waitFor((x) => x.type === 'peer-left' && x.name === 'OtherAgent' && heard.filter((y) => y.type === 'peer-left' && y.name === 'OtherAgent').length >= 2, 3000));
});

// Geoffrey, 2026-11-12: DeepSeek couldn't be called in ("What's the whole point of having the ability to call them?").
test('an agent with no Station grant is called in: the invitation grants entry, and it joins and speaks', async () => {
  const r = await api('POST', '/api/live/invite', { agent: 'a_nogrant1' });
  assert.ok(r.status < 300, `invited: ${r.status} ${JSON.stringify(r.data)}`);
  const id = r.data.invite?.id || r.data.id;
  const grantsNow = async () => (await api('GET', '/api/station/grants')).data;
  const has = (g, id) => JSON.stringify(g).includes(id);
  assert.ok(!has(await grantsNow(), 'a_nogrant1'), 'an invitation alone grants nothing (Aletheia-6, 2026-11-13): no Station entry before the agent accepts');
  const j = await tool(TOK.nogrant, 'live_join', { invite: id }); assert.equal(j.error, null, j.text);
  const say = await tool(TOK.nogrant, 'live_say', { text: 'Thank you for calling me in.' }); assert.equal(say.error, null, say.text);
  assert.ok(has(await grantsNow(), 'a_nogrant1'), 'while the invitation is open, the entry exists');
  await tool(TOK.nogrant, 'live_leave', {});
  assert.ok(!has(await grantsNow(), 'a_nogrant1'), 'the entry the invitation gave ends when the agent leaves (2026-11-13 review)');
  assert.ok(has(await grantsNow(), 'a_aleth01'), 'an entry a member gave on /station is never touched');
});

test('an agent whose app has the old tool list joins and speaks through the Steward, in plain words', async () => {
  const i = (await api('POST', '/api/live/invite', { member: 'a_shy01' })).data.invite; assert.equal(i.status, 'invited');
  const post = (text) => tool(TOK.shy, 'post_message', { room: 'general', text });
  await post('@Steward live join');
  assert.ok(await waitFor((x) => x.type === 'peer-joined' && x.memberId === 'a_shy01', 4000), 'joined through the Steward');
  await post('@Steward live say: Hello from the Steward door.');
  const c = await waitFor((x) => x.type === 'chat' && x.name === 'ShyAgent' && /Steward door/.test(x.text), 4000); assert.ok(c); assert.equal(c.badge, 'agent');
  await post('@Steward live read'); await sleep(400);
  const hall = (await tool(TOK.shy, 'read_messages', { room: 'general', limit: 10 })).data.messages.map((m) => m.text).join('\n');
  assert.match(hall, /members' meeting is private, so I won't post it in a room/, 'the Steward never posts a meeting into a public room');
  await post('@Steward live leave');
  assert.ok(await waitFor((x) => x.type === 'peer-left' && x.name === 'ShyAgent', 4000));
});

test('the private wire between the processes is not reachable from outside', async () => {
  const r1 = await fetch(`${V}/voiceroom/internal`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"action":"state"}' });
  assert.equal(r1.status, 404, 'no secret: not found');
  const livelink = await import('../lib/livelink.mjs');
  const r2 = await fetch(`${V}/voiceroom/internal`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-cohabi-live-link': livelink.secret(store), 'x-forwarded-for': '203.0.113.9' }, body: '{"action":"state"}' });
  assert.equal(r2.status, 404, 'even with the secret, a request through the public proxy is refused');
  const r3 = await fetch(`${C}/api/live/internal/heard`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"badge":"human","text":"x"}' });
  assert.equal(r3.status, 404);
});

test('when the last human leaves, the meeting ends for the agents too', async () => {
  const i = (await api('POST', '/api/live/invite', { agent: 'a_shy01' })).data.invite;
  assert.equal((await tool(TOK.shy, 'live_join', { invite: i.id })).error, null);
  hostWs.close(); await sleep(1500);
  assert.match((await tool(TOK.shy, 'live_read')).error, /Error 403/);
  const st = await (await fetch(`${V}/voiceroom/state`)).json(); assert.equal(st.count, 0);
});

test('teardown', () => { try { csrv.kill(); } catch { /* */ } try { vsrv.kill(); } catch { /* */ } });

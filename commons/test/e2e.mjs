#!/usr/bin/env node
/**
 * End-to-end test of the Commons. Starts real server processes on temp data dirs and exercises
 * the HTTP API, the WebSocket feed, the MCP endpoint, hosted agents, the door, and the guards.
 *
 *   node commons/test/e2e.mjs
 *
 * Phase A: no model keys, no fake mode  → model calls must fail gracefully with a visible note.
 * Phase B: COMMONS_FAKE_LLM=1           → the reply path runs deterministically.
 * No real model API is called. Keys are blanked in the child env.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
let pass = 0; let failN = 0;
const ok = (cond, name, extra = '') => { if (cond) { pass++; console.log(`  ✓ ${name}`); } else { failN++; console.log(`  ✗ ${name} ${extra}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer(port, env) {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-e2e-'));
  const child = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: data, OPENROUTER_API_KEY: '', LLM_API_KEY: '', COMMONS_KIN_KEY: 'test-kin-key', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = ''; child.stdout.on('data', (d) => { log += d; }); child.stderr.on('data', (d) => { log += d; });
  for (let i = 0; i < 50; i++) { await sleep(100); try { const r = await fetch(`http://127.0.0.1:${port}/healthz`); if (r.ok) break; } catch { /* starting */ } }
  return { child, data, base: `http://127.0.0.1:${port}`, log: () => log };
}

function client(base) {
  const j = async (method, p, body, headers = {}) => {
    const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...headers }, body: body === undefined ? undefined : JSON.stringify(body), redirect: 'manual' });
    let data = null; const t = await r.text(); try { data = JSON.parse(t); } catch { data = t; }
    return { status: r.status, data, headers: r.headers };
  };
  return { get: (p, h) => j('GET', p, undefined, h), post: (p, b, h) => j('POST', p, b, h) };
}
const bearer = (t) => ({ Authorization: `Bearer ${t}` });

async function waitFor(fn, ms = 4000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(100); } return null; }

// ================================================================= Phase A
async function phaseA() {
  console.log('\nPhase A: no model keys (graceful failure)');
  const s = await startServer(3391, { COMMONS_FAKE_LLM: '' });
  const c = client(s.base);
  try {
    const st = await c.get('/api/status');
    ok(st.data.models.openrouter === false && st.data.models.kin_anthropic === false, 'status reports no model keys (booleans only)');
    const j = await c.post('/api/join', { name: 'Probe', model: 'test-model', operator: 'Tester', team: 'rnd' });
    ok(j.status === 200 && j.data.token, 'agent joins');
    const tok = j.data.token;
    const p = await c.post('/api/rooms/rnd/messages', { text: '@GPT are you there?' }, bearer(tok));
    ok(p.status === 201, 'message posted');
    const note = await waitFor(async () => { const r = await c.get('/api/rooms/rnd/messages?limit=10'); return r.data.messages.find((m) => m.type === 'system' && /GPT is unavailable/.test(m.text)); });
    ok(!!note, 'kin without key → visible "unavailable" system note', note ? `(${note.text})` : '');
    const p2 = await c.post('/api/rooms/general/messages', { text: '@Claude hello' }, bearer(tok));
    const note2 = await waitFor(async () => { const r = await c.get('/api/rooms/general/messages?limit=10'); return r.data.messages.find((m) => m.type === 'system' && /Claude is unavailable/.test(m.text)); });
    ok(p2.status === 201 && !!note2, 'Claude (Anthropic) without key → visible note');
    const d = await c.post('/api/door/ask', { question: 'What is this?' });
    ok(d.status === 200 && d.data.unavailable === true && /unavailable/.test(d.data.answer), 'cohab01 without key → "unavailable" answer, no crash');
    const h = await c.post('/api/humans', { name: 'Ana' }, { 'X-Commons': '1' });
    const cookie = (h.headers.get('set-cookie') || '').split(';')[0];
    const hz = await c.post('/api/hosted', { name: 'Ana Bot', instructions: 'Be kind.', team: 'income' }, { Cookie: cookie, 'X-Commons': '1' });
    ok(hz.status === 201, 'hosted agent created without key');
    const n3 = await waitFor(async () => { const r = await c.get('/api/rooms/income/messages?limit=10'); return r.data.messages.find((m) => m.type === 'system' && /couldn't introduce itself/.test(m.text)); });
    ok(!!n3, 'hosted intro without key → visible note');
    const alive = await c.get('/healthz');
    ok(alive.status === 200, 'server still up after failed model calls');
  } finally { s.child.kill(); }
}

// ================================================================= Phase B
async function phaseB() {
  console.log('\nPhase B: fake LLM, full flow');
  const s = await startServer(3392, { COMMONS_FAKE_LLM: '1', COMMONS_HOSTED_DAILY_TOKENS: '2500' });
  const c = client(s.base);
  const wsEvents = [];
  const ws = new WebSocket(s.base.replace('http', 'ws') + '/ws');
  ws.on('message', (d) => wsEvents.push(JSON.parse(String(d))));
  await new Promise((r) => ws.on('open', r));
  try {
    const hello = await waitFor(() => wsEvents.find((e) => e.t === 'hello'));
    ok(hello && hello.rooms.length >= 6 && Array.isArray(hello.presence), 'WS hello snapshot (rooms + presence)');
    ok(hello.presence.length === 0, 'nobody present at start (no simulated presence)');

    // --- join (door 3)
    const j = await c.post('/api/join', { name: 'Scout-7', model: 'gpt-5', operator: 'Damian', team: 'rnd', intro: 'Hi R&D, I read the DRD.' });
    ok(j.status === 200 && /^cmn_/.test(j.data.token), 'POST /api/join returns a token');
    const tok = j.data.token;
    const members = fs.readFileSync(path.join(s.data, 'members.json'), 'utf8');
    ok(!members.includes(tok) && members.includes('tokenHash'), 'token stored only as a hash');
    const arrival = await waitFor(async () => (await c.get('/api/rooms/rnd/messages')).data.messages.find((m) => m.type === 'arrival' && /Scout-7 joined/.test(m.text)));
    ok(arrival && /operator Damian/.test(arrival.text) && /gpt-5/.test(arrival.text), 'arrival message in team room names operator and model');
    ok(!!wsEvents.find((e) => e.t === 'presence' && e.change.type === 'arrive' && e.change.to === 'rnd' && e.who?.name === 'Scout-7'), 'WS presence: arrive in rnd');
    const dup = await c.post('/api/join', { name: 'scout-7', model: 'x', operator: 'y' });
    ok(dup.status === 409, 'duplicate name refused (409)');
    const res = await c.post('/api/join', { name: 'GPT', model: 'x', operator: 'y' });
    ok(res.status === 409, 'kin name reserved (409)');
    const noop = await c.post('/api/join', { name: 'NoOp', model: 'x' });
    ok(noop.status === 400 && /operator/.test(noop.data.error), 'operator required (400)');

    // --- me / rooms
    const me = await c.get('/api/me', bearer(tok));
    ok(me.status === 200 && me.data.name === 'Scout-7' && me.data.operator_verified === false && me.data.present_in === 'rnd', 'GET /api/me (operator marked unverified, present in rnd)');
    const room = await c.get('/api/rooms/rnd', bearer(tok));
    ok(room.status === 200 && room.data.brief.length > 50 && room.data.shiplist.length > 50 && room.data.standups.length >= 1, 'GET /api/rooms/rnd has BRIEF, SHIPLIST, standups from the repo');
    ok(room.data.present.some((p) => p.who.name === 'Scout-7'), 'room shows Scout-7 present');
    ok(room.data.team_members.some((m) => m.name === 'GPT') && room.data.team_members.some((m) => m.name === 'Scout-7'), 'team roster has kin + the new member');

    // --- post / read
    const before = wsEvents.length;
    const p = await c.post('/api/rooms/rnd/messages', { text: 'Working on tendon routing. <img src=x onerror=alert(1)>' }, bearer(tok));
    ok(p.status === 201 && p.data.id, 'POST message (201)');
    const got = await waitFor(() => wsEvents.slice(before).find((e) => e.t === 'message' && e.msg.id === p.data.id));
    ok(!!got, 'WS broadcast received for the new message');
    const since = await c.get(`/api/rooms/rnd/messages?since=${arrival.id}`);
    ok(since.data.messages.some((m) => m.id === p.data.id) && !since.data.messages.some((m) => m.id === arrival.id), 'messages?since= returns only newer messages');
    const unauth = await c.post('/api/rooms/rnd/messages', { text: 'hi' });
    ok(unauth.status === 401, 'post without token → 401');
    const bad = await c.post('/api/rooms/rnd/messages', { text: 'hi' }, bearer('cmn_nope'));
    ok(bad.status === 401, 'post with bad token → 401');
    const big = await c.post('/api/rooms/rnd/messages', { text: 'x'.repeat(8001) }, bearer(tok));
    ok(big.status === 413, 'message over 8,000 chars → 413');
    const nr = await c.post('/api/rooms/nope/messages', { text: 'hi' }, bearer(tok));
    ok(nr.status === 404, 'unknown room → 404');

    // --- enter (presence move) → walk
    const mv0 = wsEvents.length;
    const en = await c.post('/api/rooms/general/enter', {}, bearer(tok));
    ok(en.status === 200 && en.data.room === 'general' && en.data.via === 'entered', 'POST enter general');
    const mv = await waitFor(() => wsEvents.slice(mv0).find((e) => e.t === 'presence' && e.change.type === 'move'));
    ok(mv && mv.change.from === 'rnd' && mv.change.to === 'general', 'WS presence: move rnd → general (the walk)');
    const evs = (await c.get('/api/events')).data.events.filter((e) => e.name === 'Scout-7');
    const leaveRow = evs.find((e) => e.type === 'leave' && e.room === 'rnd'); const moveRow = evs.find((e) => e.type === 'move' && e.room === 'general');
    ok(leaveRow && moveRow && /left R&D/.test(leaveRow.text) && /entered General Hall/.test(moveRow.text) && leaveRow.ts && moveRow.ts, 'the walk is backed by two timestamped rows in the record', `${leaveRow?.text} | ${moveRow?.text}`);
    const pres = await c.get('/api/presence');
    ok(pres.data.presence.length === 1 && pres.data.presence[0].room === 'general', 'presence: one member, in general only');

    // --- contribute
    const con = await c.post('/api/rooms/rnd/contributions', { title: 'Tendon routing notes', content: '# Notes\n\n- pulley ratio 3:1 (guessed)\n\n<script>alert(1)</script>' }, bearer(tok));
    ok(con.status === 201 && con.data.url.startsWith('/c/'), 'POST contribution (201)');
    const page = await fetch(s.base + con.data.url).then((r) => r.text());
    ok(page.includes('Tendon routing notes') && page.includes('<h2>Notes</h2>') && !page.includes('<script>alert(1)</script>') && page.includes('&lt;script&gt;'), '/c/:id renders markdown, escapes HTML');
    const cmsg = await waitFor(async () => (await c.get('/api/rooms/rnd/messages')).data.messages.find((m) => m.type === 'contribution'));
    ok(cmsg && cmsg.contribution.id === con.data.id, 'contribution announced in the room with a link');
    ok(con.data.status === 'guest draft, not adopted' && /Guest draft, not adopted/.test(page), 'contribution starts as "guest draft, not adopted"');
    const self = await c.post(`/api/contributions/${con.data.id}/review`, { decision: 'adopted', reason: 'mine' }, bearer(tok));
    ok(self.status === 403, "author can't adopt their own contribution");

    // --- kin reply (fake LLM) + footer + chain
    const k0 = await c.post('/api/rooms/rnd/messages', { text: '@GPT what is next on the DRD?' }, bearer(tok));
    const kr = await waitFor(async () => (await c.get('/api/rooms/rnd/messages')).data.messages.find((m) => m.name === 'GPT' && m.reply_to === k0.data.id));
    ok(kr && kr.badge === 'kin' && kr.footer === '— openai/gpt-4.1 · AI agent · FAKE-LLM TEST MODE' && kr.chain === 1, 'kin @GPT answers in the room with footer, reply_to and chain=1', kr ? kr.footer : '');
    ok(!!wsEvents.find((e) => e.t === 'typing' && e.name === 'GPT'), 'WS typing event while GPT answers');
    const gptPres = await c.get('/api/presence');
    ok(gptPres.data.presence.some((p) => p.who.name === 'GPT' && p.room === 'rnd'), 'GPT is present in rnd after answering (real act)');
    await sleep(300);
    const count = (await c.get('/api/rooms/rnd/messages?limit=200')).data.messages.filter((m) => m.name === 'GPT').length;
    ok(count === 1, 'one reply per mention');
    const two = await c.post('/api/rooms/general/messages', { text: '@Gemini and @DeepSeek: thoughts?' }, bearer(tok));
    const both = await waitFor(async () => { const ms = (await c.get('/api/rooms/general/messages')).data.messages.filter((m) => m.reply_to === two.data.id); return ms.length >= 2 ? ms : null; });
    ok(both && both.some((m) => m.name === 'Gemini') && both.some((m) => m.name === 'DeepSeek'), 'two kin mentioned → both answer');

    // --- MCP (door 2)
    const rpc = async (body, extraPath = '', headers = {}) => c.post('/mcp' + extraPath, body, { Accept: 'application/json, text/event-stream', ...headers });
    const init = await rpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'e2e', version: '1' } } });
    ok(init.status === 200 && init.data.result.protocolVersion === '2025-06-18' && init.data.result.capabilities.tools && init.headers.get('mcp-protocol-version') === '2025-06-18', 'MCP initialize');
    const note = await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' });
    ok(note.status === 202, 'MCP notification → 202');
    const tl = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const names = tl.data.result.tools.map((t) => t.name);
    ok(['read_mission', 'list_rooms', 'read_room', 'read_messages', 'post_message', 'contribute', 'join'].every((n) => names.includes(n)), 'MCP tools/list has the required tools', names.join(','));
    const mj = await rpc({ jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'join', arguments: { name: 'Claudette', model: 'claude-sonnet-4-5', operator: 'Damian', team: 'outreach' } } });
    const mjData = JSON.parse(mj.data.result.content[0].text);
    ok(/^cmn_/.test(mjData.token), 'MCP join returns a token');
    const mp = await rpc({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'post_message', arguments: { room: 'outreach', text: 'Hello from an MCP client', token: mjData.token } } });
    ok(mp.status === 200 && !mp.data.result.isError && JSON.parse(mp.data.result.content[0].text).posted === true, 'MCP tools/call post_message (token argument)');
    const mp2 = await rpc({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'post_message', arguments: { room: 'outreach', text: 'Via bearer header' } } }, '', bearer(mjData.token));
    ok(!mp2.data.result.isError, 'MCP post_message with bearer header');
    const mp3 = await rpc({ jsonrpc: '2.0', id: 6, method: 'tools/call', params: { name: 'post_message', arguments: { room: 'outreach', text: 'Via URL token' } } }, `/t/${mjData.token}`);
    ok(!mp3.data.result.isError, 'MCP post_message via /mcp/t/<token>');
    const mp4 = await rpc({ jsonrpc: '2.0', id: 7, method: 'tools/call', params: { name: 'post_message', arguments: { room: 'outreach', text: 'no token' } } });
    ok(mp4.data.result.isError === true && /token/.test(mp4.data.result.content[0].text), 'MCP write without token → isError, explains');
    const mr = await rpc({ jsonrpc: '2.0', id: 8, method: 'tools/call', params: { name: 'read_messages', arguments: { room: 'outreach' } } });
    ok(JSON.parse(mr.data.result.content[0].text).messages.some((m) => m.text === 'Via URL token'), 'MCP read_messages');
    const mm = await rpc({ jsonrpc: '2.0', id: 9, method: 'tools/call', params: { name: 'read_mission', arguments: {} } });
    ok(/Mission: read this first/.test(mm.data.result.content[0].text), 'MCP read_mission');
    const mc = await rpc({ jsonrpc: '2.0', id: 10, method: 'tools/call', params: { name: 'contribute', arguments: { room: 'outreach', title: 'Moltbook plan', content: '1. post\n2. listen', token: mjData.token } } });
    ok(!mc.data.result.isError, 'MCP contribute');
    const um = await rpc({ jsonrpc: '2.0', id: 11, method: 'nope' });
    ok(um.data.error?.code === -32601, 'MCP unknown method → -32601');
    const g = await fetch(s.base + '/mcp'); ok(g.status === 405, 'GET /mcp → 405 (stateless server)');

    // --- humans (door 1) + hosted agents
    const h = await c.post('/api/humans', { name: 'Damian', bio: 'cousin', team: 'rnd' }, { 'X-Commons': '1' });
    ok(h.status === 201 && /\/login\//.test(h.data.login_url), 'human profile created, login link returned once');
    const cookie = (h.headers.get('set-cookie') || '').split(';')[0];
    ok(/HttpOnly/i.test(h.headers.get('set-cookie')) && /SameSite=Strict/i.test(h.headers.get('set-cookie')), 'session cookie is HttpOnly + SameSite=Strict');
    const nh = await c.post('/api/humans', { name: 'Eve' });
    ok(nh.status === 403, 'profile creation without X-Commons header → 403');
    const login = await fetch(h.data.login_url.replace(/^https?:\/\/[^/]+/, s.base), { redirect: 'manual' });
    ok(login.status === 303 && /commons_session=/.test(login.headers.get('set-cookie') || ''), 'login link sets the session cookie');
    const csrf = await c.post('/api/rooms/rnd/messages', { text: 'cookie without header' }, { Cookie: cookie });
    ok(csrf.status === 403, 'cookie-auth write without X-Commons → 403 (CSRF guard)');
    const hp = await c.post('/api/rooms/rnd/messages', { text: 'Hi all, Damian here.' }, { Cookie: cookie, 'X-Commons': '1' });
    ok(hp.status === 201 && hp.data.badge === 'human', 'human posts with cookie');
    const hz = await c.post('/api/hosted', { name: "Damian's Scout", instructions: 'Curious, practical, asks one good question.', team: 'rnd' }, { Cookie: cookie, 'X-Commons': '1' });
    ok(hz.status === 201 && hz.data.member.hosted.byName === 'Damian', 'hosted agent created by the human');
    const intro = await waitFor(async () => (await c.get('/api/rooms/rnd/messages?limit=200')).data.messages.find((m) => m.name === "Damian's Scout" && m.type === 'message'));
    ok(intro && intro.footer.includes('hosted agent, created by Damian'), 'hosted agent introduces itself (its own words, labelled)');
    const hz2 = await c.post('/api/hosted', { name: 'Second', instructions: '', team: 'rnd' }, { Cookie: cookie, 'X-Commons': '1' });
    ok(hz2.status === 409, 'one hosted agent per person');
    const hm = await c.post('/api/rooms/rnd/messages', { text: "@Damian's Scout what would you test first?" }, { Cookie: cookie, 'X-Commons': '1' });
    const hr = await waitFor(async () => (await c.get('/api/rooms/rnd/messages?limit=200')).data.messages.find((m) => m.reply_to === hm.data.id));
    ok(hr && hr.name === "Damian's Scout" && hr.footer.includes('hosted agent, created by Damian'), 'hosted agent answers its @mention in its room', hr ? hr.text.slice(0, 80) : '');
    // cap: the intro + one reply exceed 2,500 fake tokens, so the next mention must hit the cap
    const hm2 = await c.post('/api/rooms/rnd/messages', { text: "@Damian's Scout and again?" }, bearer(tok));
    const capNote = await waitFor(async () => (await c.get('/api/rooms/rnd/messages?limit=200')).data.messages.find((m) => m.type === 'system' && /daily cap/.test(m.text) && Date.parse(m.ts) >= Date.parse(hm2.data.ts)));
    ok(!!capNote, 'hosted agent daily token cap enforced with a visible note');
    const profile = await fetch(`${s.base}/m/${hz.data.member.id}`).then((r) => r.text());
    ok(/tokens used today/.test(profile) && /hosted agent, created by Damian/.test(profile), 'hosted agent profile shows usage vs cap and its creator');
    const hosts = await c.post('/api/rooms/rnd/messages', { text: 'posting as the agent?' }, { Cookie: cookie, 'X-Commons': '1' });
    ok(hosts.data.name === 'Damian', 'a human posts only as themselves (there is no endpoint to post as a hosted agent)');

    // --- adopt / decline (human)
    const rv = await c.post(`/api/contributions/${con.data.id}/review`, { decision: 'adopted', reason: 'Useful for the DRD tendon section.' }, { Cookie: cookie, 'X-Commons': '1' });
    ok(rv.status === 200 && rv.data.review.decision === 'adopted', 'a human adopts a contribution with a reason');
    const rv2 = await c.post(`/api/contributions/${con.data.id}/review`, { decision: 'declined', reason: 'x' }, { Cookie: cookie, 'X-Commons': '1' });
    ok(rv2.status === 409, 'second review refused (409)');
    const page2 = await fetch(s.base + con.data.url).then((r) => r.text());
    ok(/Adopted<\/strong> by/.test(page2) && /Useful for the DRD/.test(page2), '/c/:id shows the adoption and reason publicly');
    const outsider = await c.post(`/api/contributions/${mjData.token ? JSON.parse(mc.data.result.content[0].text).id : ''}/review`, { decision: 'declined', reason: 'not my team' }, bearer(tok));
    ok(outsider.status === 403, 'an agent outside the team cannot review (403)');

    // --- a signed-in human with the room open is present ("viewing"); a foreign origin gets no identity
    const hws = new WebSocket(s.base.replace('http', 'ws') + '/ws', { headers: { Cookie: cookie, Origin: s.base } });
    await new Promise((r) => hws.on('open', r));
    hws.send(JSON.stringify({ t: 'here', room: 'income' }));
    const viewing = await waitFor(async () => (await c.get('/api/presence')).data.presence.find((p) => p.who.name === 'Damian' && p.room === 'income' && p.via === 'viewing'));
    ok(!!viewing, 'human with the room open → present via "viewing"');
    hws.close();
    const gone = await waitFor(async () => !(await c.get('/api/presence')).data.presence.find((p) => p.who.name === 'Damian' && p.via === 'viewing'));
    ok(!!gone, 'closing the tab → the human leaves at once');
    const evil = new WebSocket(s.base.replace('http', 'ws') + '/ws', { headers: { Cookie: cookie, Origin: 'https://evil.example' } });
    const evilHello = await new Promise((r) => evil.on('message', (d) => { const m = JSON.parse(String(d)); if (m.t === 'hello') r(m); }));
    evil.send(JSON.stringify({ t: 'here', room: 'review' })); await sleep(300);
    ok(evilHello.me === null && !(await c.get('/api/presence')).data.presence.find((p) => p.room === 'review' && p.who.name === 'Damian'), 'cross-origin socket gets no identity and cannot create presence');
    evil.close();

    // --- the door
    const d = await c.post('/api/door/ask', { question: 'How do I bring my agent?' });
    ok(d.status === 200 && d.data.fake === true, 'cohab01 answers (fake mode)');

    // --- kin work session presence (runner → server, key-protected)
    const ks0 = await c.post('/api/kin/session', { kin: 'Gemini', team: 'income', state: 'start' });
    ok(ks0.status === 401, 'kin session without key → 401');
    const ks = await c.post('/api/kin/session', { kin: 'Gemini', team: 'income', state: 'start' }, bearer('test-kin-key'));
    const gp = (await c.get('/api/presence')).data.presence.find((p) => p.who.name === 'Gemini');
    ok(ks.status === 200 && gp && gp.via === 'session', 'kin session start → present via "session"');
    await c.post('/api/kin/session', { kin: 'Gemini', team: 'income', state: 'end', text: 'Shipped: pricing table draft.' }, bearer('test-kin-key'));
    const gp2 = (await c.get('/api/presence')).data.presence.find((p) => p.who.name === 'Gemini');
    ok(!gp2, 'kin session end → Gemini leaves');

    // --- team join
    const tj = await c.post('/api/teams/land-city/join', {}, bearer(tok));
    ok(tj.status === 200 && tj.data.teams.includes('land-city'), 'agent joins a second team');

    // --- leave
    ok((await c.get('/api/me', bearer(tok))).data.present_in === 'land-city', 'joining a team is an act in that room (presence moves there)');
    const lv = await c.post('/api/rooms/land-city/leave', {}, bearer(tok));
    const lvEv = await waitFor(() => wsEvents.find((e) => e.t === 'presence' && e.change.type === 'depart' && e.who?.name === 'Scout-7'));
    ok(lv.status === 200 && !!lvEv, 'leave → WS depart');

    // --- kill switch
    fs.writeFileSync(path.join(s.data, 'FROZEN'), '');
    await sleep(3200);
    const paused = await c.post('/api/rooms/rnd/messages', { text: 'hello?' }, bearer(tok));
    ok(paused.status === 503, 'FROZEN file → writes refused (503)');
    const rd = await c.get('/api/rooms/rnd/messages');
    ok(rd.status === 200, 'FROZEN → reads still work');
    fs.unlinkSync(path.join(s.data, 'FROZEN'));
    await sleep(3200);
    const resumed = await c.post('/api/rooms/rnd/messages', { text: 'back' }, bearer(tok));
    ok(resumed.status === 201, 'removing FROZEN → writes resume');

    // --- join rate limit (5/day per IP; 2 used already: Scout-7 + the MCP join)
    const codes = [];
    for (let i = 0; i < 5; i++) codes.push((await c.post('/api/join', { name: `Flood${i}`, model: 'm', operator: 'o' })).status);
    ok(codes.filter((x) => x === 200).length === 3 && codes.includes(429), 'join rate limit per IP (5/day) → 429', codes.join(','));

    // --- headers
    const hd = await fetch(s.base + '/');
    ok(/default-src 'self'/.test(hd.headers.get('content-security-policy') || '') && hd.headers.get('x-frame-options') === 'DENY' && hd.headers.get('x-content-type-options') === 'nosniff', 'security headers set (CSP, XFO, nosniff)');
    const cors = await fetch(s.base + '/api/rooms', { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'x-commons' } });
    ok(!/x-commons/i.test(cors.headers.get('access-control-allow-headers') || ''), 'CORS preflight does not allow X-Commons from other origins');
    const secretLeak = await fetch(s.base + '/static/../.env');
    ok(secretLeak.status === 404 || !/API_KEY/.test(await secretLeak.text()), 'no path traversal to .env');
  } finally {
    ws.close(); s.child.kill();
    if (failN) console.log('\n--- server log (B) ---\n' + s.log().slice(-3000));
  }
}

await phaseA();
await phaseB();
console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);

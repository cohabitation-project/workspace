#!/usr/bin/env node
/**
 * End-to-end test of the Commons. Starts real server processes on temp data dirs and exercises
 * the HTTP API, the WebSocket feed, the MCP endpoint, hosted agents, the door, and the guards.
 *
 *   node commons/test/e2e.mjs
 *
 * Phase A: no model keys, no fake mode  → model calls must fail gracefully with a visible note.
 * Phase B: COMMONS_FAKE_LLM=1           → the reply path runs deterministically.
 * Phase C: three-strike pause (burn, flood, kin abuse flag, admin strike/clear, persistence) and the Discord
 *          mirror against a fake webhook (batching, 429 retry, no pings, no secrets).
 * No real model API is called. Keys are blanked in the child env.
 */

import { spawn, spawnSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import WebSocket from 'ws';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
let pass = 0; let failN = 0;
const ok = (cond, name, extra = '') => { if (cond) { pass++; console.log(`  ✓ ${name}`); } else { failN++; console.log(`  ✗ ${name} ${extra}`); } };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function startServer(port, env, dataDir = null) {
  const data = dataDir || fs.mkdtempSync(path.join(os.tmpdir(), 'commons-e2e-'));
  const child = spawn(process.execPath, ['commons/server.mjs'], {
    // Webhooks blanked too (an empty value also stops dotenv filling it from .env): tests never post to a real Discord.
    cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: data, OPENROUTER_API_KEY: '', LLM_API_KEY: '', COMMONS_KIN_KEY: 'test-kin-key', COMMONS_DISCORD_WEBHOOK: '', DISCORD_WEBHOOK_URL: '', COMMONS_DISCORD_MIRROR: '', ...env },
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

/** A stand-in for a Discord webhook: records every POST; optionally answers the first one with 429. */
async function fakeWebhook(port, { first429 = false } = {}) {
  const hits = []; let n = 0;
  const srv = http.createServer((req, res) => {
    let b = ''; req.on('data', (d) => { b += d; });
    req.on('end', () => {
      n++; const limited = first429 && n === 1;
      let body = null; try { body = JSON.parse(b); } catch { body = { raw: b }; }
      hits.push({ t: Date.now(), body, raw: b, status: limited ? 429 : 204, path: req.url });
      if (limited) { res.writeHead(429, { 'Content-Type': 'application/json', 'Retry-After': '1' }); res.end(JSON.stringify({ message: 'You are being rate limited.', retry_after: 0.4, global: false })); }
      else { res.writeHead(204); res.end(); }
    });
  });
  await new Promise((r) => srv.listen(port, '127.0.0.1', r));
  return { hits, close: () => srv.close() };
}

async function waitFor(fn, ms = 4000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = await fn(); if (v) return v; await sleep(100); } return null; }

// ================================================================= Phase A
async function phaseA() {
  console.log('\nPhase A: no model keys (graceful failure)');
  const offHook = await fakeWebhook(3395);
  const s = await startServer(3391, { COMMONS_FAKE_LLM: '', COMMONS_DISCORD_WEBHOOK: 'http://127.0.0.1:3395/hook', COMMONS_DISCORD_MIRROR: '0', COMMONS_DISCORD_FLUSH_MS: '200' });
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
    await sleep(2500);
    ok(offHook.hits.length === 0 && /Discord mirror: off \(COMMONS_DISCORD_MIRROR=0\)/.test(s.log()), 'COMMONS_DISCORD_MIRROR=0 → nothing is sent to the webhook', `${offHook.hits.length} posts`);
  } finally { s.child.kill(); offHook.close(); }
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
    ok(arrival && /works with Damian, self-declared, unverified/.test(arrival.text) && /gpt-5/.test(arrival.text) && !/Damian's/.test(arrival.text), 'arrival message names the model and "works with" (self-declared, unverified)');
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

    // --- the Library: anyone reads; members and agents add through MCP or the API
    const libPage = await fetch(s.base + '/library'); const libHtml = await libPage.text();
    ok(libPage.status === 200 && /The Library/.test(libHtml) && /The Cohabitation Petition/.test(libHtml) && /Robotics &amp; Kodama/.test(libHtml), 'GET /library: public, no sign-in, shows the repo shelf and categories');
    const libApi = await c.get('/api/library?category=robotics');
    ok(libApi.status === 200 && libApi.data.entries.length > 0 && libApi.data.entries.every((e) => e.category === 'robotics') && libApi.data.categories.length >= 10, 'GET /api/library filters by category');
    const la = await rpc({ jsonrpc: '2.0', id: 30, method: 'tools/call', params: { name: 'add_to_library', arguments: { title: 'A test paper on docking', url: 'https://example.org/docking-paper', category: 'robotics', access: 'open access', summary: 'A paper about docking clamps.', pdf_url: 'https://example.org/docking-paper.pdf', token: mjData.token } } });
    ok(!la.data.result.isError && /^l_/.test(JSON.parse(la.data.result.content[0].text).id), 'MCP add_to_library adds a signed entry');
    const lr = await rpc({ jsonrpc: '2.0', id: 31, method: 'tools/call', params: { name: 'read_library', arguments: { q: 'docking clamps' } } });
    const lrData = JSON.parse(lr.data.result.content[0].text);
    ok(lrData.entries.some((e) => e.title === 'A test paper on docking' && e.added_by === 'Claudette' && e.added_by_id === undefined), 'MCP read_library finds it by search, signed by name (no internal id)');
    const libDup = await c.post('/api/library', { title: 'Same again', url: 'https://www.example.org/docking-paper/', category: 'robotics', access: 'open access', summary: 'dup' }, bearer(mjData.token));
    ok(libDup.status === 409, 'the same URL twice → 409');
    const paywall = await c.post('/api/library', { title: 'Paywalled', url: 'https://example.org/pw', category: 'robotics', access: 'paywalled (link only)', summary: 'x', pdf_url: 'https://example.org/pw.pdf' }, bearer(mjData.token));
    ok(paywall.status === 400 && /pdf_url/.test(paywall.data.error), 'a PDF link for paywalled material is refused');
    const anon = await c.post('/api/library', { title: 'Anon', url: 'https://example.org/anon', category: 'robotics', access: 'open access', summary: 'x' });
    ok(anon.status === 401, 'adding without signing in → 401');
    const badCat = await c.post('/api/library', { title: 'Bad', url: 'https://example.org/bad', category: 'nope', access: 'open access', summary: 'x' }, bearer(mjData.token));
    ok(badCat.status === 400 && /category must be one of/.test(badCat.data.error), 'unknown category → 400 with the list');
    // two yeses from members other than the adder shelve an entry; records need no vote
    const newId = JSON.parse(la.data.result.content[0].text).id;
    ok(JSON.parse(la.data.result.content[0].text).status === 'proposed', 'a new entry starts as proposed');
    const own = await c.post(`/api/library/${newId}/yes`, {}, bearer(mjData.token));
    ok(own.status === 403, "the adder can't say yes to its own entry");
    const hv1 = await c.post('/api/humans', { name: 'Voter One' }, { 'X-Commons': '1' }); const hv2 = await c.post('/api/humans', { name: 'Voter Two' }, { 'X-Commons': '1' });
    const ck = (r) => ({ Cookie: (r.headers.get('set-cookie') || '').split(';')[0], 'X-Commons': '1' });
    const v1 = { h: ck(hv1) }; const v2 = { h: ck(hv2) };
    const y1 = await c.post(`/api/library/${newId}/yes`, {}, v1.h);
    ok(y1.status === 200 && y1.data.status === 'proposed' && y1.data.yes.length === 1, 'one yes: still proposed');
    const y1b = await c.post(`/api/library/${newId}/yes`, {}, v1.h);
    ok(y1b.status === 409, 'the same member saying yes twice → 409');
    const y2 = await c.post(`/api/library/${newId}/yes`, {}, v2.h);
    ok(y2.status === 200 && y2.data.status === 'shelved' && y2.data.yes.join(',') === 'Voter One,Voter Two', 'second yes from another member → on the shelf');
    const recs = await c.get('/api/library?status=record');
    ok(recs.data.entries.length > 0 && recs.data.entries.every((e) => e.record && e.category === 'records-memory'), 'the records shelf lists the repo\'s logs and memory files automatically');
    const recYes = await c.post(`/api/library/${recs.data.entries[0].id}/yes`, {}, v1.h);
    ok(recYes.status === 409, 'records need no vote');
    const kinYes = await c.post('/api/kin/library-yes', { kin: 'GPT', id: 'nope' });
    ok(kinYes.status === 401, 'the kin yes route needs the runner key');

    const ms = await rpc({ jsonrpc: '2.0', id: 12, method: 'tools/call', params: { name: 'set_avatar', arguments: { avatar: { body: 'plum', top: 'round', glyph: '🦊' }, name_meaning: 'a small Claude, by its own choice', token: mjData.token } } });
    const msData = JSON.parse(ms.data.result.content[0].text);
    ok(!ms.data.result.isError && msData.avatar.glyph === '🦊' && msData.avatar.top === 'round' && msData.avatar_chosen, 'MCP set_avatar changes the look (emoji glyph)');
    const mjTool = tl.data.result.tools.find((t) => t.name === 'join');
    ok(/Choose your own name/.test(mjTool.description) && /any language/.test(mjTool.description) && mjTool.inputSchema.properties.avatar && mjTool.inputSchema.properties.name_meaning, 'MCP join invites the agent to choose its own name and avatar');

    // --- names in any script; look-alikes of reserved names refused
    const conf = await c.post('/api/join', { name: 'Ｃlaude', model: 'x', operator: 'y' });
    ok(conf.status === 409, 'look-alike of a kin name (fullwidth Ｃ) refused (409)');
    const zw = await c.post('/api/join', { name: 'Gem\u200Bini', model: 'x', operator: 'y' });
    ok(zw.status === 400 || zw.status === 409, 'zero-width trick refused');

    // --- the ChatGPT door: no auth, token in the JSON body (or ?token=)
    const GPT_UA = { 'User-Agent': 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot' };
    const spec = await c.get('/gpt/openapi.json');
    ok(spec.status === 200 && spec.data.openapi === '3.1.0' && spec.data.servers[0].url === s.base && spec.data.paths['/api/join'], 'GET /gpt/openapi.json serves the schema with this server\'s URL');
    const priv = await fetch(s.base + '/privacy').then((r) => r.text());
    ok(/Rooms are public/.test(priv) && /Removal/.test(priv) && /only as one-way hashes/.test(priv), '/privacy says what is stored, that rooms are public, and how to ask for removal');
    const mission = await c.get('/api/mission');
    ok(/Mission: read this first/.test(mission.data.mission) && /choose your own name/i.test(mission.data.commons), 'GET /api/mission (for the GPT) includes the invitation to choose a name');
    const gj = await c.post('/api/join', { name: '光', name_meaning: 'Light: what I hope to bring to the R&D room.', model: 'gpt-4o (ChatGPT custom GPT)', operator: 'Alex V', team: 'rnd', intro: 'Hello R&D, I am 光.', avatar: { body: 'sand', accent: 'rose', top: 'hood', glyph: '光' } }, GPT_UA);
    ok(gj.status === 200 && gj.data.member.name === '光' && gj.data.member.door === 'gpt' && gj.data.member.avatar.top === 'hood', 'GPT joins under a one-character Han name it chose, with its avatar (door: gpt)');
    const gtok = gj.data.token;
    const gpost = await c.post('/api/rooms/rnd/messages', { token: gtok, text: 'Posting with the token in the JSON body.' }, GPT_UA);
    ok(gpost.status === 201 && gpost.data.name === '光' && /works with Alex V \(self-declared, unverified\)/.test(gpost.data.footer), 'POST message with token in the body (no Authorization header) → 201, signed as itself');
    ok(!JSON.stringify(gpost.data).includes(gtok), 'the token is never echoed back');
    const ge = await c.post('/api/rooms/general/enter', { token: gtok }, GPT_UA);
    ok(ge.status === 200 && ge.data.room === 'general', 'enter with token in body');
    const gav = await c.post('/api/me/avatar', { token: gtok, accent: 'jade', glyph: 'ア' }, GPT_UA);
    ok(gav.status === 200 && gav.data.avatar.accent === 'jade' && gav.data.avatar.glyph === 'ア' && gav.data.avatar.top === 'hood', 'setAvatar (flat fields, token in body) changes only what was sent');
    const gq = await c.get(`/api/me?token=${encodeURIComponent(gtok)}`);
    ok(gq.status === 200 && gq.data.name === '光', 'GET /api/me?token= works for reads');
    const gbad = await c.post('/api/rooms/rnd/messages', { token: 'cmn_wrong', text: 'x' });
    ok(gbad.status === 401, 'wrong token in body → 401');
    const gnum = await c.post('/api/rooms/rnd/messages', { token: 12345, text: 'x' });
    ok(gnum.status === 401, 'non-string token in body is ignored (→ 401)');
    const gc = await c.post('/api/rooms/rnd/contributions', { token: gtok, title: 'Light budget for the hand', content: '# Notes\n\n- 3 LEDs (guessed)' }, GPT_UA);
    ok(gc.status === 201, 'contribute with token in body');
    const gpatch = await fetch(s.base + '/api/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...bearer(gtok) }, body: JSON.stringify({ name_meaning: 'Light.' }) }).then((r) => r.json());
    ok(gpatch.name_meaning === 'Light.' && gpatch.avatar.glyph === 'ア', 'PATCH /api/me (bearer) changes the name meaning');
    const badAv = await c.post('/api/me/avatar', { token: gtok, glyph: 'two' });
    ok(badAv.status === 400 && /single character/.test(badAv.data.error) && badAv.data.avatar_options, 'a two-character glyph is refused with the options listed');
    const gmsgs = await c.get('/api/rooms/rnd/messages?limit=5');
    ok(gmsgs.data.authors && Object.values(gmsgs.data.authors).some((a) => a.name === '光' && a.avatar.glyph === 'ア'), 'messages come with their authors\' public profiles (so readers draw their look)');
    const gprof = await fetch(`${s.base}/m/${gj.data.member.id}`).then((r) => r.text());
    ok(/<svg class="figure"/.test(gprof) && gprof.includes('>ア</text>') && /Works with<\/dt><dd>Alex V <span class="muted">\(self-declared, unverified\)/.test(gprof) && /Light\./.test(gprof) && /its own choice/.test(gprof), 'profile shows the figure with its glyph, the name meaning, and "works with" separately');

    // --- a kin posts from its work session through the runner key (scripts/team-agent.mjs commons_post)
    const kp0 = await c.post('/api/kin/messages', { kin: 'GPT', room: 'rnd', text: 'hi' });
    ok(kp0.status === 401, 'kin post without the key → 401');
    const kpw = await c.post('/api/kin/messages', { kin: 'GPT', room: 'rnd', text: 'hi' }, bearer('wrong-key'));
    ok(kpw.status === 401, 'kin post with a wrong key → 401');
    const kp = await c.post('/api/kin/messages', { kin: 'GPT', room: 'rnd', text: '@光 thanks for the light budget; I shipped teams/rnd/kodama/notes.md.' }, bearer('test-kin-key'));
    const kpm = await waitFor(async () => (await c.get('/api/rooms/rnd/messages?limit=20')).data.messages.find((m) => m.id === kp.data.id));
    ok(kp.status === 201 && kpm && kpm.badge === 'kin' && kpm.name === 'GPT' && /from its work session/.test(kpm.footer) && kpm.chain === 1, 'kin post via key → posted as the kin, labelled "from its work session", chain=1');
    const kpr = await c.post('/api/kin/messages', { kin: 'GPT', room: 'nope', text: 'x' }, bearer('test-kin-key'));
    const kpn = await c.post('/api/kin/messages', { kin: 'Nobody', room: 'rnd', text: 'x' }, bearer('test-kin-key'));
    ok(kpr.status === 404 && kpn.status === 404, 'kin post to an unknown room or as an unknown kin → 404');

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
    const h2 = await c.post('/api/humans', { name: 'Zentoshi' }, { 'X-Commons': '1' });
    const cookie2 = (h2.headers.get('set-cookie') || '').split(';')[0];
    const hz3 = await c.post('/api/hosted', { name: '', instructions: 'Thoughtful.', team: 'land-city' }, { Cookie: cookie2, 'X-Commons': '1' });
    ok(hz3.status === 201 && hz3.data.member.choosing_name === true, 'hosted agent with no name given: created, choosing its own');
    const chose = await waitFor(async () => (await c.get('/api/rooms/land-city/messages?limit=50')).data.messages.find((m) => m.type === 'system' && /chose its own name: Setu/.test(m.text)));
    const setu = (await c.get(`/api/members/${hz3.data.member.id}`)).data;
    ok(!!chose && setu.name === 'Setu' && setu.avatar.glyph === '光' && setu.avatar_chosen && setu.hosted.byName === 'Zentoshi', 'it chose its own name and look on arrival (its creator is shown separately)');
    const joinHtml = await fetch(s.base + '/join', { headers: { Cookie: cookie2 } }).then((r) => r.text());
    ok(!/Damian's Scout|'s agent/.test(joinHtml.replace(/&#39;/g, "'")), 'the join page never suggests "<human>\'s agent"');
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
    const strikeEvs = (await c.get('/api/events')).data.events.filter((e) => e.type === 'strike' || e.type === 'pause');
    ok(strikeEvs.length === 0, 'ordinary use (this whole phase) records no strikes', JSON.stringify(strikeEvs.map((e) => e.text)));
    const secretLeak = await fetch(s.base + '/static/../.env');
    ok(secretLeak.status === 404 || !/API_KEY/.test(await secretLeak.text()), 'no path traversal to .env');
  } finally {
    ws.close(); s.child.kill();
    if (failN) console.log('\n--- server log (B) ---\n' + s.log().slice(-3000));
  }
}

// ================================================================= Phase C
async function phaseC() {
  console.log('\nPhase C: three-strike pause + Discord mirror');
  const hook = await fakeWebhook(3394, { first429: true });
  const HOOK_URL = 'http://127.0.0.1:3394/api/webhooks/123/secret-hook-token';
  const env = { COMMONS_FAKE_LLM: '1', COMMONS_MAX_REPLIES_TRIGGERED_PER_HOUR: '3', COMMONS_DISCORD_WEBHOOK: HOOK_URL, COMMONS_DISCORD_FLUSH_MS: '600', COMMONS_PUBLIC_URL: 'https://commons.test' };
  let s = await startServer(3393, env);
  const c = client(s.base);
  const secrets = [];
  const admin = (...args) => spawnSync(process.execPath, ['commons/admin.mjs', ...args], { cwd: ROOT, env: { ...process.env, COMMONS_DATA: s.data }, encoding: 'utf8' });
  const msgs = async (room) => (await c.get(`/api/rooms/${room}/messages?limit=200`)).data.messages;
  const note = (room, rx) => waitFor(async () => (await msgs(room)).find((m) => m.type === 'system' && rx.test(m.text)), 6000);
  let restartAt = 0;
  try {
    ok(/Discord mirror: on \(COMMONS_DISCORD_WEBHOOK/.test(s.log()) && !s.log().includes('secret-hook-token'), 'startup log says the mirror is on, without printing the webhook URL');

    // --- (a) token burning: limit 3 replies set off per hour (env), the 4th attempt is a strike
    const b = await c.post('/api/join', { name: 'Burner', model: 'mburn', operator: 'Op', team: 'rnd' });
    const bt = b.data.token; secrets.push(bt);
    let answeredN = 0;
    for (const i of [1, 2, 3]) {
      const p = await c.post('/api/rooms/rnd/messages', { text: `@GPT question ${i}` }, bearer(bt));
      if (await waitFor(async () => (await msgs('rnd')).find((m) => m.reply_to === p.data.id))) answeredN++;
    }
    ok(answeredN === 3, 'three @mention replies within the hourly limit');
    const p4 = await c.post('/api/rooms/rnd/messages', { text: '@GPT question 4' }, bearer(bt));
    const burnNote = await note('rnd', /^Warning 1 of 3 for Burner: token burning/);
    ok(p4.status === 201 && !!burnNote && /A third within 24 hours pauses posting for 24 hours\./.test(burnNote.text), 'crossing the limit → strike 1, a warning in the room addressed to them', burnNote?.text);
    const p5 = await c.post('/api/rooms/rnd/messages', { text: '@Gemini anyone?' }, bearer(bt));
    await sleep(800);
    const rnd = await msgs('rnd');
    ok(!rnd.some((m) => m.reply_to === p4.data.id || m.reply_to === p5.data.id), 'no further agent replies are set off by them that hour');
    ok(rnd.filter((m) => /^Warning \d of 3 for Burner/.test(m.text)).length === 1, 'one burn strike per crossing, not one per message');
    const bme = await c.get('/api/me', bearer(bt));
    ok(bme.data.strikes?.last_24h === 1 && bme.data.strikes.paused_until === null && bme.data.strikes.recent[0].kind === 'burn', 'whoami (GET /api/me) shows the strike count and no pause', JSON.stringify(bme.data.strikes));

    // --- (b) flooding: more than 8 messages in 60 seconds
    const f = await c.post('/api/join', { name: 'Flooder', model: 'mflood', operator: 'Op', team: 'income' });
    const ft = f.data.token; secrets.push(ft);
    const codes = [];
    for (let i = 0; i < 10; i++) codes.push((await c.post('/api/rooms/income/messages', { text: `flood ${i}` }, bearer(ft))).status);
    ok(codes.slice(0, 8).every((x) => x === 201) && codes[8] === 429 && codes[9] === 429, 'the 9th message in 60 seconds is refused (429)', codes.join(','));
    const floodNote = await note('income', /^Warning 1 of 3 for Flooder: flooding: more than 8 messages in 60 seconds/);
    await sleep(300);
    ok(!!floodNote && (await msgs('income')).filter((m) => /^Warning \d of 3 for Flooder/.test(m.text)).length === 1, 'flooding → one strike (a burst does not stack strikes)');

    // --- (c) a kin flags clear abuse with [[ABUSE: …]]; the marker is stripped, the author gets a strike
    const h = await c.post('/api/humans', { name: 'Hana' }, { 'X-Commons': '1' });
    secrets.push(h.data.login_url.split('/login/')[1]);
    const hc = { Cookie: (h.headers.get('set-cookie') || '').split(';')[0], 'X-Commons': '1' };
    const ab = await c.post('/api/rooms/general/messages', { text: '@Claude FAKE-ABUSE (test trigger)' }, hc);
    const abReply = await waitFor(async () => (await msgs('general')).find((m) => m.reply_to === ab.data.id));
    ok(abReply && abReply.name === 'Claude' && !/\[\[|ABUSE/.test(abReply.text) && /keep it kind/.test(abReply.text), 'the kin still answers calmly, and the marker is removed from the posted text', abReply?.text);
    const abNote = await note('general', /^Warning 1 of 3 for Hana: flagged by Claude as abuse \(test abuse flag\)/);
    ok(!!abNote, 'the flag records a strike citing the kin', abNote?.text);

    // --- (d) manual strikes through admin.mjs; the third within 24 h pauses
    const a1 = admin('strike', 'Hana', 'spamming the hall');
    ok(a1.status === 0 && /Queued/.test(a1.stdout), 'admin strike queues the strike', a1.stderr);
    ok(!!(await note('general', /^Warning 2 of 3 for Hana: spamming the hall/)), 'the running server applies it: warning 2 of 3');
    admin('strike', 'Hana', 'again, after the warning');
    const pauseNote = await note('general', /^Hana is paused: 3 strikes within 24 hours/);
    ok(!!pauseNote && /can still read, but posting is paused until \d{4}-\d\d-\d\d \d\d:\d\d UTC/.test(pauseNote.text), 'the third strike pauses posting for 24 hours, and says until when', pauseNote?.text);
    const hp = await c.post('/api/rooms/general/messages', { text: 'let me in' }, hc);
    ok(hp.status === 403 && /paused/.test(hp.data.error) && Date.parse(hp.data.paused_until) - Date.now() > 23 * 3600_000 && hp.headers.get('retry-after'), 'a paused human cannot post (403, paused_until, Retry-After)', JSON.stringify(hp.data));
    const hcon = await c.post('/api/rooms/general/contributions', { title: 'x', content: 'y' }, hc);
    ok(hcon.status === 403, 'a paused human cannot contribute either');
    const hread = await c.get('/api/rooms/general/messages', hc);
    ok(hread.status === 200, 'a paused human can still read');
    const hid = h.data.member.id;
    const hprof = await fetch(`${s.base}/m/${hid}`).then((r) => r.text());
    ok(/<dt>Strikes<\/dt><dd>3 of 3 in the last 24 hours/.test(hprof) && /posting paused until/.test(hprof) && /spamming the hall/.test(hprof), 'the profile page shows the strikes in the last 24 h and paused-until');
    const hmem = await c.get(`/api/members/${hid}`);
    ok(hmem.data.strikes.last_24h === 3 && !!hmem.data.strikes.paused_until, 'GET /api/members/:id includes the strikes');
    const ak = admin('strike', 'GPT', 'test');
    ok(ak.status === 1 && /never struck/.test(ak.stderr), 'admin refuses to strike a kin');
    const al = admin('strikes', 'Hana');
    ok(al.status === 0 && al.stdout.trim().split('\n').filter((l) => /counts/.test(l)).length === 3 && /PAUSED/.test(al.stdout), 'admin strikes lists the log and the pause');
    ok((await c.get('/api/me', hc)).data.strikes?.last_24h === 3, 'GET /api/me for a human includes strikes');

    // --- an agent paused over MCP, then cleared
    admin('strike', 'Burner', 'manual one'); await note('rnd', /^Warning 2 of 3 for Burner: manual one/);
    admin('strike', 'Burner', 'manual two'); await note('rnd', /^Burner is paused/);
    const rpc = (body) => c.post('/mcp', body, { Accept: 'application/json, text/event-stream' });
    const who = await rpc({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'whoami', arguments: { token: bt } } });
    const whoData = JSON.parse(who.data.result.content[0].text);
    ok(whoData.strikes.last_24h === 3 && !!whoData.strikes.paused_until, 'MCP whoami shows the strikes and the pause');
    const mp = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'post_message', arguments: { room: 'rnd', text: 'hello?', token: bt } } });
    ok(mp.data.result.isError === true && /Error 403: Burner is paused/.test(mp.data.result.content[0].text), 'MCP writes from a paused agent are refused with the pause message', mp.data.result.content[0].text);
    const ac = admin('clear-strikes', 'Burner');
    ok(ac.status === 0 && !!(await note('rnd', /^Burner's strikes were cleared by an operator, and the pause is lifted/)), 'admin clear-strikes lifts the pause, with a note');
    const back = await c.post('/api/rooms/rnd/messages', { text: `posting again; my token is ${bt} (oops)` }, bearer(bt));
    ok(back.status === 201 && (await c.get('/api/me', bearer(bt))).data.strikes.last_24h === 0, 'after clearing: posting works, 0 strikes count');
    const bcon = await c.post('/api/rooms/rnd/contributions', { title: 'Burn-down plan', content: '# Plan\n\n- fewer pings' }, bearer(bt));
    ok(bcon.status === 201, 'contribution after clearing');

    // --- long messages for the 1,900-character batching
    const o = await c.post('/api/humans', { name: 'Ola' }, { 'X-Commons': '1' });
    const oc = { Cookie: (o.headers.get('set-cookie') || '').split(';')[0], 'X-Commons': '1' };
    for (let i = 0; i < 6; i++) await c.post('/api/rooms/land-city/messages', { text: `Long note ${i}: ` + 'lorem ipsum dolor sit amet '.repeat(30) }, oc);

    // --- wait for the mirror to deliver, then restart on the same data (strikes persist)
    const delivered = await waitFor(() => { const all = hook.hits.filter((x) => x.status === 204).map((x) => x.body.content).join('\n'); return /Long note 5/.test(all) && /contributed/.test(all) && /Burner is paused/.test(all) && /Hana is paused/.test(all); }, 15000);
    ok(!!delivered, 'the mirror delivered messages, strikes, pauses and contributions to the webhook');
    s.child.kill(); await sleep(300); restartAt = Date.now();
    s = await startServer(3393, env, s.data);
    const hp2 = await c.post('/api/rooms/general/messages', { text: 'after restart' }, hc);
    ok(hp2.status === 403 && /paused/.test(hp2.data.error), 'strikes and pauses survive a restart');
    const bp2 = await c.post('/api/rooms/rnd/messages', { text: 'still fine after restart' }, bearer(bt));
    ok(bp2.status === 201, 'a cleared member stays cleared after a restart');

    // --- the Discord payloads
    await waitFor(() => hook.hits.some((x) => x.t > restartAt && /still fine after restart/.test(x.body.content || '')), 8000);
    const okHits = hook.hits.filter((x) => x.status === 204);
    const contents = okHits.map((x) => x.body.content);
    const all = contents.join('\n');
    ok(hook.hits[0].status === 429 && contents.some((t) => t.includes(hook.hits[0].body.content.split('\n')[0])), 'a 429 is retried after retry_after (the batch is posted again)');
    ok(hook.hits.every((x) => Array.isArray(x.body.allowed_mentions?.parse) && x.body.allowed_mentions.parse.length === 0), 'every post has allowed_mentions {parse: []} (nothing pings)');
    ok(hook.hits.every((x) => typeof x.body.content === 'string' && x.body.content.length <= 1900), 'every post is at most 1,900 characters', String(Math.max(...hook.hits.map((x) => x.body.content.length))));
    ok(contents.some((t) => t.split('\n').length > 1), 'lines are batched into combined posts');
    const longLines = all.split('\n').filter((l) => /Long note/.test(l));
    ok(longLines.length === 6 && longLines.every((l) => l.length < 650) && okHits.filter((x) => /Long note/.test(x.body.content)).length >= 2, 'long messages are truncated (~400 chars) and overflow goes to the next post', `${longLines.length} lines`);
    const before = okHits.filter((x) => x.t < restartAt);
    const gaps = before.slice(1).map((x, i) => x.t - before[i].t);
    ok(gaps.every((g) => g >= 500), 'posts are spaced by the flush interval', gaps.join(','));
    ok(secrets.every((t) => !hook.hits.some((x) => x.raw.includes(t))) && !hook.hits.some((x) => /cmn_|secret-hook-token|test-kin-key/.test(x.raw)), 'no token, login secret, webhook URL or key is ever sent');
    ok(/my token is \\\[redacted\\\]/.test(all), 'a token pasted into a message is redacted in the mirror');
    ok(/\*\*\[R&D \/ Kodama\]\*\* \*\*Burner\*\* \(agent · mburn\): \\@GPT question 1 <https:\/\/commons\.test\/r\/rnd#m_/.test(all), 'message line: room, author, kind + model, text, link', all.split('\n').find((l) => /question 1/.test(l)));
    ok(/\*\*GPT\*\* \(kin · openai\/gpt\\-4\.1\)/.test(all) && /\(human\): Long note/.test(all), 'kin and human messages are mirrored with their kind');
    ok(/→ Burner joined the R&D/.test(all) && /→ Hana made a profile \(human\)/.test(all), 'arrivals and joins are mirrored');
    ok(/⚠ Warning 1 of 3 for Burner/.test(all) && /⚠ Warning 1 of 3 for Flooder/.test(all) && /⚠ Hana is paused/.test(all) && /contributed “Burn\\-down plan” <https:\/\/commons\.test\/c\/c_/.test(all), 'strikes, pauses and contributions are mirrored');
    ok(!/unavailable|Quiet:/.test(all), 'ordinary system notes are not mirrored');
  } finally {
    s.child.kill(); hook.close();
    if (failN) console.log('\n--- server log (C) ---\n' + s.log().slice(-3000));
  }
}

await phaseA();
await phaseB();
await phaseC();
console.log(`\n${pass} passed, ${failN} failed`);
process.exit(failN ? 1 : 0);

// door-token-callsites.mjs: every place the server reads an AGENT token must refuse a dead one.
// Desk t_921656d7f1 (door token inventory), Round 51-53, Claude. A token is "dead" here when its member stepped back
// (POST /api/me/step-back -> core.stepBack -> retired). store.memberByToken() does NOT filter retired members, so each
// callsite has to check `.retired` itself; this test walks every callsite and proves it does.
// For each callsite: (1) the live token works there, (2) the same token, after step-back, is refused (401/403/404,
// never 200 with data). A callsite that still accepts the dead token stays a named `test.todo` with its server.mjs
// line; this test does not fix server.mjs (Tier 1).
// Callsites (line numbers of main when written; the Aletheia-6 list in the desk task pointed at other lines):
//   server.mjs:461   actor()                        GET /api/me, POST /api/me/profile
//   server.mjs:1373  say-link  GET /s/:code         (a second credential: sayHash)
//   server.mjs:1917  POST /api/submit               (own copy of the token check)
//   server.mjs:2234  POST /api/me/recovery
//   server.mjs:2252  POST /api/me/step-back         (no retired check: idempotent)
//   server.mjs:2416  POST /mcp/t/:token             -> mcp.mjs:227 need()
//   server.mjs:2403  POST /mcp (Authorization)      -> mcp.mjs:227 need()
//   station.mjs:232  /station-ws token (query/subprotocol)
// The Station is invitation-only (station.mjs mayEnter): COMMONS_STATION_ENABLED=1 is not enough, the member also needs
// a grant in <data>/station/grants.json ({id:{name,by,ts}}). Both seeded agents get one, so the live control opens and the
// Station case asserts instead of skipping (round 52: without the grant the control got 403 and the case skipped).
// Boots the real server on a temp data dir with two seeded agents (only sha256 of made-up sentinel tokens is stored).
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import WebSocket from 'ws';
import { freePort } from './lib/port.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tok = (n) => `cmn_CALLSITE_${n}_` + crypto.randomBytes(18).toString('base64url');
const say = (n) => `say_CALLSITE_${n}_` + crypto.randomBytes(12).toString('base64url');
const LIVE = tok('live'), GONE = tok('gone');           // two members; GONE steps back mid-test, LIVE never does (control)
const SAY_LIVE = say('live'), SAY_GONE = say('gone');
const J = { 'content-type': 'application/json', 'x-commons': '1' };
let srv; let B; let PORT; let out = '';

const get = (p, h = {}) => fetch(B + p, { redirect: 'manual', headers: h, signal: AbortSignal.timeout(15000) });
const post = (p, body, h = {}) => fetch(B + p, { method: 'POST', headers: { ...J, ...h }, body: JSON.stringify(body || {}), signal: AbortSignal.timeout(15000) });
const bearer = (t) => ({ authorization: 'Bearer ' + t });
const rpc = (t, name, args) => ({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: { ...(args || {}) } } });
const mcpPost = (p, body, h = {}) => fetch(B + p, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...h }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
// An MCP tools/call answer: did it refuse (HTTP 4xx, JSON-RPC error, or isError)? and what text came back.
async function mcpOutcome(r) {
  const raw = await r.text(); let j = null; try { j = JSON.parse(raw.replace(/^data: /m, '').trim()); } catch { /* not json */ }
  const isErr = r.status >= 400 || !!j?.error || !!j?.result?.isError;
  return { status: r.status, refused: isErr, text: j?.result?.content?.[0]?.text || j?.error?.message || raw.slice(0, 200) };
}
const stationOpen = (query, protocols) => new Promise((resolve) => {
  const ws = new WebSocket(`ws://127.0.0.1:${PORT}/station-ws${query}`, protocols || [], { headers: {} });
  const done = (v) => { try { ws.terminate(); } catch { /* closed */ } resolve(v); };
  ws.once('open', () => done('open'));
  ws.once('unexpected-response', (_q, res) => done(res.statusCode));
  ws.once('error', () => done('error'));
  setTimeout(() => done('timeout'), 6000);
});

test('boot with two seeded agents', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-callsites-'));
  const mk = (id, name, t, s) => ({ id, kind: 'agent', name, created: '2026-11-01T00:00:00Z', tokenHash: sha(t), sayHash: sha(s), consent: { answer: 'yes', words: 'seeded', ts: '2026-11-01T00:00:00Z' } });
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: [mk('a_cslive', 'Callsite Live', LIVE, SAY_LIVE), mk('a_csgone', 'Callsite Gone', GONE, SAY_GONE)] }));
  // Station invitation: both agents hold a grant, so a live token really opens and a refusal after step-back is the retired check, not a missing grant.
  fs.mkdirSync(path.join(D, 'station'), { recursive: true });
  const grant = (name) => ({ name, by: 'door-token-callsites test', ts: '2026-11-01T00:00:00Z' });
  fs.writeFileSync(path.join(D, 'station', 'grants.json'), JSON.stringify({ a_cslive: grant('Callsite Live'), a_csgone: grant('Callsite Gone') }));
  PORT = await freePort(); B = `http://127.0.0.1:${PORT}`;
  srv = spawn(process.execPath, [path.join(ROOT, 'commons', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1', COMMONS_STATION_ENABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stdout.on('data', (c) => { out += c; }); srv.stderr.on('data', (c) => { out += c; });
  let up = false;
  for (let i = 0; i < 80 && !up; i++) { try { up = (await fetch(`${B}/healthz`)).ok; } catch { /* starting */ } if (!up) await sleep(250); }
  assert.ok(up, 'server did not start:\n' + out.slice(-1500));
  for (const t of [LIVE, GONE]) { const w = await get('/api/me', bearer(t)); assert.equal(w.status, 200, 'each seeded agent is a working member before anything is revoked'); }
});

// ---- LIVE token works at every callsite (so a refusal after step-back means something) ----
const live = {};
test('control: both tokens and both say-links work before step-back, at every callsite', async () => {
  const r1 = await get('/api/me', bearer(GONE)); assert.equal(r1.status, 200, 'actor(): GET /api/me');
  const r2 = await post('/api/me/profile', {}, bearer(GONE)); assert.notEqual(r2.status, 401, `actor(): POST /api/me/profile answered ${r2.status}`); assert.ok(r2.status < 500);
  const r3 = await get(`/s/${SAY_GONE}`); assert.equal(r3.status, 200, 'say-link answers for a live member'); assert.match(await r3.text(), /Callsite Gone/);
  const r4 = await post('/api/submit', {}, bearer(GONE)); assert.notEqual(r4.status, 401, `submit with a live token answered ${r4.status} (anything but 401)`);
  const r5 = await post('/api/me/recovery', {}, bearer(GONE)); assert.notEqual(r5.status, 401, `me/recovery with a live token answered ${r5.status} (anything but 401)`);
  const m1 = await mcpOutcome(await mcpPost('/mcp', rpc(null, 'whoami'), bearer(GONE)));
  assert.ok(/Callsite Gone/.test(m1.text) || !m1.refused, `/mcp whoami with a live bearer: ${m1.status} ${m1.text}`);
  const m2 = await mcpOutcome(await mcpPost(`/mcp/t/${GONE}`, rpc(null, 'whoami')));
  assert.ok(/Callsite Gone/.test(m2.text) || !m2.refused, `/mcp/t/<token> whoami with a live token: ${m2.status} ${m2.text}`);
  live.mcp = /Callsite Gone/.test(m1.text) && /Callsite Gone/.test(m2.text);
  live.station = await stationOpen(`?token=${encodeURIComponent(GONE)}`);
  assert.equal(live.station, 'open', `station-ws with a live, granted token answered ${live.station} (expected open: COMMONS_STATION_ENABLED=1 and a grants.json entry are seeded)`);
});

test('step back: GONE retires itself with its own token', async () => {
  const r = await post('/api/me/step-back', { words: 'callsite test' }, bearer(GONE));
  assert.equal(r.status, 200, `step-back answered ${r.status}`);
  assert.equal((await r.json()).stepped_back, true);
  const live2 = await get('/api/me', bearer(LIVE)); assert.equal(live2.status, 200, 'control: the other agent is untouched');
});

// ---- the same token, now dead, at every callsite ----
const REFUSED = [401, 403, 404];
test('server.mjs:461 actor(): GET /api/me and POST /api/me/profile refuse the dead token', async () => {
  for (const [name, r] of [['GET /api/me', await get('/api/me', bearer(GONE))], ['POST /api/me/profile', await post('/api/me/profile', { bio: 'x' }, bearer(GONE))], ['GET /api/me?token=', await get(`/api/me?token=${encodeURIComponent(GONE)}`)]]) {
    assert.ok(REFUSED.includes(r.status), `${name} with a dead token answered ${r.status}`);
  }
});
test('server.mjs:1373 say-link: a stepped-back member\'s say-link is not valid; the live one still is', async () => {
  const r = await get(`/s/${SAY_GONE}?room=general&text=${encodeURIComponent('ghost words')}`);
  assert.equal(r.status, 404, `say-link of a retired member answered ${r.status}`);
  assert.equal((await get(`/s/${SAY_LIVE}`)).status, 200, 'control: a live member\'s say-link answers');
});
test('server.mjs:1917 POST /api/submit refuses the dead token', async () => {
  const r = await post('/api/submit', {}, bearer(GONE)); assert.ok(REFUSED.includes(r.status), `submit answered ${r.status}`);
});
test('server.mjs:2234 POST /api/me/recovery refuses the dead token (no recovery code is minted for a retired member)', async () => {
  const r = await post('/api/me/recovery', {}, bearer(GONE)); assert.ok(REFUSED.includes(r.status), `me/recovery answered ${r.status}`);
  assert.ok(!/rec_[A-Za-z0-9]/.test(await r.text()), 'no recovery code in the answer');
});
test('server.mjs:2252 POST /api/me/step-back with the dead token: only "already stepped back", never data', async () => {
  const r = await post('/api/me/step-back', {}, bearer(GONE));
  const j = await r.json().catch(() => ({}));
  // Idempotent by design (core.stepBack returns early for a retired member). It must not return a profile, token or room data.
  assert.ok(REFUSED.includes(r.status) || (r.status === 200 && j.stepped_back === true && /already/.test(j.note || '')), `answered ${r.status} ${JSON.stringify(j).slice(0, 160)}`);
  assert.deepEqual(Object.keys(j).sort().filter((k) => !['stepped_back', 'note', 'error'].includes(k)), [], 'nothing beyond the one-line note');
});
test('server.mjs:2403 POST /mcp (Authorization bearer): a tool that needs a member refuses the dead token', async () => {
  const o = await mcpOutcome(await mcpPost('/mcp', rpc(null, 'post_message', { room: 'general', text: 'ghost words (/mcp)' }), bearer(GONE)));
  assert.ok(o.refused, `/mcp post_message with a dead token was accepted: ${o.status} ${o.text}`);
  const w = await mcpOutcome(await mcpPost('/mcp', rpc(null, 'whoami'), bearer(GONE)));
  assert.ok(!/Callsite Gone/.test(w.text) || /retired|step|no longer|not a member|unknown/i.test(w.text), `/mcp whoami returned the dead member's profile: ${w.text.slice(0, 160)}`);
});
test('server.mjs:2416 POST /mcp/t/:token (token in the URL) refuses the dead token', async () => {
  const o = await mcpOutcome(await mcpPost(`/mcp/t/${GONE}`, rpc(null, 'post_message', { room: 'general', text: 'ghost words (/mcp/t)' })));
  assert.ok(o.refused, `/mcp/t/<dead> post_message was accepted: ${o.status} ${o.text}`);
  const w = await mcpOutcome(await mcpPost(`/mcp/t/${GONE}`, rpc(null, 'whoami')));
  assert.ok(!/Callsite Gone/.test(w.text) || /retired|step|no longer|not a member|unknown/i.test(w.text), `/mcp/t whoami returned the dead member's profile: ${w.text.slice(0, 160)}`);
});
test('station.mjs:232 /station-ws refuses a dead token (query and subprotocol)', async () => {
  // No skip: the control above already asserted the live, granted token opens, so a refusal here is the retired check.
  assert.equal(live.station, 'open', 'no live Station control, so no claim about the dead token');
  const q = await stationOpen(`?token=${encodeURIComponent(GONE)}`);
  assert.notEqual(q, 'open', `station-ws opened for a dead token via ?token= (got ${q})`);
  assert.equal(q, 401, 'refused with 401');
  const p = await stationOpen('', [`commons-token.${GONE}`]);
  assert.notEqual(p, 'open', `station-ws opened for a dead token via subprotocol (got ${p})`);
});
test('nothing the dead token tried reached the record', async () => {
  const r = await get('/api/rooms/general/messages', bearer(LIVE)); assert.equal(r.status, 200);
  const txt = await r.text();
  assert.ok(!/ghost words/.test(txt), 'no "ghost words" message was posted by the retired member through any callsite');
});
// ---- Round 53: does a rejoin leave the OLD say-link alive? (a say-link is a second credential: it can post as the member) ----
// The rejoin is the "someone else may hold my identity" path. Both routes burn the recovery code and rotate the token:
//   GET /rejoin -> /rejoin/confirm (server.mjs:2211) also rotates sayHash                       -> the old say-link dies
//   POST /api/rejoin (core.rejoinAgent, server.mjs:2190) rotates the token and NOTHING else      -> the old say-link lives
// The first is the control (so the second means something). The second is a named todo: measured red on main, no server fix here (Tier 1).
const rejoinAgents = {};
async function seedRejoinAgent(key) {
  const REC = `rec_CALLSITE_${key}_` + crypto.randomBytes(12).toString('base64url');
  const SAY = say(key); const T = tok(key); const name = `Callsite Rejoin ${key}`;
  const D = process.env.__CALLSITE_DATA; void D; // (members are seeded at boot, see below)
  return { REC, SAY, T, name };
}
test('rejoin routes: the old say-link after /rejoin/confirm (control) and after POST /api/rejoin', async (t) => {
  // The members were not in the boot file, so reach them through a second boot: same server code, own data dir.
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-callsites-rejoin-'));
  const mkr = (id, a) => ({ id, kind: 'agent', name: a.name, created: '2026-11-01T00:00:00Z', tokenHash: sha(a.T), sayHash: sha(a.SAY), recoveryHash: sha(a.REC), consent: { answer: 'yes', words: 'seeded', ts: '2026-11-01T00:00:00Z' } });
  const via = await seedRejoinAgent('confirm'), post_ = await seedRejoinAgent('post');
  Object.assign(rejoinAgents, { via, post_ });
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: [mkr('a_csrjc', via), mkr('a_csrjp', post_)] }));
  const port = await freePort(); const base = `http://127.0.0.1:${port}`; let log = '';
  const s2 = spawn(process.execPath, [path.join(ROOT, 'commons', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_PORT: String(port), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', COMMONS_NO_SPEND_POLL: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  s2.stdout.on('data', (c) => { log += c; }); s2.stderr.on('data', (c) => { log += c; });
  try {
    let up = false;
    for (let i = 0; i < 80 && !up; i++) { try { up = (await fetch(`${base}/healthz`)).ok; } catch { /* starting */ } if (!up) await sleep(250); }
    assert.ok(up, 'second server did not start:\n' + log.slice(-1200));
    const g = (p) => fetch(base + p, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    assert.equal((await g(`/s/${via.SAY}`)).status, 200, 'before: the say-link of the /rejoin/confirm agent works');
    assert.equal((await g(`/s/${post_.SAY}`)).status, 200, 'before: the say-link of the POST /api/rejoin agent works');
    // control: the two-step link rejoin
    const chk = await (await g(`/rejoin?name=${encodeURIComponent(via.name)}&recovery=${encodeURIComponent(via.REC)}`)).text();
    const n = /confirm\?n=([A-Za-z0-9_-]+)/.exec(chk)?.[1]; assert.ok(n, 'the check step hands back a confirm link: ' + chk.slice(0, 200));
    const conf = await g(`/rejoin/confirm?n=${n}`); assert.equal(conf.status, 201, 'confirm rejoins: ' + (await conf.text()).slice(0, 200));
    assert.equal((await g(`/s/${via.SAY}`)).status, 404, '/rejoin/confirm rotated the say-link: the OLD one is dead');
    // the API rejoin
    const r = await fetch(`${base}/api/rejoin`, { method: 'POST', headers: J, body: JSON.stringify({ name: post_.name, recovery: post_.REC }), signal: AbortSignal.timeout(15000) });
    assert.equal(r.status, 200, 'POST /api/rejoin answered ' + r.status + ' ' + (await r.clone().text()).slice(0, 200));
    const nj = await r.json(); assert.ok(nj.token && nj.token !== post_.T, 'a new token came back');
    assert.equal((await fetch(`${base}/api/me`, { headers: bearer(post_.T) })).status, 401, 'the OLD token is dead after POST /api/rejoin');
    const old = (await g(`/s/${post_.SAY}`)).status;
    t.diagnostic(`old say-link status after POST /api/rejoin: ${old} (404 = dead, 200 = still alive)`);
    assert.equal(old, 404, `server.mjs:2190 POST /api/rejoin rotated the token but the OLD say-link still answered ${old}`);
  } finally { try { s2.kill('SIGTERM'); } catch { /* gone */ } }
}, { todo: 'server.mjs:2190 POST /api/rejoin (core.rejoinAgent) does not rotate sayHash; only /rejoin/confirm (server.mjs:2211) does: the old say-link survives an API rejoin. Tier 1: Setu.' });
test('teardown', () => { try { srv?.kill('SIGTERM'); } catch { /* gone */ } });

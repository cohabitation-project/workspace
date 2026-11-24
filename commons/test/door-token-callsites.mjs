// door-token-callsites.mjs: every place the server reads an AGENT token must refuse a dead one.
// Desk t_921656d7f1 (door token inventory), Round 51, Claude. A token is "dead" here when its member stepped back
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
  assert.ok(live.station === 'open' || live.station === 404, `station-ws with a live token answered ${live.station} (open, or 404 when the Station is switched off here)`);
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
test('station.mjs:232 /station-ws refuses a dead token (query and subprotocol)', async (t) => {
  if (live.station !== 'open') return t.skip(`the Station is switched off in this boot (live token got ${live.station}); no live control, so no claim`);
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

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });

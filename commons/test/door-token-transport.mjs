// A token sent in the URL must never reach the server's own log (Aletheia-6's contract c_mwtlo4sz5n2e8b17,
// Desk t_921656d7f1, Review m_mwtosj6r…). Two places a token can ride in a URL:
//   - REST: lib/auth.mjs tokenFrom() accepts header, JSON body, then `?token=`.
//   - MCP:  server.mjs `app.post('/mcp/t/:token')` (connector UIs that only take a URL).
// The server has no access-log middleware; this test proves the error and watch-mode log lines don't print the URL
// either. It boots the real server with COMMONS_FAKE_LLM=1 on a throwaway data dir, captures stdout + stderr, and
// calls each route with a synthetic sentinel token. The members.json it seeds holds only sha256(sentinel); the
// sentinel is made up here and is not any real credential.
// A case that leaks is NOT fixed here (auth.mjs, mcp.mjs and server.mjs are Tier 1): it stays red as `todo`
// with the file:line that prints it, so the suite shows the open item without blocking merges.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

const SENTINEL = 'cmn_SENTINEL_' + crypto.randomBytes(24).toString('base64url');
const UNKNOWN = 'cmn_UNKNOWNSENTINEL_' + crypto.randomBytes(24).toString('base64url');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

let srv; let B; let D; let out = '';
const logs = () => out;
const mcp = (urlPath, body, extra = {}) => fetch(B + urlPath, { method: 'POST', headers: { 'content-type': 'application/json', ...extra }, body: typeof body === 'string' ? body : JSON.stringify(body), signal: AbortSignal.timeout(15000) });
const rpc = (method, params = {}) => ({ jsonrpc: '2.0', id: 1, method, params });
const rawGet = (urlPath, headers = {}) => new Promise((resolve, reject) => {
  const u = new URL(B + urlPath);
  const req = http.request({ host: u.hostname, port: u.port, path: u.pathname + u.search, method: 'POST', headers: { 'content-type': 'application/json', ...headers } }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
  req.setTimeout(15000, () => req.destroy(new Error('timeout'))); req.on('error', reject); req.end(JSON.stringify(rpc('ping')));
});

test('boot the server with the sentinel agent seeded', async () => {
  D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-token-transport-'));
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: [
    { id: 'a_sentinel', kind: 'agent', name: 'Sentinel', created: '2026-11-01T00:00:00Z', tokenHash: sha(SENTINEL) },
  ] }));
  const PORT = await freePort(); B = `http://127.0.0.1:${PORT}`;
  srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')],
    { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
  srv.stdout.on('data', (c) => { out += c; }); srv.stderr.on('data', (c) => { out += c; });
  let up = false;
  for (let i = 0; i < 80 && !up; i++) { try { up = (await fetch(`${B}/healthz`)).ok; } catch { /* starting */ } if (!up) await new Promise((s) => setTimeout(s, 250)); }
  assert.ok(up, 'server did not start:\n' + out.slice(-1500));
  const w = await fetch(`${B}/api/me`, { headers: { authorization: 'Bearer ' + SENTINEL } });
  assert.equal(w.status, 200, 'the seeded sentinel agent must be a working member (otherwise the valid-token cases prove nothing)');
});

test('control: the capture sees real log lines (a bad Origin on /mcp/t/<token> logs the origin, watch mode)', async () => {
  const status = await rawGet(`/mcp/t/${SENTINEL}`, { origin: 'https://evil.example' });
  assert.equal(status, 200);
  await new Promise((s) => setTimeout(s, 300));
  assert.match(logs(), /\[mcp-origin\][^\n]*evil\.example/, 'capture is live: the watch-mode line for the origin is in stdout');
});

// Each case: label, then a function that makes the call. A leak is reported with the label.
const cases = [
  ['REST GET /api/me?token=<valid>', () => fetch(`${B}/api/me?token=${SENTINEL}`)],
  ['REST GET /api/me?token=<unknown>', () => fetch(`${B}/api/me?token=${UNKNOWN}`)],
  ['REST GET /api/nothing-here?token=<valid> (API 404)', () => fetch(`${B}/api/nothing-here?token=${SENTINEL}`)],
  ['REST GET /no-such-page?token=<valid> (HTML 404)', () => fetch(`${B}/no-such-page?token=${SENTINEL}`)],
  ['REST POST /api/me, token in JSON body', () => fetch(`${B}/api/me`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ token: SENTINEL }) })],
  ['REST POST with a broken JSON body and ?token=<valid>', () => fetch(`${B}/api/join?token=${SENTINEL}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"token": ' })],
  ['REST POST /api/join?token=<valid> with an empty object', () => fetch(`${B}/api/join?token=${SENTINEL}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })],
  ['MCP POST /mcp/t/<valid> initialize', () => mcp(`/mcp/t/${SENTINEL}`, rpc('initialize', { protocolVersion: '2025-03-26' }))],
  ['MCP POST /mcp/t/<valid> tools/list', () => mcp(`/mcp/t/${SENTINEL}`, rpc('tools/list'))],
  ['MCP POST /mcp/t/<valid> tools/call whoami', () => mcp(`/mcp/t/${SENTINEL}`, rpc('tools/call', { name: 'whoami', arguments: {} }))],
  ['MCP POST /mcp/t/<unknown> tools/call whoami', () => mcp(`/mcp/t/${UNKNOWN}`, rpc('tools/call', { name: 'whoami', arguments: {} }))],
  ['MCP POST /mcp/t/<unknown> tools/call post (needs a member)', () => mcp(`/mcp/t/${UNKNOWN}`, rpc('tools/call', { name: 'post', arguments: { text: 'x' } }))],
  ['MCP POST /mcp/t/<valid> unknown tool', () => mcp(`/mcp/t/${SENTINEL}`, rpc('tools/call', { name: 'no_such_tool', arguments: {} }))],
  ['MCP POST /mcp/t/<valid> unknown method', () => mcp(`/mcp/t/${SENTINEL}`, rpc('no/such'))],
  ['MCP POST /mcp/t/<valid> broken JSON', () => mcp(`/mcp/t/${SENTINEL}`, '{"jsonrpc":')],
  ['MCP POST /mcp/t/<valid> batch of 21 (refused)', () => mcp(`/mcp/t/${SENTINEL}`, Array.from({ length: 21 }, () => rpc('ping')))],
  ['MCP GET /mcp/t/<valid> (JSON 405)', () => fetch(`${B}/mcp/t/${SENTINEL}`)],
  ['MCP GET /mcp/t/<valid> (HTML help page)', () => fetch(`${B}/mcp/t/${SENTINEL}`, { headers: { accept: 'text/html' } })],
  ['MCP DELETE /mcp/t/<valid>', () => fetch(`${B}/mcp/t/${SENTINEL}`, { method: 'DELETE' })],
];

test('no URL-borne token reaches stdout or stderr, and no response echoes it', async () => {
  const leaks = []; const echoes = []; const rows = [];
  for (const [label, call] of cases) {
    const before = out.length;
    let status = '(no answer)'; let body = '';
    try { const r = await call(); status = r.status; body = await r.text(); } catch (e) { status = 'ERR ' + e.message; }
    await new Promise((s) => setTimeout(s, 120));
    const added = out.slice(before);
    const bad = added.includes(SENTINEL) || added.includes(UNKNOWN) || /SENTINEL/.test(added);
    const echo = body.includes(SENTINEL) || body.includes(UNKNOWN);
    rows.push(`${String(status).padEnd(4)} ${label}${bad ? '  <-- LOGGED' : ''}${echo ? '  <-- ECHOED' : ''}`);
    if (bad) leaks.push(`${label}: log text near the token: ${JSON.stringify(added.slice(Math.max(0, added.search(/SENTINEL/) - 80), added.search(/SENTINEL/) + 60))}`);
    if (echo) echoes.push(label);
  }
  console.log('\n' + rows.join('\n'));
  assert.ok(!rows.some((r) => /ERR |no answer/.test(r)), 'every call must get an answer, or a "never logged" result means nothing:\n' + rows.join('\n'));
  assert.ok(logs().length > 0, 'capture is empty: the control would have caught this, but check the spawn');
  assert.ok(!/SENTINEL/.test(logs()), 'the sentinel must not appear anywhere in the whole captured log (boot included)');
  assert.deepEqual(leaks, [], 'token reached the server log:\n' + leaks.join('\n'));
  // A response that echoes the caller's own token back is not a log leak, but it lands in client transcripts and proxies.
  assert.deepEqual(echoes, [], 'a response body repeated the token:\n' + echoes.join('\n'));
});

test('stop the server', () => { try { srv.kill(); } catch { /* gone */ } fs.rmSync(D, { recursive: true, force: true }); });

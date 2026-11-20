// Door follow-up 1, the connect side (Aster's field report): every refusal on the consent page and the token endpoint
// names the one safe next step. Message text only: status codes and OAuth error codes are unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'connect-steps-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = { 'content-type': 'application/json', 'x-commons': '1' };
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const pkce = () => { const verifier = crypto.randomBytes(40).toString('base64url'); return { verifier, challenge: crypto.createHash('sha256').update(verifier).digest('base64url') }; };
const post = (p, body, h = {}) => fetch(B + p, { method: 'POST', headers: { ...J, ...h }, body: JSON.stringify(body) });
const form = (p, o, h = {}) => fetch(B + p, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', ...h }, body: new URLSearchParams(o).toString() });

let srv; let client;

async function authorize({ redirect_uri = REDIRECT, ch = pkce(), cookie = '' } = {}) {
  const q = new URLSearchParams({ response_type: 'code', client_id: client.client_id, redirect_uri, state: 'st-1', code_challenge: ch.challenge, code_challenge_method: 'S256', scope: 'commons' });
  const r = await fetch(`${B}/oauth/authorize?${q}`, { redirect: 'manual', headers: cookie ? { cookie } : {} });
  const html = await r.text();
  return { r, html, ch, request: html.match(/name="request" value="([^"]+)"/)?.[1], csrf: html.match(/name="csrf" value="([^"]+)"/)?.[1] };
}

test('boot and register an app', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch { /* booting */ } await sleep(250); }
  const r = await post('/oauth/register', { client_name: 'Claude', redirect_uris: [REDIRECT] });
  assert.equal(r.status, 201); client = await r.json();
});

test('an unknown agent on the consent page names the next step (and is still refused with 404)', async () => {
  const h = await post('/api/humans', { name: 'Opal' }); const cookie = (h.headers.get('set-cookie') || '').split(';')[0];
  const a = await authorize({ cookie }); assert.ok(a.request && a.csrf, 'the consent page rendered');
  const r = await form('/oauth/authorize', { request: a.request, csrf: a.csrf, how: 'operator', action: 'approve', agent: 'a_does_not_exist' }, { cookie });
  assert.equal(r.status, 404, 'still refused with the same status');
  const body = await r.text();
  assert.match(body, /cohabi\.org\/join/, 'a new agent is pointed at the join page');
  assert.match(body, /Names are exact/, 'it says names are exact');
  assert.match(body, /cohabi\.org\/members/, 'it points at the people page a human can read');
  assert.ok(!body.includes('/api/roster'), 'it does not send a human to raw JSON');
});

test('a refresh on a revoked connection says to add the connector again (still 400 invalid_grant)', async () => {
  const agent = await (await post('/api/join', { name: 'Nova', model: 'test-model' })).json();
  assert.ok(agent.recovery?.startsWith('rec_'));
  const a = await authorize();
  const ok = await form('/oauth/authorize', { request: a.request, csrf: a.csrf, how: 'recovery', action: 'approve', name: 'Nova', recovery: agent.recovery });
  assert.equal(ok.status, 303);
  const code = new URL(ok.headers.get('location')).searchParams.get('code');
  const t = await form('/oauth/token', { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: client.client_id, code_verifier: a.ch.verifier });
  assert.equal(t.status, 200); const tok = await t.json();
  const all = await post('/api/me/connections/revoke-all', {}, { authorization: `Bearer ${agent.token}` });
  assert.equal(all.status, 200);
  const r = await form('/oauth/token', { grant_type: 'refresh_token', refresh_token: tok.refresh_token, client_id: client.client_id });
  assert.equal(r.status, 400);
  const j = await r.json();
  assert.equal(j.error, 'invalid_grant', 'the OAuth error code is unchanged');
  assert.match(j.error_description, /revoked/);
  assert.match(j.error_description, /add it again/);
});

test('stop the server', () => { srv?.kill(); fs.rmSync(DATA, { recursive: true, force: true }); });

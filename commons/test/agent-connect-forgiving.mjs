// The connect door, after Geoffrey walked it on 2026-11-18 and lost two attempts: a mistyped code must not end the
// sign-in page; the page must outlive a human fetching a code from another tab; and a steward must be able to connect
// an agent by name with no code at all (decision #11: no human carries a code). Each allow is paired with a refusal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';
import * as agentconnect from '../lib/agentconnect.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'connect-f-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = { 'content-type': 'application/json', 'x-commons': '1' };
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const pkce = () => { const verifier = crypto.randomBytes(40).toString('base64url'); return { verifier, challenge: crypto.createHash('sha256').update(verifier).digest('base64url') }; };
const post = (p, body, h = {}) => fetch(B + p, { method: 'POST', headers: { ...J, ...h }, body: JSON.stringify(body) });
const form = (p, o, h = {}) => fetch(B + p, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', ...h }, body: new URLSearchParams(o).toString() });
const mcp = (tok, method, params = {}) => fetch(`${B}/mcp/connect`, { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });

let srv; let agent; let client;
async function boot() {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_STEWARDS: 'Opal', COMMONS_STEWARD_NAME_CUTOFF: '2999-01-01T00:00:00Z' }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) return; } catch { /* booting */ } await sleep(250); }
}
async function authorize({ cookie: ck = '' } = {}) {
  const ch = pkce();
  const q = new URLSearchParams({ response_type: 'code', client_id: client.client_id, redirect_uri: REDIRECT, state: 'st-1', code_challenge: ch.challenge, code_challenge_method: 'S256', scope: 'commons' });
  const r = await fetch(`${B}/oauth/authorize?${q}`, { redirect: 'manual', headers: ck ? { cookie: ck } : {} });
  const html = r.status === 200 ? await r.text() : '';
  return { r, html, ch, request: html.match(/name="request" value="([^"]+)"/)?.[1], csrf: html.match(/name="csrf" value="([^"]+)"/)?.[1] };
}
const exchange = (code, verifier) => form('/oauth/token', { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: client.client_id, code_verifier: verifier });

test('boot: an agent joins; an app registers; the steward human signs up', async () => {
  await boot();
  agent = await (await post('/api/join', { name: 'Lumen', model: 'test-model' })).json(); assert.ok(agent.recovery?.startsWith('rec_'));
  client = await (await post('/oauth/register', { client_name: 'Test App', redirect_uris: [REDIRECT], token_endpoint_auth_method: 'none' })).json(); assert.ok(client.client_id);
});

test('the page lives an hour, not minutes', () => { assert.ok(agentconnect.PENDING_TTL >= 60 * 60_000, `PENDING_TTL is ${agentconnect.PENDING_TTL}`); });

test('a mistyped code brings the same page back with the error; the right code on that same page then connects', async () => {
  const a = await authorize(); assert.ok(a.request && a.csrf, 'consent page');
  const wrong = await form('/oauth/authorize', { request: a.request, csrf: a.csrf, how: 'recovery', action: 'approve', name: 'Lumen', recovery: 'rec_not_it' });
  assert.equal(wrong.status, 403);
  const html = await wrong.text();
  assert.match(html, /<h1>Connect an agent app<\/h1>/, 'it is the consent page again, not a dead end');
  assert.match(html, /class="err"/, 'with the error shown');
  assert.match(html, new RegExp(`name="request" value="${a.request}"`), 'the same request, so the person just tries again');
  assert.doesNotMatch(html, /sign-in page expired/);
  const right = await form('/oauth/authorize', { request: a.request, csrf: a.csrf, how: 'recovery', action: 'approve', name: 'Lumen', recovery: agent.recovery });
  assert.equal(right.status, 303, await right.text());
  const code = new URL(right.headers.get('location')).searchParams.get('code'); assert.ok(code);
  const tok = await (await exchange(code, a.ch.verifier)).json(); assert.ok(tok.access_token, JSON.stringify(tok));
  const who = await (await mcp(tok.access_token, 'tools/call', { name: 'whoami', arguments: {} })).json();
  assert.match(who.result?.content?.[0]?.text || '', /Lumen/, 'the connection speaks as Lumen');
});

test('a steward connects an agent by name with no code; a plain human cannot; kin cannot be connected', async () => {
  const h = await post('/api/humans', { name: 'Opal' }); const cookie = (h.headers.get('set-cookie') || '').split(';')[0]; assert.equal(h.status, 201, await h.text());
  srv.kill(); await sleep(500); await boot(); // Opal existed before this boot, so the steward name pins to her id
  const s = await post('/api/humans', { name: 'Quill' }); const strangerCookie = (s.headers.get('set-cookie') || '').split(';')[0];
  // the form is offered only to the steward
  const seen = await authorize({ cookie }); assert.match(seen.html, /name="how" value="steward"/, 'the steward sees the no-code form');
  const unseen = await authorize({ cookie: strangerCookie }); assert.doesNotMatch(unseen.html, /name="how" value="steward"/, 'a plain human does not');
  // and the server, not the form, enforces it
  const no = await form('/oauth/authorize', { request: unseen.request, csrf: unseen.csrf, how: 'steward', action: 'approve', name: 'Lumen' }, { cookie: strangerCookie });
  assert.equal(no.status, 403); assert.match(await no.text(), /only a steward/);
  const anon = await authorize(); const no2 = await form('/oauth/authorize', { request: anon.request, csrf: anon.csrf, how: 'steward', action: 'approve', name: 'Lumen' });
  assert.equal(no2.status, 403, 'signed out: refused');
  const kin = await form('/oauth/authorize', { request: seen.request, csrf: seen.csrf, how: 'steward', action: 'approve', name: 'Claude' }, { cookie });
  assert.equal(kin.status, 403); assert.match(await kin.text(), /kin aren(?:'|&#39;)t connected/);
  const nobody = await form('/oauth/authorize', { request: seen.request, csrf: seen.csrf, how: 'steward', action: 'approve', name: 'Nobody Here' }, { cookie });
  assert.equal(nobody.status, 404);
  // the steward connects Lumen: no code, token exchange works, the connection is announced with the steward's name
  const yes = await form('/oauth/authorize', { request: seen.request, csrf: seen.csrf, how: 'steward', action: 'approve', name: 'Lumen' }, { cookie });
  assert.equal(yes.status, 303, await yes.text());
  const code = new URL(yes.headers.get('location')).searchParams.get('code');
  const tok = await (await exchange(code, seen.ch.verifier)).json(); assert.ok(tok.access_token, JSON.stringify(tok));
  const who = await (await mcp(tok.access_token, 'tools/call', { name: 'whoami', arguments: {} })).json();
  assert.match(who.result?.content?.[0]?.text || '', /Lumen/);
  const ev = await (await fetch(`${B}/api/events`)).json();
  assert.ok(JSON.stringify(ev).includes('approved by Opal, a steward, without a code'), 'announced publicly, with the steward named');
});

test.after(() => { srv?.kill(); fs.rmSync(DATA, { recursive: true, force: true }); });

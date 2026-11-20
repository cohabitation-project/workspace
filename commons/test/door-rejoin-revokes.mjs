// Door follow-up (round 17, Claude): a rejoin is the "someone may have my identity" path, so it must end the agent's
// app connections (commons/server.mjs sets core.setRejoinHook to agentconnect.revokeAll). core.rejoinAgent calls the hook
// inside `try { onRejoin(m) } catch { /* best effort */ }`, so if revokeAll throws, the rejoin succeeds and the app
// connections survive with nothing said.
//   Part 1 (HTTP, real server): a rejoin with the recovery code ends a live app connection.
//   Part 2 (unit, core.mjs):    a working hook is called with the member; a THROWING hook is not silent.
// Part 2's last test FAILS today on purpose: whether a rejoin should refuse, or succeed and say loudly that the
// connections were not ended, is a decision for Setu and Geoffrey, not a code change this round.
//   node --test commons/test/door-rejoin-revokes.mjs commons/test/agent-connect*.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const J = { 'content-type': 'application/json', 'x-commons': '1' };

test('part 1: a rejoin with the recovery code ends a live app connection', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-rejoin-revokes-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  const post = (p, body, h = {}) => fetch(B + p, { method: 'POST', headers: { ...J, ...h }, body: JSON.stringify(body) });
  const form = (p, o, h = {}) => fetch(B + p, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', ...h }, body: new URLSearchParams(o).toString() });
  const mcp = (tok, method, params = {}) => fetch(`${B}/mcp/connect`, { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch { /* booting */ } await new Promise((s) => setTimeout(s, 250)); }
    // The agent joins and keeps its recovery code UNUSED (connecting by the operator path does not consume it).
    const agent = await (await post('/api/join', { name: 'Lumen', model: 'test-model' })).json();
    assert.ok(agent.token && agent.recovery?.startsWith('rec_'), 'joined with a token and a recovery code');

    // A human operator claims the agent and the agent's side is confirmed: the same walk agent-connect.mjs uses.
    const h = await post('/api/humans', { name: 'Opal' });
    const cookie = (h.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(cookie, 'the human signed up and has a session');
    await post('/api/me/human', { human: 'Opal' }, { authorization: `Bearer ${agent.token}` });
    const conf = await post(`/api/me/agent-claims/${agent.member.id}`, { answer: 'yes' }, { cookie });
    assert.equal(conf.status, 200, await conf.text());

    const client = await (await post('/oauth/register', { client_name: 'Claude', redirect_uris: [REDIRECT] })).json();
    assert.ok(client.client_id, 'an app registered');
    const verifier = crypto.randomBytes(40).toString('base64url');
    const challenge = crypto.createHash('sha256').update(verifier).digest('base64url');
    const q = new URLSearchParams({ response_type: 'code', client_id: client.client_id, redirect_uri: REDIRECT, state: 'st-1', code_challenge: challenge, code_challenge_method: 'S256', scope: 'commons' });
    const page = await fetch(`${B}/oauth/authorize?${q}`, { redirect: 'manual', headers: { cookie } });
    assert.equal(page.status, 200);
    const html = await page.text();
    const request = html.match(/name="request" value="([^"]+)"/)?.[1]; const csrf = html.match(/name="csrf" value="([^"]+)"/)?.[1];
    assert.ok(request && csrf, 'the consent page carries its request and csrf');
    const ok = await form('/oauth/authorize', { request, csrf, how: 'operator', action: 'approve', agent: agent.member.id }, { cookie });
    assert.equal(ok.status, 303, 'the confirmed operator connected the agent');
    const code = new URL(ok.headers.get('location')).searchParams.get('code'); assert.ok(code);
    const t = await form('/oauth/token', { grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: client.client_id, code_verifier: verifier });
    assert.equal(t.status, 200);
    const access = (await t.json()).access_token; assert.ok(access && access.startsWith('cat_'));

    // The allow case first, so a deny-all server can't pass: the connection works before the rejoin.
    assert.equal((await mcp(access, 'tools/list')).status, 200, 'the connection is live before the rejoin');
    const before = await (await fetch(`${B}/api/me/connections`, { headers: { authorization: `Bearer ${agent.token}` } })).json();
    assert.equal(before.connections.length, 1, 'the agent sees one live connection');

    // The rejoin with the (still unused) recovery code.
    const rj = await post('/api/rejoin', { name: 'Lumen', recovery: agent.recovery });
    assert.equal(rj.status, 200, 'the rejoin itself succeeds');
    const fresh = (await rj.json()).token; assert.ok(fresh && fresh !== agent.token, 'with a new token');

    assert.equal((await mcp(access, 'tools/list')).status, 401, 'the app connection no longer works after the rejoin');
    const after = await (await fetch(`${B}/api/me/connections`, { headers: { authorization: `Bearer ${fresh}` } })).json();
    assert.equal(after.connections.length, 0, 'and it is gone from the agent\'s list of live connections');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

// ---- Part 2: unit, against core.mjs in this process ----
process.env.COMMONS_FAKE_LLM = '1'; process.env.COMMONS_DISCORD_WEBHOOK = ''; process.env.DISCORD_WEBHOOK_URL = '';
const store = await import('../lib/store.mjs');
const core = await import('../lib/core.mjs');
store.init(fs.mkdtempSync(path.join(os.tmpdir(), 'door-rejoin-hook-'))); core.seedKin(); core.wire({ broadcast: () => {}, onMessage: () => {} });

test('part 2a: a working rejoin hook is called once, with the rejoining member', () => {
  const j = core.joinAgent({ name: 'Hooked', model: 'm', operator: 'Op-Hooked' }, { ip: 'rv1' });
  const seen = [];
  core.setRejoinHook((m) => { seen.push(m.id); });
  try {
    const r = core.rejoinAgent({ name: 'Hooked', recovery: j.recovery }, { ip: 'rv1' });
    assert.ok(r.token && r.token !== j.token, 'the rejoin rotated the token');
    assert.deepEqual(seen, [j.member.id], 'the hook ran once, for this member');
  } finally { core.setRejoinHook(null); }
});

test('part 2b (EXPECTED TO FAIL TODAY): when the revoke hook throws, the rejoin is not silent about it', () => {
  const j = core.joinAgent({ name: 'Unlucky', model: 'm', operator: 'Op-Unlucky' }, { ip: 'rv2' });
  core.setRejoinHook(() => { throw new Error('x'); });
  const heard = []; const realErr = console.error; const realWarn = console.warn;
  console.error = (...a) => heard.push(a.join(' ')); console.warn = (...a) => heard.push(a.join(' '));
  let result; let thrown = null;
  try { result = core.rejoinAgent({ name: 'Unlucky', recovery: j.recovery }, { ip: 'rv2' }); } catch (e) { thrown = e; }
  finally { console.error = realErr; console.warn = realWarn; core.setRejoinHook(null); }
  // Loud means one of: the rejoin refused; it logged an error or warning; or the answer tells the agent that its
  // app connections may not have been ended. Today none of the three happens: the catch block is empty.
  const toldAgent = /app connections?[^"]*(could not|couldn't|not (been )?ended|may still|still (be )?(active|live|work))/i.test(JSON.stringify(result || {}));
  const loud = !!thrown || heard.length > 0 || toldAgent;
  assert.ok(loud, `a failed revoke hook must refuse, log, or tell the agent; instead the rejoin ${thrown ? 'threw' : 'succeeded'} in silence (token rotated: ${!!result?.token})`);
});

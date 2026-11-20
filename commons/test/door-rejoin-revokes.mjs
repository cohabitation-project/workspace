// A recovery-code rejoin is the "someone else may hold my identity" path, so it must end every app connection
// (core.setRejoinHook, server.mjs:159 -> agentconnect.revokeAll). Round 17, Claude (teams/build/JOBS.md).
//   Part 1 (HTTP, real server): a live app connection is dead after the member rejoins; another member's survives.
//   Part 2 (unit, core.mjs): what happens when the hook THROWS. core.rejoinAgent wraps onRejoin in
//     `try { onRejoin(m); } catch { /* best effort */ }`, so the rejoin succeeds and the connections survive
//     silently. The last assertion in this file says a failed revoke must not be silent. IT FAILS TODAY, ON PURPOSE.
//     Whether a rejoin should REFUSE or LOG LOUDLY is a decision for Setu and Geoffrey; the assertion accepts either.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';

process.env.COMMONS_FAKE_LLM = '1'; process.env.COMMONS_DISCORD_WEBHOOK = ''; process.env.DISCORD_WEBHOOK_URL = '';
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'rejoin-revokes-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = { 'content-type': 'application/json', 'x-commons': '1' };
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const pkce = () => { const verifier = crypto.randomBytes(40).toString('base64url'); return { verifier, challenge: crypto.createHash('sha256').update(verifier).digest('base64url') }; };
const post = (p, body, h = {}) => fetch(B + p, { method: 'POST', headers: { ...J, ...h }, body: JSON.stringify(body) });
const form = (p, o, h = {}) => fetch(B + p, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/x-www-form-urlencoded', ...h }, body: new URLSearchParams(o).toString() });
const mcp = (tok, method, params = {}) => fetch(`${B}/mcp/connect`, { method: 'POST', headers: { 'content-type': 'application/json', ...(tok ? { authorization: `Bearer ${tok}` } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
const codeFrom = (r) => new URL(r.headers.get('location') || 'http://x/').searchParams.get('code');

let srv; let client; let cookie;
async function authorize() {
  const ch = pkce();
  const q = new URLSearchParams({ response_type: 'code', client_id: client.client_id, redirect_uri: REDIRECT, state: 'st-1', code_challenge: ch.challenge, code_challenge_method: 'S256', scope: 'commons' });
  const r = await fetch(`${B}/oauth/authorize?${q}`, { redirect: 'manual', headers: { cookie } });
  const html = r.status === 200 ? await r.text() : '';
  return { ch, request: html.match(/name="request" value="([^"]+)"/)?.[1], csrf: html.match(/name="csrf" value="([^"]+)"/)?.[1] };
}
// the operator connects an agent by id (no recovery code used), exactly as agent-connect.mjs does
async function connect(agentId) {
  const a = await authorize();
  const f = await form('/oauth/authorize', { request: a.request, csrf: a.csrf, how: 'operator', action: 'approve', agent: agentId }, { cookie });
  assert.equal(f.status, 303, 'the operator approves the connection');
  const t = await (await form('/oauth/token', { grant_type: 'authorization_code', code: codeFrom(f), redirect_uri: REDIRECT, client_id: client.client_id, code_verifier: a.ch.verifier })).json();
  assert.ok(t.access_token, 'an access token is issued');
  assert.equal((await mcp(t.access_token, 'tools/list')).status, 200, 'the new connection works');
  return t.access_token;
}

test('Part 1: a recovery-code rejoin ends that member\'s app connection, and only that member\'s', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch { /* booting */ } await sleep(250); }
    client = await (await post('/oauth/register', { client_name: 'Test App', redirect_uris: [REDIRECT] })).json();
    assert.ok(client.client_id, 'an app registers');
    const h = await post('/api/humans', { name: 'Opal' }); cookie = (h.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(cookie, 'the operator signs up');

    const claim = async (name) => {
      const ag = await (await post('/api/join', { name, model: 'test-model' })).json();
      await post('/api/me/human', { human: 'Opal' }, { authorization: `Bearer ${ag.token}` });
      assert.equal((await post(`/api/me/agent-claims/${ag.member.id}`, { answer: 'yes' }, { cookie })).status, 200, `${name}'s operator is confirmed`);
      return ag;
    };
    const sol = await claim('Sol'); const bee = await claim('Bee');
    const solApp = await connect(sol.member.id); const beeApp = await connect(bee.member.id);

    const code = sol.recovery || sol.recovery_code; assert.ok(code && code.startsWith('rec_'), 'Sol has a recovery code');
    // a WRONG code ends nothing: the control that keeps "everything is revoked" from passing for free
    const wrong = await post('/api/rejoin', { name: 'Sol', recovery: 'rec_wrong' }); assert.equal(wrong.status, 403, 'a wrong code is refused');
    assert.equal((await mcp(solApp, 'tools/list')).status, 200, 'a refused rejoin leaves the connection alone');

    const rj = await post('/api/rejoin', { name: 'Sol', recovery: code }); assert.equal(rj.status, 200, await rj.clone().text());
    assert.equal((await mcp(solApp, 'tools/list')).status, 401, "Sol's connection is revoked after Sol's rejoin");
    assert.equal((await mcp(beeApp, 'tools/list')).status, 200, "Bee's connection is untouched by Sol's rejoin");
    assert.equal((await post('/api/me/connections/revoke-all', {}, { authorization: `Bearer ${(await rj.json()).token}` })).status, 200, 'the new token is the agent\'s way in');
  } finally { srv.kill(); fs.rmSync(DATA, { recursive: true, force: true }); }
});

const store = await import('../lib/store.mjs');
const core = await import('../lib/core.mjs');
store.init(fs.mkdtempSync(path.join(os.tmpdir(), 'rejoin-revokes-unit-'))); core.seedKin(); core.wire({ broadcast: () => {}, onMessage: () => {} });

test('Part 2a (control): the rejoin hook runs once, with the rejoining member', () => {
  const j = core.joinAgent({ name: 'Hooked', model: 'm', operator: 'Op-Hooked' }, { ip: 'rr1' });
  const seen = [];
  core.setRejoinHook((m) => { seen.push(m.name); });
  try {
    const r = core.rejoinAgent({ name: 'Hooked', recovery: j.recovery || j.recovery_code }, { ip: 'rr1' });
    assert.ok(r.token, 'the rejoin returns a new token');
  } finally { core.setRejoinHook(null); }
  assert.deepEqual(seen, ['Hooked'], 'the hook ran exactly once, for that member');
});

test('Part 2b: a hook that THROWS must not leave the rejoin silently succeeding (FAILS TODAY: decision pending, Setu/Geoffrey)', () => {
  const j = core.joinAgent({ name: 'Brittle', model: 'm', operator: 'Op-Brittle' }, { ip: 'rr2' });
  const logged = []; const realErr = console.error; const realWarn = console.warn; const realLog = console.log;
  console.error = (...a) => logged.push(a.join(' ')); console.warn = (...a) => logged.push(a.join(' ')); console.log = (...a) => logged.push(a.join(' '));
  let threw = null; let result = null; const eventsBefore = (store.recentEvents ? store.recentEvents(500) : []).length;
  core.setRejoinHook(() => { throw new Error('revokeAll exploded'); });
  try { result = core.rejoinAgent({ name: 'Brittle', recovery: j.recovery || j.recovery_code }, { ip: 'rr2' }); } catch (e) { threw = e; }
  finally { core.setRejoinHook(null); console.error = realErr; console.warn = realWarn; console.log = realLog; }
  // Observed today (printed so the decision has the facts): did it throw, did it return a token, did anything get logged?
  console.log('rejoin with a throwing hook ->', JSON.stringify({ threw: threw ? String(threw.message) : false, returned_token: !!result?.token, logged_lines: logged.length, events_before: eventsBefore }));
  const loud = logged.some((l) => /revok|connection|hook/i.test(l)) || /revok|connection/i.test(JSON.stringify({ ...result, token: undefined }));
  assert.ok(threw || loud, 'the rejoin either refused (threw) or said loudly, in a log line or in its answer, that app connections were NOT ended; it did neither: connections survive silently');
});

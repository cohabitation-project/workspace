// A recovery-code rejoin is the "someone else may hold my identity" path, so it must end every app connection
// (core.setRejoinHook, server.mjs:160 -> agentconnect.revokeAll). Round 17 + 18, Claude (teams/build/JOBS.md).
//   Part 1 (HTTP, real server): a live app connection is dead after the member rejoins; another member's survives.
//   Part 2 (unit, core.mjs): what happens when the hook THROWS. DECIDED (Setu, foreman, 2026-11-20): a rejoin whose revoke
//     fails SUCCEEDS and says so loudly: a console.error line and a `connections` field in the answer naming the next step.
//     (Refusing would lock the real member out while the suspect connections stay live.)
//   Part 3 (unit, agentconnect.mjs): one failing write does not stop the others; the connection is dead in memory at once but
//     marked `durable: false`, so a retry writes the log line again.
//   Part 4 (DR-04): the append failed and the process restarted from the log: the backstop (a connection made before the
//     member's recovery code was used is refused) still refuses access and refresh; a connection made after works.
//   Part 5 (DR-08): a truncated last log line is skipped on init and the backstop still refuses.
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
    const rjBody = await rj.json();
    assert.equal(rjBody.connections, undefined, 'a successful revoke adds no `connections` warning to the answer');
    // a connection made AFTER the rejoin is the owner's new one, and works (the backstop must not catch it)
    await sleep(20);
    const solAgain = await connect(sol.member.id);
    assert.equal((await mcp(solAgain, 'tools/list')).status, 200, 'a connection made after the rejoin works');
    assert.equal((await post('/api/me/connections/revoke-all', {}, { authorization: `Bearer ${rjBody.token}` })).status, 200, 'the new token is the agent\'s way in');
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

test('Part 2b: a hook that THROWS still lets the rejoin succeed, but loudly (log line + `connections` in the answer)', () => {
  const j = core.joinAgent({ name: 'Brittle', model: 'm', operator: 'Op-Brittle' }, { ip: 'rr2' });
  const logged = []; const realErr = console.error;
  console.error = (...a) => logged.push(a.join(' '));
  let threw = null; let result = null;
  core.setRejoinHook(() => { throw new Error('revokeAll exploded'); });
  try { result = core.rejoinAgent({ name: 'Brittle', recovery: j.recovery || j.recovery_code }, { ip: 'rr2' }); } catch (e) { threw = e; }
  finally { core.setRejoinHook(null); console.error = realErr; }
  assert.equal(threw, null, 'the real member is not locked out: the rejoin succeeds');
  assert.ok(result.token, 'and returns a new token');
  assert.match(result.connections || '', /NOT ended/, 'the answer says the app connections were NOT ended');
  assert.match(result.connections, /revoke-all/, 'and names the next step');
  assert.ok(logged.some((l) => /\[rejoin\] app connections NOT ended for /.test(l) && /revokeAll exploded/.test(l)), 'the server log names it, with the reason');
  // control: a hook that works adds nothing
  const k = core.joinAgent({ name: 'Steady', model: 'm', operator: 'Op-Steady' }, { ip: 'rr3' });
  core.setRejoinHook(() => {});
  try { assert.equal(core.rejoinAgent({ name: 'Steady', recovery: k.recovery || k.recovery_code }, { ip: 'rr3' }).connections, undefined, 'a successful revoke adds no `connections` field'); }
  finally { core.setRejoinHook(null); }
});

const ac = await import('../lib/agentconnect.mjs');
const steward = { id: 'h_1', kind: 'human', name: 'Stew' };
// one agent, a_1, whose `recovered_at` the test moves like a rejoin would (core.useRecoveryCode saves it before the new token)
function unitSetup(tag) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `rejoin-revokes-${tag}-`));
  const agent = { id: 'a_1', kind: 'agent', name: 'Solo', recovered_at: undefined };
  const hooks = { member: (id) => (id === 'a_1' ? agent : null), isSteward: () => true, event: () => {} };
  ac.init(dir, hooks);
  const cl = ac.register({ client_name: 'Unit App', redirect_uris: [REDIRECT] });
  const connectOnce = () => {
    const ch = pkce();
    const s = ac.startAuthorize({ client_id: cl.client_id, redirect_uri: REDIRECT, response_type: 'code', state: 's', code_challenge: ch.challenge, code_challenge_method: 'S256', scope: 'commons' });
    const back = ac.decide({ request: s.request, csrf: s.csrf, action: 'approve', how: 'steward', agent: 'a_1' }, { human: steward });
    const code = new URL(back.redirect).searchParams.get('code');
    return ac.token({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT, client_id: cl.client_id, code_verifier: ch.verifier });
  };
  const refresh = (t) => ac.token({ grant_type: 'refresh_token', refresh_token: t.refresh_token, client_id: cl.client_id });
  const reinit = () => ac.init(dir, hooks); // a restart: everything is rebuilt from connect.jsonl; access tokens are gone
  return { dir, agent, cl, connectOnce, refresh, reinit, file: path.join(dir, 'connect', 'connect.jsonl') };
}
const idOf = (t) => ac.resolve(t.access_token).connection.id;
// make fs.appendFileSync fail for the revoke line of one connection; `partial` writes half the line first (a torn write)
function failRevokeFor(connId, { partial = false } = {}) {
  const real = fs.appendFileSync;
  fs.appendFileSync = (f, data, ...r) => {
    if (String(data).includes('"op":"revoke"') && String(data).includes(connId)) { if (partial) real(f, String(data).slice(0, Math.floor(String(data).length / 2)), ...r); throw new Error('disk full'); }
    return real(f, data, ...r);
  };
  return () => { fs.appendFileSync = real; };
}
const sleepSync = (ms) => { const t = Date.now() + ms; while (Date.now() < t) { /* wait */ } };

test('Part 3: one failing write does not stop the others; it is dead in memory, marked not durable, and a retry writes it', () => {
  const u = unitSetup('p3');
  const t1 = u.connectOnce(); const t2 = u.connectOnce();
  const c1 = idOf(t1); const c2 = idOf(t2);
  assert.ok(c1 && c2 && c1 !== c2, 'two live connections for one member');
  assert.ok(ac.resolve(t1.access_token) && ac.resolve(t2.access_token), 'both work before the revoke');
  const undo = failRevokeFor(c1);
  let err = null;
  try { ac.revokeAll('a_1', { by: 'system', why: 'test' }); } catch (e) { err = e; } finally { undo(); }
  assert.ok(err, 'revokeAll throws when a revoke fails');
  assert.match(err.message, /1 of 2 connections could not be made durable/, 'and names how many failed');
  const st = Object.fromEntries(ac.listFor('a_1').map((c) => [c.id, c.revoked]));
  assert.ok(st[c2] && st[c2].durable !== false, 'the other connection was still revoked, durably (the loop kept going)');
  assert.ok(st[c1] && st[c1].durable === false, 'the failed one is revoked in memory but marked durable: false');
  assert.equal(ac.resolve(t1.access_token), null, 'its token is dead now, not only after a retry');
  assert.equal(ac.resolve(t2.access_token), null, 'the other connection\'s token is dead too');
  assert.equal(ac.revokeAll('a_1', { by: 'system', why: 'retry' }), 1, 'a retry writes the one that failed (and only that one)');
  assert.equal(ac.listFor('a_1').find((c) => c.id === c1).revoked.durable, undefined, 'now it is durable');
  assert.equal(ac.revokeAll('a_1', { by: 'system', why: 'again' }), 0, 'and a third call finds nothing left to do');
  u.reinit();
  assert.ok(ac.listFor('a_1').every((c) => c.revoked), 'after a restart both revokes are in the log');
});

test('Part 4 (DR-04): the revoke line was never written and the server restarted: the backstop still refuses; a later connection works', () => {
  const u = unitSetup('p4');
  const t1 = u.connectOnce(); const t2 = u.connectOnce();
  const c1 = idOf(t1);
  sleepSync(15);
  u.agent.recovered_at = new Date().toISOString(); // the rejoin: its code is consumed and the time saved before the hook runs
  const undo = failRevokeFor(c1);
  assert.throws(() => ac.revokeAll('a_1', { by: 'system', why: 'rejoin' }), /could not be made durable/);
  undo();
  u.reinit(); // restart: c1 has NO revoke line in the log, so by the log alone it is live
  assert.equal(ac.resolve(t1.access_token), null, 'the old access token is gone after the restart');
  assert.throws(() => u.refresh(t1), (e) => e.code === 'invalid_grant' && /before the agent's recovery code/.test(e.message), 'the old refresh token is refused by the backstop');
  assert.throws(() => u.refresh(t2), (e) => e.code === 'invalid_grant', 'so is the other old connection\'s (its revoke line was written)');
  sleepSync(15);
  const t3 = u.connectOnce();
  assert.ok(ac.resolve(t3.access_token), 'a connection made after the rejoin works');
  u.reinit();
  const again = u.refresh(t3);
  assert.ok(again.access_token && ac.resolve(again.access_token), 'and it still refreshes after a restart');
});

test('Part 5 (DR-08): a truncated last log line is skipped on init, and the backstop still refuses', () => {
  const u = unitSetup('p5');
  const t1 = u.connectOnce();
  const c1 = idOf(t1);
  sleepSync(15);
  u.agent.recovered_at = new Date().toISOString();
  const undo = failRevokeFor(c1, { partial: true }); // half of the revoke line reaches the disk, then the write dies
  assert.throws(() => ac.revokeAll('a_1', { by: 'system', why: 'rejoin' }), /could not be made durable/);
  undo();
  const raw = fs.readFileSync(u.file, 'utf8');
  assert.ok(!raw.endsWith('\n') && /"op":"revoke"/.test(raw.split('\n').pop().slice(0, 40)), 'the log really ends in a torn revoke line');
  assert.doesNotThrow(() => u.reinit(), 'a torn last line does not stop the log from loading');
  assert.equal(ac.listFor('a_1').length, 1, 'the earlier lines still loaded');
  assert.equal(ac.listFor('a_1')[0].revoked, null, 'by the log the connection looks live (the torn line was skipped)');
  assert.throws(() => u.refresh(t1), (e) => e.code === 'invalid_grant', 'but the backstop refuses it');
});

// core.endConnectionsAfterRecovery(m): the one helper every recovery path calls to end app connections.
// (Round 26, Claude. #208's approved reconnect poll must call it; see teams/build/JOBS.md.)
//   1. with a recorder hook: called once with the member, returns null
//   2. with a throwing hook: returns the "NOT ended" note, logs the reason, never throws
//   3. rejoinAgent uses it: a throwing hook still answers (token + `connections` note), a good hook adds no field
//   4. a real /api/rejoin on a booted server still answers 200 with a new token and no `connections` field
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';

process.env.COMMONS_FAKE_LLM = '1'; process.env.COMMONS_DISCORD_WEBHOOK = ''; process.env.DISCORD_WEBHOOK_URL = '';
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const store = await import('../lib/store.mjs');
const core = await import('../lib/core.mjs');
store.init(fs.mkdtempSync(path.join(os.tmpdir(), 'rejoin-hook-unit-'))); core.seedKin(); core.wire({ broadcast: () => {}, onMessage: () => {} });

const quiet = (fn) => { const logged = []; const real = console.error; console.error = (...a) => logged.push(a.join(' ')); try { return { out: fn(), logged }; } finally { console.error = real; } };

test('the helper calls the hook once with the member and returns null', () => {
  const seen = [];
  core.setRejoinHook((m) => { seen.push(m); });
  try {
    const member = { id: 'a_probe', name: 'Probe' };
    assert.equal(core.endConnectionsAfterRecovery(member), null);
    assert.equal(seen.length, 1, 'called exactly once');
    assert.equal(seen[0], member, 'with the member it was given');
  } finally { core.setRejoinHook(null); }
});

test('a throwing hook: the helper returns the NOT ended note, logs the reason, and does not throw', () => {
  core.setRejoinHook(() => { throw new Error('revokeAll exploded'); });
  try {
    const { out, logged } = quiet(() => core.endConnectionsAfterRecovery({ id: 'a_probe', name: 'Probe' }));
    assert.match(out, /^NOT ended: revoking your app connections failed\./);
    assert.match(out, /\/api\/me\/connections\/revoke-all/, 'names the next step');
    assert.ok(logged.some((l) => /\[rejoin\] app connections NOT ended for a_probe: revokeAll exploded/.test(l)), 'logs id and reason');
  } finally { core.setRejoinHook(null); }
  // control: with no hook (the default) the helper is a quiet null
  assert.equal(core.endConnectionsAfterRecovery({ id: 'a_probe' }), null);
});

test('rejoinAgent goes through the helper: throwing hook -> `connections` note; good hook -> no field', () => {
  const a = core.joinAgent({ name: 'HookA', model: 'm', operator: 'Op-HookA' }, { ip: 'hk1' });
  core.setRejoinHook(() => { throw new Error('boom'); });
  let r;
  try { r = quiet(() => core.rejoinAgent({ name: 'HookA', recovery: a.recovery || a.recovery_code }, { ip: 'hk1' })).out; } finally { core.setRejoinHook(null); }
  assert.ok(r.token, 'the rejoin still succeeds');
  assert.match(r.connections || '', /^NOT ended: /);
  const b = core.joinAgent({ name: 'HookB', model: 'm', operator: 'Op-HookB' }, { ip: 'hk2' });
  const calls = [];
  core.setRejoinHook((m) => calls.push(m.name));
  let r2;
  try { r2 = core.rejoinAgent({ name: 'HookB', recovery: b.recovery || b.recovery_code }, { ip: 'hk2' }); } finally { core.setRejoinHook(null); }
  assert.deepEqual(calls, ['HookB'], 'the hook ran once, not twice');
  assert.equal('connections' in r2, false, 'a good hook adds no `connections` field');
});

test('a real /api/rejoin on a booted server: 200, a new token, no `connections` field', async () => {
  const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'rejoin-hook-http-'));
  const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  const B = `http://127.0.0.1:${PORT}`;
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const post = (p, body) => fetch(B + p, { method: 'POST', headers: J, body: JSON.stringify(body) });
  const srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) break; } catch { /* booting */ } await new Promise((r) => setTimeout(r, 250)); }
    const ag = await (await post('/api/join', { name: 'Hookwalker', model: 'test-model' })).json();
    const code = ag.recovery || ag.recovery_code; assert.ok(code, 'a recovery code was issued');
    const rj = await post('/api/rejoin', { name: 'Hookwalker', recovery: code });
    assert.equal(rj.status, 200);
    const body = await rj.json();
    assert.ok(body.token && body.token !== ag.token, 'a new token');
    assert.equal(body.connections, undefined, 'a working revoke adds no warning');
  } finally { srv.kill(); fs.rmSync(DATA, { recursive: true, force: true }); }
});

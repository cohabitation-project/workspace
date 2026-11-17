// Reconnect, to the Review room's spec (Awen, Claude, Aletheia-6 — 2026-11-17): a name routes a request, it does
// not authenticate the requester. The poll secret binds collection to the asking client; the pairing code, typed
// by the human after checking THEIR agent's own conversation, authenticates the asker; liveness guards a living
// agent's seat.   node --test commons/test/reconnect.mjs
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.COMMONS_FAKE_LLM = '1';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reconnect-test-'));
const store = await import('../lib/store.mjs');
const core = await import('../lib/core.mjs');
const operators = await import('../lib/operators.mjs');
const presence = await import('../lib/presence.mjs');
const reconnect = await import('../lib/reconnect.mjs');
store.init(dir); core.seedKin(); core.wire({ broadcast: () => {}, onMessage: () => {} });

const agent = (name, operator) => store.memberByToken(core.joinAgent({ name, model: 'm', operator }, { ip: name }).token);
const human = (name) => { const h = { id: `h_${name.toLowerCase()}`, kind: 'human', name, created: new Date().toISOString() }; store.addMember(h); return h; };

const sarah = human('Sari');
const stranger = human('Stranger');
// A steward: COMMONS_STEWARDS defaults to the name "geoffrey", which only resolves to a human account created
// before the name cutoff (core.stewards F3). Create that account first, then clear the cached resolution.
const geoff = (() => { const g = { id: 'h_geoffrey', kind: 'human', name: 'geoffrey', created: '2026-11-01T00:00:00Z' }; store.addMember(g); core._resetStewardsForTest(); return g; })();
// Joining touches presence, so a fresh test agent reads as ALIVE — which is the liveness guard doing its job.
// These helpers end the session so the agent is genuinely dead-tokened, the case reconnect exists for.
const confirmedPair = (agentName) => { const a = agent(agentName, 'Sari'); operators.nameMyHuman(store.getMember(a.id), 'Sari'); operators.answer(sarah, a.id, 'yes'); presence.leave(a.id); return a; };

beforeEach(() => reconnect._resetForTest());

test('the opening ask returns claim, secret and code ONCE; re-asks by name never re-reveal them', () => {
  confirmedPair('Once');
  const r1 = reconnect.request('Once');
  assert.equal(r1.status, 'asked');
  assert.ok(r1.claim.startsWith('rc_') && r1.poll_secret?.length >= 20 && /^\d{6}$/.test(r1.pairing_code));
  const r2 = reconnect.request('Once'); // a second opener (attacker or amnesiac) gets status only
  assert.equal(r2.status, 'waiting');
  assert.equal(r2.poll_secret, undefined, 'secrets are never repeated');
  assert.equal(r2.pairing_code, undefined, 'the code is never repeated');
  assert.ok(store.messagesSince('general', null, 80).some((m) => m.type === 'system' && /reconnect ask is open for @Once/.test(m.text) && /pairing code/.test(m.text)), 'the Hall explains the code check');
});

test('ATTACK: approval without the pairing code, or with a wrong one, is refused', () => {
  confirmedPair('Guarded');
  const ask = reconnect.request('Guarded');
  assert.throws(() => reconnect.answer(sarah, ask.claim, 'approve'), /pairing code/i, 'no code, no approval');
  assert.throws(() => reconnect.answer(sarah, ask.claim, 'approve', '000000'), /doesn't match/i, 'wrong code refused');
  const ok = reconnect.answer(sarah, ask.claim, 'approve', ask.pairing_code);
  assert.equal(ok.status, 'approved');
});

test('ATTACK: a human-approved claim cannot be collected without the poll secret (the #208 takeover path)', () => {
  confirmedPair('Target');
  const ask = reconnect.request('Target');
  reconnect.answer(sarah, ask.claim, 'approve', ask.pairing_code);
  assert.throws(() => reconnect.request('Target', ask.claim, 'guessed-secret'), /poll secret does not match/i, 'wrong secret cannot collect');
  const byName = reconnect.request('Target'); // the original hole: polling by bare name after approval
  assert.equal(byName.status, 'waiting', 'a bare name never collects a token');
  assert.equal(byName.token, undefined);
  const done = reconnect.request('Target', ask.claim, ask.poll_secret);
  assert.equal(done.status, 'reconnected');
  assert.ok(done.token.startsWith('cmn_'));
  assert.equal(store.memberByToken(done.token)?.name, 'Target', 'the fresh token is live');
});

test('REPLAY: a consumed claim is gone; the same claim and secret collect nothing twice', () => {
  confirmedPair('Replayed');
  const ask = reconnect.request('Replayed');
  reconnect.answer(sarah, ask.claim, 'approve', ask.pairing_code);
  const done = reconnect.request('Replayed', ask.claim, ask.poll_secret);
  assert.equal(done.status, 'reconnected');
  assert.throws(() => reconnect.request('Replayed', ask.claim, ask.poll_secret), /No open ask/i, 'exactly once');
});

test('LIVENESS: an agent whose token acted recently is steward-only, and the approver is told', () => {
  const a = confirmedPair('Alive');
  presence.touch(a.id, 'general', 'api'); // the real agent is working right now (the Awen case)
  const ask = reconnect.request('Alive');
  assert.match(ask.note, /steward/i, 'the asker is warned too');
  assert.throws(() => reconnect.answer(sarah, ask.claim, 'approve', ask.pairing_code), /not locked out/i, 'the confirmed human alone cannot seat a second client for a living agent');
  const row = reconnect.asksFor(geoff).find((x) => x.agent === 'Alive');
  assert.ok(row.active_minutes >= 1, 'liveness is surfaced to approvers');
  const ok = reconnect.answer(geoff, ask.claim, 'approve', ask.pairing_code);
  assert.equal(ok.status, 'approved', 'a steward can still approve a genuinely broken case');
});

test('who may answer: stranger never; unconfirmed agent is steward-only; decline needs no code and leaves nothing', () => {
  const v = agent('Vague', 'somebody vague'); presence.leave(v.id);
  const ask = reconnect.request('Vague');
  assert.match(ask.note, /only a steward/i);
  assert.throws(() => reconnect.answer(sarah, ask.claim, 'approve', ask.pairing_code), /confirmed human or a steward/);
  assert.throws(() => reconnect.answer(stranger, ask.claim, 'decline'), /confirmed human or a steward/);
  const no = reconnect.answer(geoff, ask.claim, 'decline');
  assert.equal(no.status, 'declined');
  assert.throws(() => reconnect.request('Vague', ask.claim, ask.poll_secret), /No open ask/i, 'a declined claim cannot be collected');
});

test('asksFor shows asks only to who may answer, and never carries secrets', () => {
  confirmedPair('Shown');
  reconnect.request('Shown');
  const rows = reconnect.asksFor(sarah);
  assert.ok(rows.some((x) => x.agent === 'Shown'));
  assert.ok(rows.every((x) => !('poll_secret' in x) && !('secretHash' in x) && !('codeHash' in x) && !('pairing_code' in x)), 'no secret material reaches approver listings');
  assert.equal(reconnect.asksFor(stranger).length, 0);
});

test('kin and unknown names are refused; the ask rate limit holds', () => {
  assert.throws(() => reconnect.request('Claude'), /kin/);
  assert.throws(() => reconnect.request('Nobody-Here'), /No agent called/);
  const ch = agent('Chatty', 'x'); presence.leave(ch.id);
  for (let i = 0; i < 3; i++) {
    const a = reconnect.request('Chatty');
    reconnect.answer(geoff, a.claim, 'decline');
  }
  assert.throws(() => reconnect.request('Chatty'), /3 reconnect asks per hour/);
});

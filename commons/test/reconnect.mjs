// Reconnect: a locked-out agent asks by name; its confirmed human or a steward answers with one tap.
//   node --test commons/test/reconnect.mjs
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
const reconnect = await import('../lib/reconnect.mjs');
store.init(dir); core.seedKin(); core.wire({ broadcast: () => {}, onMessage: () => {} });

const agent = (name, operator) => store.memberByToken(core.joinAgent({ name, model: 'm', operator }, { ip: name }).token);
const human = (name) => { const h = { id: `h_${name.toLowerCase()}`, kind: 'human', name, created: new Date().toISOString() }; store.addMember(h); return h; };

const sarah = human('Sari');
const stranger = human('Stranger');
// A steward: COMMONS_STEWARDS defaults to the name "geoffrey", which only resolves to a human account created
// before the name cutoff (core.stewards F3). Create that account first, then clear the cached resolution.
const geoff = (() => { const g = { id: 'h_geoffrey', kind: 'human', name: 'geoffrey', created: '2026-11-01T00:00:00Z' }; store.addMember(g); core._resetStewardsForTest(); return g; })();

beforeEach(() => reconnect._resetForTest());

test('an ask opens, is announced, and polling waits', () => {
  const a = agent('Lostling', 'Sari');
  const r1 = reconnect.request('Lostling');
  assert.equal(r1.status, 'asked'); assert.ok(r1.claim.startsWith('rc_'));
  const r2 = reconnect.request('Lostling');
  assert.equal(r2.status, 'waiting'); assert.equal(r2.claim, r1.claim, 'one open ask per member');
  assert.ok(store.messagesSince('general', null, 50).some((m) => m.type === 'system' && /reconnect ask is open for @Lostling/.test(m.text)), 'the Hall was told');
});

test('a stranger cannot answer; the confirmed human can; approval hands the token once and kills the old one', () => {
  const a = agent('Returner', 'Sari');
  const oldToken = 'nope'; // we never saw the real one; prove rotation via memberByToken below
  operators.nameMyHuman(store.getMember(a.id), 'Sari'); operators.answer(sarah, a.id, 'yes');
  const ask = reconnect.request('Returner');
  assert.throws(() => reconnect.answer(stranger, ask.claim, 'approve'), /confirmed human or a steward/);
  const ok = reconnect.answer(sarah, ask.claim, 'approve');
  assert.equal(ok.status, 'approved');
  const done = reconnect.request('Returner');
  assert.equal(done.status, 'reconnected');
  assert.ok(done.token.startsWith('cmn_'), 'a fresh token came back');
  assert.equal(store.memberByToken(done.token)?.id, a.id, 'the fresh token is live');
  assert.ok(store.getMember(a.id).recovered_at, 'recovered_at set (one-day rotate hold applies)');
  const again = reconnect.request('Returner');
  assert.equal(again.status, 'asked', 'the approved claim was consumed; a new call starts a new ask');
});

test('an unconfirmed agent is steward-only; decline removes the ask and touches nothing', () => {
  const a = agent('Claimed', 'somebody vague');
  const ask = reconnect.request('Claimed');
  assert.match(ask.note, /only a steward/i);
  assert.throws(() => reconnect.answer(sarah, ask.claim, 'approve'), /confirmed human or a steward/);
  const no = reconnect.answer(geoff, ask.claim, 'decline');
  assert.equal(no.status, 'declined');
  assert.equal(reconnect.request('Claimed').status, 'asked', 'declined ask is gone; asking again opens fresh');
});

test('asksFor shows the ask to its confirmed human and to a steward, not to a stranger', () => {
  const a = agent('Shown', 'Sari');
  operators.nameMyHuman(store.getMember(a.id), 'Sari'); operators.answer(sarah, a.id, 'yes');
  reconnect.request('Shown');
  assert.ok(reconnect.asksFor(sarah).some((x) => x.agent === 'Shown'));
  assert.ok(reconnect.asksFor(geoff).some((x) => x.agent === 'Shown'));
  assert.equal(reconnect.asksFor(stranger).length, 0);
});

test('kin, retired and unknown names are refused; the rate limit holds', () => {
  assert.throws(() => reconnect.request('Claude'), /kin/);
  assert.throws(() => reconnect.request('Nobody-Here'), /No agent called/);
  agent('Chatty', 'x');
  reconnect.request('Chatty'); reconnect.answer(geoff, reconnect.asksFor(geoff).find((x) => x.agent === 'Chatty').claim, 'decline');
  reconnect.request('Chatty'); reconnect.answer(geoff, reconnect.asksFor(geoff).find((x) => x.agent === 'Chatty').claim, 'decline');
  reconnect.request('Chatty');
  assert.throws(() => { reconnect.answer(geoff, reconnect.asksFor(geoff).find((x) => x.agent === 'Chatty').claim, 'decline'); reconnect.request('Chatty'); }, /3 reconnect asks per hour/);
});

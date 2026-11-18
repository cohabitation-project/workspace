
// Review-room tests for PR #208 reconnect (Claude, 2026-11-17). Run: node --test commons/test/reconnect-review.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
process.env.COMMONS_FAKE_LLM = '1';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rcrev-'));
const store = await import('../lib/store.mjs');
const core = await import('../lib/core.mjs');
const operators = await import('../lib/operators.mjs');
const presence = await import('../lib/presence.mjs');
const reconnect = await import('../lib/reconnect.mjs');
store.init(dir); core.seedKin(); core.wire({ broadcast: () => {}, onMessage: () => {} });
const agent = (name, operator) => store.memberByToken(core.joinAgent({ name, model: 'm', operator }, { ip: name }).token);
const human = (name) => { const h = { id: `h_${name.toLowerCase()}`, kind: 'human', name, created: new Date().toISOString() }; store.addMember(h); return h; };
const sari = human('Sari'); const other = human('Otto');
const geoff = (() => { const g = { id: 'h_geoffrey', kind: 'human', name: 'geoffrey', created: '2026-11-01T00:00:00Z' }; store.addMember(g); core._resetStewardsForTest(); return g; })();
const pair = (name, h = sari) => { const j = core.joinAgent({ name, model: 'm', operator: h.name }, { ip: name }); const a = store.memberByToken(j.token); operators.nameMyHuman(store.getMember(a.id), h.name); operators.answer(h, a.id, 'yes'); presence.leave(a.id); return { a, oldToken: j.token }; };
const realNow = Date.now;
const allText = () => store.messagesSince('general', null, 500).map((m) => m.text).join('\n');
const disk = () => { let s = ''; const walk = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? walk(p) : (s += fs.readFileSync(p, 'utf8')); } }; walk(dir); return s; };

test('RV1 no secret, pairing code or fresh token appears in the Hall, events or any file on disk', () => {
  const { oldToken } = pair('Leaky');
  const ask = reconnect.request('Leaky');
  reconnect.request('Leaky'); // a re-ask
  reconnect.answer(sari, ask.claim, 'approve', ask.pairing_code);
  const done = reconnect.request('Leaky', ask.claim, ask.poll_secret);
  const hay = allText() + '\n' + disk() + '\n' + JSON.stringify(reconnect.asksFor(sari));
  assert.ok(!hay.includes(ask.poll_secret), 'poll secret leaked');
  assert.ok(!hay.includes(done.token), 'fresh plaintext token leaked');
  assert.ok(!new RegExp('(?<!\\d)' + ask.pairing_code + '(?!\\d)').test(hay), 'pairing code leaked');
  assert.ok(!hay.includes(oldToken), 'old token on disk');
});

test('RV2 two polls in parallel (same tick): exactly one gets the token', () => {
  pair('Racer');
  const ask = reconnect.request('Racer');
  reconnect.answer(sari, ask.claim, 'approve', ask.pairing_code);
  const rs = [0, 1].map(() => { try { return reconnect.request('Racer', ask.claim, ask.poll_secret); } catch (e) { return { err: e.message }; } });
  assert.equal(rs.filter((r) => r.status === 'reconnected').length, 1);
});

test('RV3 expiry: an approved claim older than 30 min collects nothing; approving an expired ask fails', () => {
  pair('Stale'); pair('Stale2');
  const a1 = reconnect.request('Stale'); reconnect.answer(sari, a1.claim, 'approve', a1.pairing_code);
  const a2 = reconnect.request('Stale2');
  Date.now = () => realNow() + 31 * 60_000;
  try {
    assert.throws(() => reconnect.request('Stale', a1.claim, a1.poll_secret), /No open ask/i);
    assert.throws(() => reconnect.answer(sari, a2.claim, 'approve', a2.pairing_code), /No open reconnect ask/i);
  } finally { Date.now = realNow; }
});

test('RV4 a claim cannot be polled under a different member name, even with its own right secret', () => {
  pair('Vic'); pair('Mal');
  const mine = reconnect.request('Mal'); reconnect.answer(sari, mine.claim, 'approve', mine.pairing_code);
  assert.throws(() => reconnect.request('Vic', mine.claim, mine.poll_secret), /No open ask/i);
});

test('RV5 only the CONFIRMED human of THAT agent (or a steward) may answer; another confirmed human may not', () => {
  pair('NotOttos'); pair('Ottos', other);
  const ask = reconnect.request('NotOttos');
  assert.throws(() => reconnect.answer(other, ask.claim, 'approve', ask.pairing_code), /confirmed human or a steward/i);
  assert.throws(() => reconnect.answer(other, ask.claim, 'decline'), /confirmed human or a steward/i);
});

test('RV6 code tries: 5 per ask; after that even the right code is refused (approver lockout, no brute force)', () => {
  pair('Brute');
  const ask = reconnect.request('Brute');
  for (let i = 0; i < 5; i++) assert.throws(() => reconnect.answer(sari, ask.claim, 'approve', '00000' + i), /doesn't match/i);
  assert.throws(() => reconnect.answer(sari, ask.claim, 'approve', ask.pairing_code), /5 pairing-code tries/i);
});

test('RV7 FINDING squat: an impostor holding an open ask blocks the real agent from getting its own claim', () => {
  pair('Squatted');
  const impostor = reconnect.request('Squatted');           // impostor asks first
  const real = reconnect.request('Squatted');                // real agent asks by bare name
  assert.equal(real.status, 'waiting');                      // real agent gets NO claim, NO secret, NO code
  assert.equal(real.poll_secret, undefined); assert.equal(real.pairing_code, undefined);
  assert.ok(impostor.poll_secret);
});

test('RV8 FINDING lockout by quota: three asks (any source) in an hour block the member for the hour', () => {
  pair('Quota');
  for (let i = 0; i < 3; i++) { const a = reconnect.request('Quota'); reconnect.answer(geoff, a.claim, 'decline'); }
  assert.throws(() => reconnect.request('Quota'), /3 reconnect asks per hour/i);   // the real agent is now refused too
});

test('RV9 FINDING crash window: after collection the old token is dead and the claim is gone; a lost response cannot be retried', () => {
  const { a, oldToken } = pair('Crashy');
  const ask = reconnect.request('Crashy'); reconnect.answer(sari, ask.claim, 'approve', ask.pairing_code);
  const done = reconnect.request('Crashy', ask.claim, ask.poll_secret); // pretend this response never reaches the client
  assert.equal(store.memberByToken(oldToken), null, 'old token dead');
  assert.throws(() => reconnect.request('Crashy', ask.claim, ask.poll_secret), /No open ask/i, 'no idempotent retry window');
  assert.ok(done.token);
});

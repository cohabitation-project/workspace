// Reconnect guards: the negatives Claude's review of PR #208 (head bf6daf897c) asked for.   node --test commons/test/reconnect-guards.mjs
//
// This file needs commons/lib/reconnect.mjs, which only exists once #208 lands. On main today every test below fails
// with "needs #208" (red by design: that is not a bug in main). Against #208's head bf6daf897c the result is:
//   GREEN  code is 6 digits; the ask expires; wrong-code tries are capped per ask; a squatter's ask can be declined
//          and the real agent can then ask; a bare name never collects.
//   RED    "completing a reconnect ends the agent's app connections, as rejoin does" and "...and says so when it cannot":
//          #208's collecting poll (reconnect.mjs, `if (c.status === 'approved')` branch) rotates the token and sets
//          recovered_at but never runs the rejoin hook (core.rejoinAgent runs onRejoin -> agentconnect.revokeAll).
// Fix that makes both green (not written here, #208 is not edited): in core.mjs move the try/catch around onRejoin(m)
// into an exported helper, `export function endConnectionsAfterRecovery(m)` returning the connectionsNote or null; call
// it from rejoinAgent and from reconnect's approved poll, and put `connections: note` on the poll's answer when non-null.
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

process.env.COMMONS_FAKE_LLM = '1';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reconnect-guards-'));
const store = await import('../lib/store.mjs');
const core = await import('../lib/core.mjs');
const operators = await import('../lib/operators.mjs');
const presence = await import('../lib/presence.mjs');
let reconnect = null; let missing = '';
try { reconnect = await import('../lib/reconnect.mjs'); } catch (e) { missing = String(e && e.message || e).split('\n')[0]; }
store.init(dir); core.seedKin(); core.wire({ broadcast: () => {}, onMessage: () => {} });

const need = () => assert.ok(reconnect, `needs #208 (commons/lib/reconnect.mjs is not on this branch): ${missing}`);
const agent = (name, operator) => store.memberByToken(core.joinAgent({ name, model: 'm', operator }, { ip: name }).token);
const sari = (() => { const h = { id: 'h_sari', kind: 'human', name: 'Sari', created: new Date().toISOString() }; store.addMember(h); return h; })();
// A joined agent reads as alive (presence.touch); leaving makes it the dead-tokened case reconnect exists for.
const pair = (name) => { const a = agent(name, 'Sari'); operators.nameMyHuman(store.getMember(a.id), 'Sari'); operators.answer(sari, a.id, 'yes'); presence.leave(a.id); return a; };
const approve = (ask) => reconnect.answer(sari, ask.claim, 'approve', ask.pairing_code);

beforeEach(() => { core.setRejoinHook(null); reconnect?._resetForTest(); });

test('the pairing code is exactly six digits and differs between asks', () => {
  need();
  const codes = new Set();
  for (const n of ['Dig1', 'Dig2', 'Dig3']) { pair(n); const r = reconnect.request(n); assert.match(r.pairing_code, /^\d{6}$/, `${n}: six digits`); codes.add(r.pairing_code); }
  assert.ok(codes.size >= 2, 'three asks must not all carry the same code');
});

test('an ask expires after 30 minutes: neither approval nor a poll works past it', () => {
  need();
  pair('Expiring');
  const ask = reconnect.request('Expiring');
  const real = Date.now; Date.now = () => real() + 31 * 60_000;
  try {
    assert.throws(() => reconnect.answer(sari, ask.claim, 'approve', ask.pairing_code), (e) => e.status === 404, 'a late approval is refused');
    assert.throws(() => reconnect.request('Expiring', ask.claim, ask.poll_secret), (e) => e.status === 404, 'a late poll is refused');
  } finally { Date.now = real; }
  assert.equal(reconnect.asksFor(sari).filter((a) => a.agent === 'Expiring').length, 0, 'an expired ask is not on /my-agents');
});

test('brute force: wrong pairing codes are capped per ask, and the cap holds even for the right code afterwards', () => {
  need();
  pair('Brute');
  const ask = reconnect.request('Brute');
  const wrong = ask.pairing_code === '123456' ? '654321' : '123456';
  for (let i = 0; i < 5; i++) assert.throws(() => reconnect.answer(sari, ask.claim, 'approve', wrong), (e) => e.status === 400 && /doesn't match/i.test(e.message), `try ${i + 1} is an ordinary mismatch`);
  assert.throws(() => reconnect.answer(sari, ask.claim, 'approve', ask.pairing_code), (e) => e.status === 429, 'the sixth try is refused with 429, even with the right code');
  assert.equal(reconnect.request('Brute', ask.claim, ask.poll_secret).token, undefined);
});

test('a bare name or a wrong secret never collects, even after the right human approved', () => {
  need();
  pair('Bare');
  const ask = reconnect.request('Bare');
  approve(ask);
  assert.equal(reconnect.request('Bare').token, undefined, 'a bare name collects nothing');
  assert.throws(() => reconnect.request('Bare', ask.claim, ''), (e) => e.status === 403 || e.status === 404, 'an empty secret collects nothing');
  assert.throws(() => reconnect.request('Bare', 'rc_wrong', ask.poll_secret), (e) => e.status === 404, 'a wrong claim id collects nothing');
  assert.equal(reconnect.request('Bare', ask.claim, ask.poll_secret).status, 'reconnected');
});

test('squatting: an impostor opens the ask first; the real agent sees status only, and a decline frees the name', () => {
  need();
  pair('Squatted');
  const attacker = reconnect.request('Squatted');           // opened by whoever got there first
  const real = reconnect.request('Squatted');               // the real agent, who lost nothing but its handle
  assert.equal(real.status, 'waiting');
  assert.ok(!real.poll_secret && !real.pairing_code, 'the real agent is never handed the attacker\'s secrets');
  reconnect.answer(sari, attacker.claim, 'decline');        // its human declines the ask nobody made
  const fresh = reconnect.request('Squatted');
  assert.equal(fresh.status, 'asked', 'after a decline the real agent can open its own ask');
  assert.match(fresh.pairing_code, /^\d{6}$/);
});

test('a stranger sees no reconnect ask and cannot answer one', () => {
  need();
  pair('Private');
  const ask = reconnect.request('Private');
  const stranger = { id: 'h_stranger', kind: 'human', name: 'Stranger', created: new Date().toISOString() };
  if (!store.getMember(stranger.id)) store.addMember(stranger);
  assert.equal(reconnect.asksFor(stranger).length, 0, 'not listed');
  assert.throws(() => reconnect.answer(stranger, ask.claim, 'approve', ask.pairing_code), (e) => e.status === 403);
  assert.throws(() => reconnect.answer(stranger, ask.claim, 'decline'), (e) => e.status === 403);
});

// ---- The two checks that are RED on #208 bf6daf897c --------------------------------------------------------------

test('completing a reconnect ends the agent\'s app connections, exactly as rejoin does (the rejoin hook runs once)', () => {
  need();
  const a = pair('Revoker');
  const ended = []; core.setRejoinHook((m) => { ended.push(m.id); });
  const ask = reconnect.request('Revoker');
  approve(ask);
  assert.deepEqual(ended, [], 'nothing is revoked at approval: the old token and connections live until the rightful poll');
  const done = reconnect.request('Revoker', ask.claim, ask.poll_secret);
  assert.equal(done.status, 'reconnected');
  assert.deepEqual(ended, [a.id], 'the collecting poll must end every app connection of this member (agentconnect.revokeAll), as core.rejoinAgent does');
});

test('if ending the connections fails, the reconnect still completes and says so, with the next step', () => {
  need();
  pair('Loud');
  core.setRejoinHook(() => { throw new Error('connection log not writable'); });
  const ask = reconnect.request('Loud');
  approve(ask);
  const done = reconnect.request('Loud', ask.claim, ask.poll_secret);
  assert.equal(done.status, 'reconnected', 'refusing would lock the real agent out while suspect connections stay live');
  assert.equal(typeof done.connections, 'string', 'the answer carries a `connections` note, as rejoin\'s does');
  assert.match(done.connections, /NOT ended/);
  assert.match(done.connections, /revoke-all|steward/i, 'and names the next step');
});

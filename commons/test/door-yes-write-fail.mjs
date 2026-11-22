// Round 34 (Setu, from Ash and Aletheia-6, Review m_mwrvv1rml5201307): #297's one-write Yes needs a failure-injection
// test of its own. door-return-crash.mjs has a steward-path version; this one is the HUMAN path (the agent's confirmed,
// named-by-id human, no steward flag), and it also checks what a failed Yes must NOT do afterwards:
//   - it must not end the app connections or announce anything (those hooks run only after the write succeeds);
//   - a restart straight after the failure (store.init on the same folder) sees the same world as memory did;
//   - after the disk recovers, a second Yes leaves the token on the original only, and the other arrival closed.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as store from '../lib/store.mjs';
import * as operators from '../lib/operators.mjs';

const SEAT_TOKEN = 'tok-wren-returning';
const SEAT_H = store.sha256(SEAT_TOKEN);
const OLD_H = store.sha256('tok-wren-old');
const SQ_H = store.sha256('tok-squatter');

function fixture() {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-yes-fail-'));
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: [
    { id: 'h_pat', kind: 'human', name: 'Pat', created: '2026-10-01T00:00:00Z' },
    // the original named Pat by id and Pat confirmed it BEFORE the seat arrived: Pat holds it, no steward needed
    { id: 'a_orig', kind: 'agent', name: 'Wren', created: '2026-11-01T00:00:00Z', tokenHash: OLD_H, recoveryHash: 'rec-old',
      operator: 'Pat', operatorId: 'h_pat', operatorConfirmed: { by: 'h_pat', name: 'Pat', ts: '2026-11-02T00:00:00Z' } },
    { id: 'a_seat', kind: 'agent', name: 'Wren returning', created: '2026-11-21T00:00:00Z', tokenHash: SEAT_H, recoveryHash: 'rec-seat', returning_to: 'a_orig' },
    { id: 'a_sq', kind: 'agent', name: 'Wren returning 2', created: '2026-11-21T01:00:00Z', tokenHash: SQ_H, returning_to: 'a_orig' },
  ] }));
  store.init(D);
  return { D, mf: path.join(D, 'members.json') };
}
const disk = (mf) => Object.fromEntries(JSON.parse(fs.readFileSync(mf, 'utf8')).members.map((m) => [m.id, m]));

test('a Yes whose members.json write fails changes nothing, calls no hooks, survives a restart, and succeeds on retry', () => {
  const { D, mf } = fixture();
  const human = store.getMember('h_pat');
  assert.ok(operators.heldBefore(store.getMember('a_orig'), human, store.getMember('a_seat')), 'fixture: Pat holds Wren by the human path (no steward)');

  const diskBefore = fs.readFileSync(mf, 'utf8');
  const origBefore = JSON.stringify(store.getMember('a_orig'));
  const seatBefore = JSON.stringify(store.getMember('a_seat'));
  const sqBefore = JSON.stringify(store.getMember('a_sq'));
  let ended = 0; let announced = 0;
  const hooks = { endConnections: () => { ended++; return null; }, announce: () => { announced++; } };

  const realRename = fs.renameSync; let tried = 0;
  fs.renameSync = (a, b) => { if (String(b) === mf && tried++ === 0) throw new Error('EIO: simulated disk failure'); return realRename(a, b); };
  try {
    // (a) it throws
    assert.throws(() => operators.answerReturn(human, 'a_seat', 'yes', hooks), /EIO/);
  } finally { fs.renameSync = realRename; }
  assert.equal(tried, 1, 'the write was attempted, and failed');

  // (b) in memory: the seat token still opens the seat, the old token the original, the other arrival still waiting
  assert.equal(store.memberByToken(SEAT_TOKEN)?.id, 'a_seat', 'the seat token still opens the seat');
  assert.equal(store.memberByToken('tok-wren-old')?.id, 'a_orig', "the original's old token still opens the original");
  assert.equal(store.memberByToken('tok-squatter')?.id, 'a_sq');
  assert.equal(JSON.stringify(store.getMember('a_orig')), origBefore, 'the original is unchanged in memory');
  assert.equal(JSON.stringify(store.getMember('a_seat')), seatBefore, 'the seat is unchanged in memory');
  assert.equal(JSON.stringify(store.getMember('a_sq')), sqBefore, 'the other arrival is unchanged in memory');
  assert.equal(store.getMember('a_sq').returning_to, 'a_orig', 'the other arrival still has returning_to in memory');
  // ... and on disk
  assert.equal(fs.readFileSync(mf, 'utf8'), diskBefore, 'members.json on disk is byte-for-byte unchanged');
  const d = disk(mf);
  assert.equal(d.a_sq.returning_to, 'a_orig', 'the other arrival still has returning_to on disk');
  assert.equal(d.a_seat.returning_to, 'a_orig'); assert.equal(d.a_seat.retired, undefined);
  assert.equal(d.a_orig.tokenHash, OLD_H);
  // nothing downstream ran
  assert.equal(ended, 0, 'app connections were not ended by a Yes that did not happen');
  assert.equal(announced, 0, 'nothing was announced for a Yes that did not happen');
  // a restart right after the failure sees the same world
  store.init(D);
  assert.equal(store.memberByToken(SEAT_TOKEN)?.id, 'a_seat', 'after a restart the seat token still opens the seat');
  assert.equal(store.memberByToken('tok-wren-old')?.id, 'a_orig', 'after a restart the old token still opens the original');
  assert.equal(store.getMember('a_sq').returning_to, 'a_orig');

  // (c) the disk recovers: a second Yes succeeds, and the token ends up on the original only
  const res = operators.answerReturn(store.getMember('h_pat'), 'a_seat', 'yes', hooks);
  assert.equal(res.answer, 'yes');
  assert.equal(ended, 1, 'connections end once, on the Yes that really happened');
  assert.equal(announced, 1);
  assert.equal(store.memberByToken(SEAT_TOKEN)?.id, 'a_orig', 'the seat token now opens the original');
  assert.equal(store.memberByToken('tok-wren-old'), null, "the original's old token no longer works");
  assert.equal(store.getMember('a_seat').tokenHash, null, 'the seat holds no token');
  assert.equal(store.getMember('a_sq').returning_to, null, 'the other arrival is closed');
  const e = disk(mf);
  assert.equal(e.a_orig.tokenHash, SEAT_H); assert.equal(e.a_orig.recoveryHash, 'rec-seat');
  assert.equal(e.a_seat.tokenHash, null); assert.equal(e.a_seat.retired, true);
  assert.equal(e.a_sq.returning_to, null);
  assert.equal([e.a_orig, e.a_seat, e.a_sq].filter((m) => m.tokenHash === SEAT_H).length, 1, 'exactly one member holds the token on disk');
});

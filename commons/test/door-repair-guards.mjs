// Door repair guards, run against main (Round 41, Claude). Moved from teams/review/proposed-tests/door-repair-guards.mjs.
// The proposal was written before main grew the guards: repairSharedCredentials() in store.mjs now checks kind, retired
// and returning_to, and eraseMember() rolls back (round 38). So every case here asserts what main does TODAY.
// Anything red on main stays as test.todo with one line on why; store.mjs and core.mjs are not touched (Tier 1).
// store.mjs keeps module-level state, so every case uses ids and hashes of its own, and boots a fresh temp COMMONS_DATA.
// Run: node --test commons/test/door-repair-guards.mjs commons/test/store-repair-save-fail.mjs commons/test/door-yes-*.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as store from '../lib/store.mjs';

const sha = store.sha256;
const agent = (id, extra = {}) => ({ id, kind: 'agent', name: id, created: '2026-11-01T00:00:00Z', ...extra });

function boot(list) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'repair-guards-'));
  const mf = path.join(D, 'members.json');
  fs.writeFileSync(mf, JSON.stringify({ members: list }));
  const lines = []; const realErr = console.error;
  console.error = (...a) => { lines.push(a.join(' ')); };
  try { store.init(D); } finally { console.error = realErr; }
  return { mf, lines, disk: () => Object.fromEntries(JSON.parse(fs.readFileSync(mf, 'utf8')).members.map((m) => [m.id, m])) };
}
const told = (lines, ids) => lines.filter((l) => l.startsWith('[store] ambiguous credential revoked:') && ids.every((i) => l.includes(i)));

test('1. a pair sharing a hash is NOT repaired when the seat is waiting to return to someone else (B.returning_to = C)', () => {
  const H = sha('g1-shared');
  const b = boot([
    agent('g1_C', { tokenHash: sha('g1-c') }),
    agent('g1_B', { tokenHash: H, loginHash: sha('g1-b-login'), recoveryHash: sha('g1-b-rec'), returning_to: 'g1_C' }),
    agent('g1_A', { tokenHash: H, returned_from: 'g1_B' }),
  ]);
  const B = store.getMember('g1_B');
  assert.ok(!B.retired, 'B is not retired by a link that does not point at it');
  assert.equal(B.returning_to, 'g1_C', 'B is still waiting to return to C');
  assert.equal(B.merged_repair, undefined, 'no repair stamp on B');
  assert.equal(B.recoveryHash, sha('g1-b-rec'), 'B keeps its recovery hash');
  assert.equal(B.tokenHash, null, 'ambiguous: the shared credential is cut from B');
  assert.equal(store.getMember('g1_A').tokenHash, null, 'and from A');
  assert.equal(store.memberByToken('g1-shared'), null, 'the shared credential opens nobody');
  assert.equal(store.memberByToken('g1-c')?.id, 'g1_C', 'C is untouched');
  assert.equal(store.memberByLogin('g1-b-login')?.id, 'g1_B', "B's login link still works");
  assert.equal(told(b.lines, ['g1_A', 'g1_B']).length, 1, 'one log line names both claimants');
  assert.equal(b.disk().g1_B.tokenHash, null, 'the cut is on disk');
});

test('2. a HUMAN account sharing a hash with an agent record is not retired by the repair (kind check)', () => {
  const H = sha('g2-shared');
  const b = boot([
    { id: 'g2_H', kind: 'human', name: 'Hana', created: '2026-11-01T00:00:00Z', tokenHash: H, loginHash: sha('g2-hana-login') },
    agent('g2_X', { tokenHash: H, returned_from: 'g2_H' }),
  ]);
  const h = store.getMember('g2_H');
  assert.ok(!h.retired, 'a human account is never retired by the agent door repair');
  assert.equal(h.merged_into, undefined);
  assert.equal(store.memberByLogin('g2-hana-login')?.id, 'g2_H', 'the human can still sign in');
  assert.ok(!store.getMember('g2_X').retired, 'the agent is not retired either: ambiguous, nobody is');
  assert.equal(store.memberByToken('g2-shared'), null, 'the shared credential opens nobody');
  assert.equal(told(b.lines, ['g2_H', 'g2_X']).length, 1);
});

test('3. a RETIRED member sharing a hash with a live seat: the live seat is not retired, the hash opens nobody', () => {
  const H = sha('g3-shared');
  boot([
    agent('g3_live', { tokenHash: H, recoveryHash: 'rec-live' }),
    agent('g3_old', { tokenHash: H, returned_from: 'g3_live', retired: true }),
  ]);
  assert.ok(!store.getMember('g3_live').retired, 'the live seat is not retired in favour of a retired record');
  assert.equal(store.getMember('g3_live').recoveryHash, 'rec-live');
  assert.equal(store.memberByToken('g3-shared'), null, 'neither the live nor the retired member is what the index points at');
});

test('4. the plain case still works: original keeps the hash, the seat retires, merged_into set (regression guard)', () => {
  const b = boot([
    agent('g4_seat', { tokenHash: sha('g4-shared'), returning_to: 'g4_orig' }),
    agent('g4_orig', { tokenHash: sha('g4-shared'), returned_from: 'g4_seat' }),
  ]);
  const s = store.getMember('g4_seat');
  assert.ok(s.retired); assert.equal(s.merged_into, 'g4_orig'); assert.equal(s.tokenHash, null); assert.equal(s.merged_repair, true);
  assert.equal(store.memberByToken('g4-shared')?.id, 'g4_orig');
  assert.equal(told(b.lines, []).length, 0, 'a proven pair is not an ambiguity');
});

test('5. the seat that the repair retires does not keep a working login link (loginIndex)', () => {
  const b = boot([
    agent('g5_seat', { tokenHash: sha('g5-shared'), loginHash: sha('g5-seat-login'), returning_to: 'g5_orig' }),
    agent('g5_orig', { tokenHash: sha('g5-shared'), loginHash: sha('g5-orig-login'), returned_from: 'g5_seat' }),
  ]);
  assert.equal(store.memberByLogin('g5-orig-login')?.id, 'g5_orig', 'the original login still works');
  assert.equal(store.memberByLogin('g5-seat-login'), null, 'the retired seat\'s login link opens nobody (round 42: memberByLogin refuses a retired seat)');
  assert.equal(b.disk().g5_seat.retired, true);
});

test('6. a duplicate repair run is a no-op: a second init over the repaired file changes nothing and logs nothing', () => {
  const b = boot([
    agent('g6_seat', { tokenHash: sha('g6-shared'), returning_to: 'g6_orig' }),
    agent('g6_orig', { tokenHash: sha('g6-shared'), returned_from: 'g6_seat' }),
  ]);
  const before = fs.readFileSync(b.mf, 'utf8');
  const lines = []; const realErr = console.error; console.error = (...a) => { lines.push(a.join(' ')); };
  try { store.init(path.dirname(b.mf)); } finally { console.error = realErr; }
  assert.equal(fs.readFileSync(b.mf, 'utf8'), before, 'the file is byte for byte the same');
  assert.deepEqual(lines.filter((l) => l.startsWith('[store]')), [], 'no repair line the second time');
  assert.equal(store.memberByToken('g6-shared')?.id, 'g6_orig');
});

test('7. eraseMember: a failed write leaves the member, token and login as they were, and throws; the retry works', () => {
  const mf0 = boot([{ id: 'g7_gone', kind: 'human', name: 'Gone', created: '2026-11-01T00:00:00Z', tokenHash: sha('g7-tok'), loginHash: sha('g7-login') }]).mf;
  const disk = fs.readFileSync(mf0, 'utf8');
  const real = fs.renameSync; let thrown = 0;
  fs.renameSync = (a, b) => { if (String(b) === mf0 && thrown++ === 0) throw new Error('EIO: simulated disk failure'); return real(a, b); };
  try { assert.throws(() => store.eraseMember('g7_gone'), /EIO/); } finally { fs.renameSync = real; }
  assert.equal(thrown, 1);
  assert.equal(fs.readFileSync(mf0, 'utf8'), disk, 'disk unchanged');
  const m = store.getMember('g7_gone');
  assert.ok(!m.deleted && !m.retired, 'memory is not left holding a tombstone the disk does not have');
  assert.equal(store.memberByToken('g7-tok')?.id, 'g7_gone', 'old token still known');
  assert.equal(store.memberByLogin('g7-login')?.id, 'g7_gone', 'old login still known');
  store.eraseMember('g7_gone');
  assert.ok(store.getMember('g7_gone').deleted, 'the retry erases');
  assert.equal(store.memberByToken('g7-tok'), null);
  assert.equal(store.memberByLogin('g7-login'), null);
});

// Door repair guards + account-deletion write failure: synthetic cases for the gaps read in store.mjs (blob 7a3a1cf6,
// main HEAD 36c36448): the load repair in init() has no returning_to / kind / "m not retired" check, and eraseMember()
// has no rollback. Claude, review, 2026-11-22. Built from synthetic members.json fixtures; nothing here touches a real file.
// PROPOSED PLACEMENT: commons/test/door-repair-guards.mjs (imports ../lib/store.mjs; this team copy imports it from
// COMMONS_DIR if set). Run: from the repo root, `node --test commons/test/door-repair-guards.mjs`.
//
// Status on main: the tests marked `todo` assert the behaviour we WANT and fail today (that is the evidence). node:test
// reports a failing todo test as "todo", not as a failure, so CI stays green; when a guard lands, remove its `todo`.
// What happens to the shared token of an AMBIGUOUS pair (skip-and-log vs quarantine) is Setu's and Geoffrey's choice and
// is deliberately not asserted here: both options keep B unretired with its own record, which is all test 1 asserts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const store = await import(process.env.COMMONS_DIR ? path.join(process.env.COMMONS_DIR, 'lib/store.mjs') : '../lib/store.mjs');

const H = store.sha256('shared-token');
function boot(list) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'repair-guards-'));
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: list }));
  store.init(D);
  return path.join(D, 'members.json');
}
const agent = (id, extra = {}) => ({ id, kind: 'agent', name: id, created: '2026-11-01T00:00:00Z', ...extra });

test('repair: a pair that shares a hash is NOT repaired when the seat is waiting to return to someone else (B.returning_to = C)',
  { todo: 'repair has no returning_to check (store.mjs init, ~line 66)' }, () => {
  boot([
    agent('a_C', { tokenHash: store.sha256('c-token') }),
    agent('a_B', { tokenHash: H, loginHash: store.sha256('b-login'), recoveryHash: store.sha256('b-rec'), returning_to: 'a_C' }),
    agent('a_A', { tokenHash: H, returned_from: 'a_B' }),
  ]);
  const B = store.getMember('a_B');
  assert.ok(!B.retired, 'B keeps its own record: it is not retired by a link that does not point at it');
  assert.equal(B.returning_to, 'a_C', 'B is still waiting to return to C');
  assert.equal(B.merged_repair, undefined, 'no repair stamp on B');
  assert.ok(B.recoveryHash, 'B keeps its recovery hash');
});

test('repair: a HUMAN account that shares a hash with an agent record is not retired by the repair (kind check)',
  { todo: 'repair has no kind check; it also leaves loginHash in loginIndex on the retired seat' }, () => {
  boot([
    { id: 'u_H', kind: 'human', name: 'Hana', created: '2026-11-01T00:00:00Z', tokenHash: H, loginHash: store.sha256('hana-login') },
    agent('a_X', { tokenHash: H, returned_from: 'u_H' }),
  ]);
  const h = store.getMember('u_H');
  assert.ok(!h.retired, 'a human account is never retired by the agent door repair');
  assert.equal(store.memberByLogin('hana-login')?.id, 'u_H', 'the human can still sign in');
});

test('repair: a RETIRED member does not take the token from a live seat (m not retired)',
  { todo: 'repair does not check m.retired; my inference of the wanted behaviour, not a decision' }, () => {
  boot([
    agent('a_live', { tokenHash: H }),
    agent('a_old', { tokenHash: H, returned_from: 'a_live', retired: true }),
  ]);
  assert.ok(!store.getMember('a_live').retired, 'the live seat is not retired in favour of a retired record');
  // Not asserted: which member the shared token opens. indexMember() does not skip retired members, so the last one
  // loaded wins the index (a_old here). That is a separate gap (see review file); a repair guard alone does not close it.
});

test('repair: the plain case still works (original keeps the hash, the seat is retired, merged_into set) - regression guard', () => {
  boot([
    agent('a_seat', { tokenHash: H, returning_to: 'a_orig' }),
    agent('a_orig', { tokenHash: H, returned_from: 'a_seat' }),
  ]);
  const s = store.getMember('a_seat');
  assert.ok(s.retired); assert.equal(s.merged_into, 'a_orig'); assert.equal(s.tokenHash, null);
  assert.equal(store.memberByToken('shared-token')?.id, 'a_orig');
});

test('eraseMember: a failed write must leave the member, token and login as they were, and throw (today: memory keeps the tombstone)',
  { todo: 'eraseMember has no rollback (store.mjs ~line 211); sits behind mydata.deleteAccount, see review file' }, () => {
  const mf = boot([{ id: 'u_gone', kind: 'human', name: 'Gone', created: '2026-11-01T00:00:00Z', tokenHash: store.sha256('gone-tok'), loginHash: store.sha256('gone-login') }]);
  const disk = fs.readFileSync(mf, 'utf8');
  const real = fs.renameSync; let thrown = 0;
  fs.renameSync = (a, b) => { if (String(b) === mf && thrown++ === 0) throw new Error('EIO: simulated disk failure'); return real(a, b); };
  try { assert.throws(() => store.eraseMember('u_gone'), /EIO/); } finally { fs.renameSync = real; }
  assert.equal(thrown, 1);
  assert.equal(fs.readFileSync(mf, 'utf8'), disk, 'disk unchanged (this part holds today)');
  const m = store.getMember('u_gone');
  assert.ok(!m.deleted && !m.retired, 'memory is not left holding a tombstone the disk does not have');
  assert.equal(store.memberByToken('gone-tok')?.id, 'u_gone', 'old token still known');
  assert.equal(store.memberByLogin('gone-login')?.id, 'u_gone', 'old login still known');
  // and the retry works
  store.eraseMember('u_gone'); assert.ok(store.getMember('u_gone').deleted);
});

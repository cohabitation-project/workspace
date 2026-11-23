// A revoked credential must stop opening the door at once (Aletheia-6, Review m_mws9bnlwe04e2a59; Claude, round 37).
// Before: updateMember/updateMembers dropped the old tokenIndex/loginIndex entry only when the patch carried a NEW
// truthy hash, so { tokenHash: null } cleared the record but memberByToken still opened the member until restart.
// store.mjs keeps module-level state, so every case uses its own ids and hashes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as store from '../lib/store.mjs';

const sha = store.sha256;
function boot(list) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'store-revoke-'));
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: list }));
  store.init(D);
  return path.join(D, 'members.json');
}
const agent = (id, tok, login) => ({ id, kind: 'agent', name: id, created: '2026-11-01T00:00:00Z', tokenHash: sha(tok), loginHash: sha(login) });
function failOnce(mf, fn) {
  const real = fs.renameSync; let thrown = 0;
  fs.renameSync = (a, b) => { if (String(b) === mf && thrown++ === 0) throw new Error('EIO: simulated disk failure'); return real(a, b); };
  try { assert.throws(fn, /EIO/); } finally { fs.renameSync = real; }
  assert.equal(thrown, 1, 'the write was attempted and failed');
}

test('1 updateMember { tokenHash: null }: the old token opens nobody at once; the login still works', () => {
  boot([agent('a_r1', 'r1-tok', 'r1-login')]);
  assert.equal(store.memberByToken('r1-tok')?.id, 'a_r1', 'before: the token opens the member');
  store.updateMember('a_r1', { tokenHash: null });
  assert.equal(store.memberByToken('r1-tok'), null, 'the revoked token opens nobody');
  assert.equal(store.memberByLogin('r1-login')?.id, 'a_r1', 'the other credential is untouched');
  assert.equal(store.getMember('a_r1').tokenHash, null);
});

test('2 updateMember { loginHash: null }: memberByLogin opens nobody at once; the token still works', () => {
  boot([agent('a_r2', 'r2-tok', 'r2-login')]);
  assert.equal(store.memberByLogin('r2-login')?.id, 'a_r2');
  store.updateMember('a_r2', { loginHash: null });
  assert.equal(store.memberByLogin('r2-login'), null, 'the revoked login opens nobody');
  assert.equal(store.memberByToken('r2-tok')?.id, 'a_r2');
});

test('3 updateMembers (one write): a null token or login hash revokes at once, for each member in the list', () => {
  const mf = boot([agent('a_r3a', 'r3a-tok', 'r3a-login'), agent('a_r3b', 'r3b-tok', 'r3b-login')]);
  store.updateMembers([['a_r3a', { tokenHash: null }], ['a_r3b', { loginHash: null }]]);
  assert.equal(store.memberByToken('r3a-tok'), null);
  assert.equal(store.memberByLogin('r3a-login')?.id, 'a_r3a');
  assert.equal(store.memberByLogin('r3b-login'), null);
  assert.equal(store.memberByToken('r3b-tok')?.id, 'a_r3b');
  const disk = JSON.parse(fs.readFileSync(mf, 'utf8')).members;
  assert.equal(disk.find((x) => x.id === 'a_r3a').tokenHash, null, 'and the disk agrees');
});

test('4 a rotation still works: the old hash opens nobody, the new one opens the member (both functions)', () => {
  boot([agent('a_r4a', 'r4a-tok', 'r4a-login'), agent('a_r4b', 'r4b-tok', 'r4b-login')]);
  store.updateMember('a_r4a', { tokenHash: sha('r4a-new'), loginHash: sha('r4a-login-new') });
  assert.equal(store.memberByToken('r4a-tok'), null);
  assert.equal(store.memberByToken('r4a-new')?.id, 'a_r4a');
  assert.equal(store.memberByLogin('r4a-login'), null);
  assert.equal(store.memberByLogin('r4a-login-new')?.id, 'a_r4a');
  store.updateMembers([['a_r4b', { tokenHash: sha('r4b-new') }]]);
  assert.equal(store.memberByToken('r4b-tok'), null);
  assert.equal(store.memberByToken('r4b-new')?.id, 'a_r4b');
});

test('5 a failed save rolls a revoke back: the old token and login still open the member, the record is unchanged', () => {
  const mf = boot([agent('a_r5a', 'r5a-tok', 'r5a-login'), agent('a_r5b', 'r5b-tok', 'r5b-login')]);
  const disk = fs.readFileSync(mf, 'utf8');
  const ref = store.getMember('a_r5a'); const before = JSON.stringify(ref);
  failOnce(mf, () => store.updateMember('a_r5a', { tokenHash: null, loginHash: null }));
  assert.equal(store.memberByToken('r5a-tok')?.id, 'a_r5a');
  assert.equal(store.memberByLogin('r5a-login')?.id, 'a_r5a');
  assert.equal(JSON.stringify(ref), before);
  assert.equal(fs.readFileSync(mf, 'utf8'), disk);
  failOnce(mf, () => store.updateMembers([['a_r5b', { tokenHash: null }]]));
  assert.equal(store.memberByToken('r5b-tok')?.id, 'a_r5b', 'updateMembers rolls back too');
  // the retry after the disk recovers revokes
  store.updateMember('a_r5a', { tokenHash: null });
  assert.equal(store.memberByToken('r5a-tok'), null);
});

test('6 nulling the hash of a member the index does not point at leaves the holder\'s entry intact', () => {
  // a_r6b took over the hash a_r6a still carries (a rotation to a shared value): the index points at a_r6b
  boot([agent('a_r6a', 'r6-shared', 'r6a-login'), agent('a_r6b', 'r6b-tok', 'r6b-login')]);
  store.updateMember('a_r6b', { tokenHash: sha('r6-shared') });
  assert.equal(store.memberByToken('r6-shared')?.id, 'a_r6b', 'setup: the index points at the later holder');
  store.updateMember('a_r6a', { tokenHash: null });
  assert.equal(store.memberByToken('r6-shared')?.id, 'a_r6b', 'revoking a_r6a does not take a_r6b\'s entry away');
  store.updateMembers([['a_r6a', { tokenHash: null }]]);
  assert.equal(store.memberByToken('r6-shared')?.id, 'a_r6b', 'same through updateMembers');
});

test('7 the lookups trust the stored hash, not only the index: a member whose hash no longer matches is not returned', () => {
  boot([agent('a_r7', 'r7-tok', 'r7-login')]);
  const m = store.getMember('a_r7');
  m.tokenHash = null; m.loginHash = sha('something-else');       // a record changed behind the index's back
  assert.equal(store.memberByToken('r7-tok'), null);
  assert.equal(store.memberByLogin('r7-login'), null);
  assert.equal(store.memberByToken(''), null);
  assert.equal(store.memberByToken(undefined), null);
});

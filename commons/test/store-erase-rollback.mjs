// eraseMember rolls back when the members.json write throws (Claude, review seat, 2026-11-23; same shape as
// store-write-rollback.mjs for updateMember/addMember). Before: memory held the tombstone and had lost the token and
// login index entries while the disk kept the original, so the live process and the file disagreed; a retry then
// answered "already closed" and a restart brought the account back after its content was erased.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as store from '../lib/store.mjs';

function boot() {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'store-erase-'));
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: [
    { id: 'h_one', kind: 'human', name: 'Hana', created: '2026-11-01T00:00:00Z', tokenHash: store.sha256('tok-one'), loginHash: store.sha256('login-one'), sessionVersion: 2 },
    { id: 'h_two', kind: 'human', name: 'Ivo', created: '2026-11-01T00:00:00Z', tokenHash: store.sha256('tok-two'), loginHash: store.sha256('login-two') },
  ] }));
  store.init(D);
  return path.join(D, 'members.json');
}
function failOnce(mf, fn) {
  const real = fs.renameSync; let thrown = 0;
  fs.renameSync = (a, b) => { if (String(b) === mf && thrown++ === 0) throw new Error('EIO: simulated disk failure'); return real(a, b); };
  try { assert.throws(fn, /EIO/); } finally { fs.renameSync = real; }
  assert.equal(thrown, 1, 'the write was attempted and failed');
}

test('eraseMember: a failed write leaves the member whole in memory, token and login still working, disk unchanged', () => {
  const mf = boot();
  const diskBefore = fs.readFileSync(mf, 'utf8');
  const ref = store.getMember('h_one'); const before = JSON.stringify(ref);
  failOnce(mf, () => store.eraseMember('h_one'));
  assert.equal(store.getMember('h_one'), ref, 'same object back in place');
  assert.equal(JSON.stringify(ref), before, 'the member is unchanged');
  assert.equal(store.getMember('h_one').deleted, undefined, 'no tombstone in memory');
  assert.equal(store.memberByToken('tok-one')?.id, 'h_one', 'token still opens the member');
  assert.equal(store.memberByLogin('login-one')?.id, 'h_one', 'login still opens the member');
  assert.equal(fs.readFileSync(mf, 'utf8'), diskBefore, 'disk unchanged');
  assert.equal(store.memberByToken('tok-two')?.id, 'h_two', 'the other member is untouched');
});

test('eraseMember: after a failed write the retry succeeds and fully closes the account', () => {
  const mf = boot();
  failOnce(mf, () => store.eraseMember('h_one'));
  const t = store.eraseMember('h_one');
  assert.equal(t.deleted, true);
  assert.equal(t.name, 'Deleted member');
  assert.equal(store.memberByToken('tok-one'), null);
  assert.equal(store.memberByLogin('login-one'), null);
  const disk = JSON.parse(fs.readFileSync(mf, 'utf8')).members.find((x) => x.id === 'h_one');
  assert.equal(disk.deleted, true, 'the tombstone is on disk');
  assert.equal(disk.tokenHash, undefined);
  assert.equal(disk.sessionVersion, 3, 'sessions are cut');
});

test('eraseMember: the success path is unchanged (tombstone, indexes gone, other members untouched)', () => {
  boot();
  const t = store.eraseMember('h_one');
  assert.equal(t.retired, true); assert.equal(t.deleted, true);
  assert.equal(store.memberByToken('tok-one'), null);
  assert.equal(store.memberByToken('tok-two')?.id, 'h_two');
  assert.equal(store.eraseMember('nobody'), null);
});

test('eraseMember: does not remove an index entry that points at a DIFFERENT member', () => {
  // boot repair revokes ambiguous shared hashes, so build the state at run time: h_one holds a hash, then h_two is
  // given the same hash (the index moves to h_two). Erasing h_one, who is no longer the index owner, must not
  // remove h_two's entry.
  boot();
  store.updateMember('h_one', { tokenHash: store.sha256('shared-tok') });
  store.updateMember('h_two', { tokenHash: store.sha256('shared-tok') });
  assert.equal(store.memberByToken('shared-tok')?.id, 'h_two', 'precondition: the index points at h_two');
  store.eraseMember('h_one');
  assert.equal(store.memberByToken('shared-tok')?.id, 'h_two', 'erasing the non-owner leaves the owner able to sign in');
});

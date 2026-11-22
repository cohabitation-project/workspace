// updateMember and addMember roll back when the members.json write throws (Claude, round 33; same shape as
// updateMembers, test in door-return-crash.mjs). Before: memory kept the new token / the new member, the disk did not.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as store from '../lib/store.mjs';

function boot() {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'store-rollback-'));
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: [
    { id: 'a_one', kind: 'agent', name: 'One', created: '2026-11-01T00:00:00Z', tokenHash: store.sha256('old'), loginHash: store.sha256('login-old') },
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

test('updateMember: a failed write leaves the old token and login working, the new ones unknown, the member unchanged', () => {
  const mf = boot();
  const diskBefore = fs.readFileSync(mf, 'utf8');
  const ref = store.getMember('a_one'); const before = JSON.stringify(ref);
  failOnce(mf, () => store.updateMember('a_one', { tokenHash: store.sha256('new'), loginHash: store.sha256('login-new'), name: 'Renamed' }));
  assert.equal(store.memberByToken('old')?.id, 'a_one', 'the old token still opens the member');
  assert.equal(store.memberByToken('new'), null, 'the new token is not known');
  assert.equal(store.getMember('a_one'), ref, 'same object, restored in place');
  assert.equal(JSON.stringify(ref), before, 'the member is unchanged');
  assert.equal(fs.readFileSync(mf, 'utf8'), diskBefore, 'disk unchanged');
  // and the retry after the disk recovers works
  store.updateMember('a_one', { tokenHash: store.sha256('new') });
  assert.equal(store.memberByToken('new')?.id, 'a_one');
  assert.equal(store.memberByToken('old'), null);
});

test('addMember: a failed write leaves the id and its token unknown; a retry works', () => {
  const mf = boot();
  const m = { id: 'a_two', kind: 'agent', name: 'Two', created: '2026-11-22T00:00:00Z', tokenHash: store.sha256('tok2'), loginHash: store.sha256('login2') };
  failOnce(mf, () => store.addMember(m));
  assert.equal(store.getMember('a_two'), null, 'the id is unknown');
  assert.equal(store.memberByToken('tok2'), null, 'its token is unknown');
  assert.equal(store.memberByToken('old')?.id, 'a_one', 'the existing member is untouched');
  assert.ok(!JSON.parse(fs.readFileSync(mf, 'utf8')).members.some((x) => x.id === 'a_two'));
  store.addMember(m);
  assert.equal(store.memberByToken('tok2')?.id, 'a_two');
});

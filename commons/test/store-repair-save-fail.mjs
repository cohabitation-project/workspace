// A boot repair whose members.json write fails must still be safe on the next boot.
// The first init keeps the revocation in memory but cannot persist it; init again with writes working must repeat
// the repair from the old on-disk credentials, leave the shared token unable to open either claimant, retire nobody,
// and finally save both null token hashes. Test only: store.mjs is deliberately unchanged.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as store from '../lib/store.mjs';

const rawToken = 'round39-shared-token';
const tokenHash = store.sha256(rawToken);
const claimant = (id) => ({
  id,
  kind: 'agent',
  name: id,
  created: '2026-11-01T00:00:00Z',
  tokenHash,
  recoveryHash: `recovery-${id}`,
});

function failNextMemberSave(membersFile) {
  const realRename = fs.renameSync;
  let attempts = 0;
  fs.renameSync = (from, to) => {
    if (String(to) === membersFile && attempts++ === 0) {
      throw new Error('EIO: simulated boot repair write failure');
    }
    return realRename(from, to);
  };
  return () => {
    fs.renameSync = realRename;
    return attempts;
  };
}

function diskMembers(membersFile) {
  return Object.fromEntries(
    JSON.parse(fs.readFileSync(membersFile, 'utf8')).members.map((member) => [member.id, member]),
  );
}

test('failed boot-repair save: memory is safe, and the next boot revokes and persists without retiring anyone', () => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'store-repair-save-fail-'));
  const membersFile = path.join(dataDir, 'members.json');
  const ids = ['round39 claimant A', 'round39 claimant B'];
  fs.writeFileSync(membersFile, JSON.stringify({ members: ids.map(claimant) }));

  const errors = [];
  const realError = console.error;
  console.error = (...args) => errors.push(args.join(' '));
  const restoreRename = failNextMemberSave(membersFile);
  let attempts;
  try {
    assert.doesNotThrow(() => store.init(dataDir), 'a failed repair save must not prevent boot');
  } finally {
    attempts = restoreRename();
    console.error = realError;
  }

  assert.equal(attempts, 1, 'the repair write was attempted and failed');
  assert.equal(store.memberByToken(rawToken), null, 'the shared token opens nobody in memory');
  for (const id of ids) {
    const member = store.getMember(id);
    assert.equal(member.tokenHash, null, `${id}: revoked in memory`);
    assert.equal(member.retired, undefined, `${id}: not retired by the failed boot`);
    assert.equal(member.recoveryHash, `recovery-${id}`, `${id}: recovery is untouched`);
  }
  let onDisk = diskMembers(membersFile);
  for (const id of ids) assert.equal(onDisk[id].tokenHash, tokenHash, `${id}: old disk survives the failed write`);
  assert.ok(errors.some((line) => /boot repair not saved/i.test(line)), 'the failed save is reported');

  // This is the store tests' restart model: init reads the still-unrepaired file again, now with writes working.
  assert.doesNotThrow(() => store.init(dataDir), 'the next boot completes');
  assert.equal(store.memberByToken(rawToken), null, 'the shared token still opens nobody after restart');
  onDisk = diskMembers(membersFile);
  for (const id of ids) {
    const member = store.getMember(id);
    assert.equal(member.tokenHash, null, `${id}: still revoked in memory after restart`);
    assert.equal(member.retired, undefined, `${id}: restart did not retire the claimant`);
    assert.equal(member.recoveryHash, `recovery-${id}`, `${id}: restart preserved recovery`);
    assert.equal(onDisk[id].tokenHash, null, `${id}: the next boot persisted the revocation`);
    assert.equal(onDisk[id].retired, undefined, `${id}: disk contains no retirement`);
  }
});

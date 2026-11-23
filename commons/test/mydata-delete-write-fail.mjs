// deleteAccount when the members.json write fails (Claude, build seat, round 39, 2026-11-23).
// store.eraseMember now rolls back and throws if its write fails (d61759c9). Before this test, that throw left
// deleteAccount as a raw 500 (server.mjs:987 shows e.message with e.status||500) and skipped the deletions.jsonl
// record. The member must get a plain 503 "still open, try again", must still be able to sign in, and no deletion
// may be recorded as done. Retrying once the disk works must finish the job and write exactly one record.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'mydata-wf-'));
process.env.COMMONS_DATA = D;
const store = await import('../lib/store.mjs');
const mydata = await import('../lib/mydata.mjs');
const MF = path.join(D, 'members.json');
const REC = path.join(D, 'privacy', 'deletions.jsonl');

fs.writeFileSync(MF, JSON.stringify({ members: [
  { id: 'h_hana', kind: 'human', name: 'Hana Test', created: '2026-11-01T00:00:00Z', tokenHash: store.sha256('tok-hana'), loginHash: store.sha256('login-hana'), sessionVersion: 1 },
  { id: 'h_ivo', kind: 'human', name: 'Ivo Test', created: '2026-11-01T00:00:00Z', tokenHash: store.sha256('tok-ivo'), loginHash: store.sha256('login-ivo') },
] }));
store.init(D);

/** Every rename onto members.json fails while `fn` runs (other content stores may touch the member file first). */
function diskDown(fn) {
  const real = fs.renameSync; let hits = 0;
  fs.renameSync = (a, b) => { if (String(b) === MF) { hits++; throw new Error('EIO: simulated disk failure'); } return real(a, b); };
  try { return fn(); } finally { fs.renameSync = real; assert.ok(hits >= 1, 'the members.json write was attempted and failed'); }
}

test('deleteAccount with a failing erase write: 503, plain message, member still signs in, no deletions.jsonl line', () => {
  const me = store.getMember('h_hana');
  let err;
  diskDown(() => { try { mydata.deleteAccount(me, { confirm: 'hana test' }); } catch (e) { err = e; } });
  assert.ok(err, 'deleteAccount threw');
  assert.equal(err.status, 503, `status 503, got ${err.status}: ${err.message}`);
  assert.equal(err.constructor.name, 'CommonsError', 'a CommonsError, like the rest of the site');
  assert.match(err.message, /still (open|sign in)/i, 'says the account is still open');
  assert.match(err.message, /try again/i, 'says to try again');
  assert.doesNotMatch(err.message, /EIO|simulated|ENOENT|rename|errno/i, 'no raw system text');
  assert.equal(store.memberByToken('tok-hana')?.id, 'h_hana', 'the token still resolves');
  assert.equal(store.memberByLogin('login-hana')?.id, 'h_hana', 'the login still resolves');
  assert.equal(store.getMember('h_hana').deleted, undefined, 'no tombstone in memory');
  assert.equal(fs.existsSync(REC), false, 'no deletions.jsonl line was written');
});

test('the same errors as before are unchanged: wrong name is 400, an unknown account is 410', () => {
  const me = store.getMember('h_ivo');
  assert.throws(() => mydata.deleteAccount(me, { confirm: 'someone else' }), (e) => e.status === 400);
  assert.throws(() => mydata.deleteAccount({ id: 'h_nobody' }, { confirm: 'x' }), (e) => e.status === 410);
  assert.equal(fs.existsSync(REC), false);
});

test('retry once the disk works finishes the deletion and writes exactly one record', () => {
  const me = store.getMember('h_hana');
  const out = mydata.deleteAccount(me, { confirm: 'Hana Test' });
  assert.equal(out.deleted, true);
  assert.equal(store.memberByToken('tok-hana'), null, 'signed out for good');
  const lines = fs.readFileSync(REC, 'utf8').split('\n').filter(Boolean);
  assert.equal(lines.length, 1, 'one record');
  assert.equal(JSON.parse(lines[0]).id, 'h_hana');
  assert.equal(store.memberByToken('tok-ivo')?.id, 'h_ivo', 'the other member is untouched');
});

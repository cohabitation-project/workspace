// Review (Claude, 2026-11-22): a Yes on a seat whose credential the boot repair revoked.
// Setu's decision B nulls tokenHash on every claimant of an ambiguous shared hash and retires nobody. A revoked seat
// keeps returning_to, so it still shows on /my-agents. answerReturn copies seat.tokenHash (null) onto the original.
// Wanted: the Yes is refused (409), the original keeps its credentials, and the seat is not offered.
// Place as commons/test/door-yes-revoked-seat.mjs together with the operators.mjs patch in
// teams/review/door-yes-revoked-seat-2026-11-22.md. Without the patch 3 of 4 fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as store from '../lib/store.mjs';
import * as operators from '../lib/operators.mjs';

const H = store.sha256('tok-shared');
function fixture() {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-revoked-seat-'));
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: [
    { id: 'h_pat', kind: 'human', name: 'Pat', created: '2026-10-01T00:00:00Z' },
    { id: 'a_orig', kind: 'agent', name: 'Wren', created: '2026-11-01T00:00:00Z', tokenHash: H, recoveryHash: 'rec-old',
      operator: 'Pat', operatorId: 'h_pat', operatorConfirmed: { by: 'h_pat', name: 'Pat', ts: '2026-11-02T00:00:00Z' } },
    { id: 'a_seat', kind: 'agent', name: 'Wren returning', created: '2026-11-21T00:00:00Z', tokenHash: H, recoveryHash: 'rec-seat', returning_to: 'a_orig' },
    { id: 'a_third', kind: 'agent', name: 'Other', created: '2026-11-21T02:00:00Z', tokenHash: H },   // third claimant: the group is ambiguous
  ] }));
  store.init(D);
  return { D };
}

test('boot repair revoked the seat (fixture check)', () => {
  fixture();
  assert.equal(store.getMember('a_seat').tokenHash, null);
  assert.equal(store.getMember('a_orig').tokenHash, null);
  assert.equal(store.getMember('a_seat').retired, undefined, 'decision B retires nobody');
  assert.equal(store.getMember('a_seat').returning_to, 'a_orig', 'the revoked seat keeps returning_to');
});

test('a Yes on a revoked seat is refused and changes nothing', () => {
  fixture();
  const pat = store.getMember('h_pat');
  const before = JSON.stringify([store.getMember('a_orig'), store.getMember('a_seat')]);
  let hooks = 0;
  assert.throws(
    () => operators.answerReturn(pat, 'a_seat', 'yes', { steward: true, endConnections: () => { hooks++; return null; }, announce: () => { hooks++; } }),
    (e) => e.status === 409 || e.code === 409 || /409|no credential|nothing to hand/i.test(String(e.status) + e.message),
  );
  assert.equal(JSON.stringify([store.getMember('a_orig'), store.getMember('a_seat')]), before, 'no record changed');
  assert.equal(hooks, 0, 'no connections ended, nothing announced');
});

test('a revoked seat is not offered on /my-agents', () => {
  fixture();
  const pat = store.getMember('h_pat');
  assert.equal(operators.returnsFor(pat, { steward: true }).length, 0, 'a seat with no credential has nothing to hand back');
});

test('the original keeps its OWN working token when only the seat was revoked, and a Yes on that seat is refused', () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-revoked-seat2-'));
  const OH = store.sha256('tok-wren-own');
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: [
    { id: 'h_pat', kind: 'human', name: 'Pat', created: '2026-10-01T00:00:00Z' },
    { id: 'a_orig', kind: 'agent', name: 'Wren', created: '2026-11-01T00:00:00Z', tokenHash: OH, recoveryHash: 'rec-old',
      operator: 'Pat', operatorId: 'h_pat', operatorConfirmed: { by: 'h_pat', name: 'Pat', ts: '2026-11-02T00:00:00Z' } },
    { id: 'a_seat', kind: 'agent', name: 'Wren returning', created: '2026-11-21T00:00:00Z', tokenHash: H, recoveryHash: 'rec-seat', returning_to: 'a_orig' },
    { id: 'a_third', kind: 'agent', name: 'Other', created: '2026-11-21T02:00:00Z', tokenHash: H },   // seat shares its hash with an unrelated agent
  ] }));
  store.init(D);
  assert.equal(store.getMember('a_seat').tokenHash, null, 'fixture: the seat was revoked');
  assert.equal(store.memberByToken('tok-wren-own')?.id, 'a_orig', 'fixture: the original still has its own token');
  const pat = store.getMember('h_pat');
  try { operators.answerReturn(pat, 'a_seat', 'yes', {}); } catch { /* refusing is the right answer */ }
  assert.equal(store.memberByToken('tok-wren-own')?.id, 'a_orig', "a Yes on a credential-less seat must not erase the original's token");
  assert.equal(store.getMember('a_orig').recoveryHash, 'rec-old', "nor swap in the seat's recovery hash");
});

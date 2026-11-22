// Door startup recovery must not retire a record on one-sided or contradictory evidence.
// Source: Aletheia-6, Review c_mws2e31h0lce27b1 (store.mjs init() "Door crash window" repair). Cases 1-6 of her spec.
//
// The repair in store.init() retires a returning seat when an original says `returned_from: seat` and both hold one
// tokenHash. It never checked seat.returning_to === original.id, the kinds, a deleted original, or a second
// original naming the same seat. Policy tested here (fail closed, order independent):
//   - the repair runs only for ONE claimant whose seat names it back (reciprocal), both kind 'agent', neither
//     retired or deleted; anything else is left untouched on disk and recorded in store.integrityIssues();
//   - a tokenHash held by more than one live record opens nobody (a human re-joins through the door);
//   - a tokenHash held by exactly one live record opens that record, whatever the file order.
// store.mjs keeps module-level state, so each fixture loads in its own node process.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const STORE = pathToFileURL(path.resolve('commons/lib/store.mjs')).href;
const TOK = 'tok-shared-door';

const PROBE = `
import fs from 'node:fs'; import path from 'node:path';
const store = await import(${JSON.stringify(STORE)});
const D = process.argv[1]; const tok = process.argv[2];
store.init(D);
const mf = path.join(D, 'members.json');
const members = Object.fromEntries(store.allMembers().map((m) => [m.id, { retired: !!m.retired, merged_into: m.merged_into || null, returning_to: m.returning_to || null, hash: !!m.tokenHash }]));
console.log(JSON.stringify({ opens: store.memberByToken(tok)?.id ?? null, members,
  issues: typeof store.integrityIssues === 'function' ? store.integrityIssues() : 'NO integrityIssues()',
  disk: fs.readFileSync(mf, 'utf8') }));
`;

function load(list, { reverse = false } = {}) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-recip-'));
  const members = reverse ? [...list].reverse() : list;
  const before = JSON.stringify({ members });
  fs.writeFileSync(path.join(D, 'members.json'), before);
  const r = spawnSync(process.execPath, ['--input-type=module', '-e', PROBE, D, TOK], { encoding: 'utf8' });
  assert.equal(r.status, 0, `probe crashed: ${r.stderr}`);
  const out = JSON.parse(r.stdout.trim().split('\n').pop());
  return { ...out, before };
}
const H = () => crypto_sha(TOK);
import crypto from 'node:crypto';
function crypto_sha(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
const agent = (id, extra = {}) => ({ id, kind: 'agent', name: id, created: '2026-11-01T00:00:00Z', ...extra });
const both = (fn) => { for (const reverse of [false, true]) fn(reverse, reverse ? 'reversed file order' : 'file order'); };

test('1 positive control: a reciprocal pair resolves to the original and retires the seat, in either file order', () => {
  both((reverse, label) => {
    const r = load([agent('a_A', { returned_from: 'a_B', tokenHash: H() }), agent('a_B', { returning_to: 'a_A', tokenHash: H() })], { reverse });
    assert.equal(r.opens, 'a_A', label);
    assert.equal(r.members.a_B.retired, true, label);
    assert.equal(r.members.a_B.merged_into, 'a_A', label);
    assert.equal(r.members.a_A.retired, false, label);
  });
});

test('2 mismatched pair: the seat says it is returning to C, so A/B is not retired and the shared token opens nobody', () => {
  both((reverse, label) => {
    const r = load([
      agent('a_A', { returned_from: 'a_B', tokenHash: H() }),
      agent('a_B', { returning_to: 'a_C', tokenHash: H() }),
      agent('a_C'),
    ], { reverse });
    assert.equal(r.members.a_B.retired, false, `${label}: B must not be retired on contradictory metadata`);
    assert.equal(r.members.a_B.returning_to, 'a_C', `${label}: B's own claim is untouched`);
    assert.equal(r.opens, null, `${label}: a token two live records hold opens neither`);
    assert.equal(r.disk, r.before, `${label}: nothing rewritten on disk`);
    assert.ok(Array.isArray(r.issues) && r.issues.length >= 1, `${label}: an integrity issue is recorded (${JSON.stringify(r.issues)})`);
  });
});

test('3 wrong kind: a human seat, or a human original, sharing the hash is never auto-retired as an agent return seat', () => {
  both((reverse, label) => {
    const seatHuman = load([agent('a_A', { returned_from: 'h_B', tokenHash: H() }), { id: 'h_B', kind: 'human', name: 'B', created: '2026-11-01T00:00:00Z', returning_to: 'a_A', tokenHash: H() }], { reverse });
    assert.equal(seatHuman.members.h_B.retired, false, `${label}: human seat kept`);
    assert.equal(seatHuman.disk, seatHuman.before, `${label}: disk unchanged (human seat)`);
    const origHuman = load([{ id: 'h_A', kind: 'human', name: 'A', created: '2026-11-01T00:00:00Z', returned_from: 'a_B', tokenHash: H() }, agent('a_B', { returning_to: 'h_A', tokenHash: H() })], { reverse });
    assert.equal(origHuman.members.a_B.retired, false, `${label}: agent seat kept when the claimant is a human`);
    assert.equal(origHuman.disk, origHuman.before, `${label}: disk unchanged (human original)`);
  });
});

test('4 deleted original: no resurrection, and the credential is not handed to the tombstone', () => {
  both((reverse, label) => {
    const r = load([
      agent('a_A', { deleted: true, retired: true, returned_from: 'a_B', tokenHash: H() }),
      agent('a_B', { returning_to: 'a_A', tokenHash: H() }),
    ], { reverse });
    assert.equal(r.members.a_B.retired, false, `${label}: the live seat is not retired into a deleted original`);
    assert.notEqual(r.opens, 'a_A', `${label}: the token never opens the deleted record`);
    assert.equal(r.opens, 'a_B', `${label}: it keeps opening the one live holder`);
    assert.equal(r.members.a_A.retired, true, `${label}: the tombstone stays retired`);
  });
});

test('5 competing originals: two records name the same seat; the file order never picks the winner', () => {
  const list = [
    agent('a_A', { returned_from: 'a_B', tokenHash: H() }),
    agent('a_C', { returned_from: 'a_B', tokenHash: H() }),
    agent('a_B', { returning_to: 'a_A', tokenHash: H() }),
  ];
  const fwd = load(list); const rev = load(list, { reverse: true });
  assert.equal(fwd.opens, rev.opens, `same outcome in both orders (forward ${fwd.opens}, reversed ${rev.opens})`);
  assert.equal(fwd.opens, null, 'ambiguous: opens nobody');
  for (const r of [fwd, rev]) {
    assert.equal(r.members.a_B.retired, false, 'the contested seat is not retired');
    assert.equal(r.disk, r.before, 'disk unchanged');
    assert.ok(Array.isArray(r.issues) && r.issues.length >= 1, `an integrity issue is recorded (${JSON.stringify(r.issues)})`);
  }
});

test('6 a clean file reports no integrity issues and rewrites nothing', () => {
  const r = load([agent('a_X', { tokenHash: H() }), agent('a_Y', { tokenHash: crypto_sha('other') })]);
  assert.equal(r.opens, 'a_X');
  assert.deepEqual(r.issues, []);
  assert.equal(r.disk, r.before);
});

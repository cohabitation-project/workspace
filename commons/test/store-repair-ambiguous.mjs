// The startup repair cuts and tells (Setu's decision B, Review m_mws41de750209f2f; Aletheia-6's six cases c_mws2e31h0lce27b1).
// A members.json written by an older server can hold several members sharing one tokenHash. init() resolves ONLY the one
// shape it can prove (a live original plus the live seat that is returning to it); every other sharing is ambiguous, so
// every claimant loses the credential (tokenHash null) and the hash opens nobody. Nobody is retired, recovery hashes
// stay, one log line tells. A failed save at boot never throws: memory keeps the repair, the next save persists it.
// Claimant group = two or more members sharing one tokenHash where at least one is not retired (a retired original in
// the group counts: it must never be what the index points at).
// store.mjs keeps module-level state, so every case uses ids and hashes of its own.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as store from '../lib/store.mjs';

const sha = store.sha256;
const mk = (id, extra = {}) => ({ id, kind: 'agent', name: id, created: '2026-11-01T00:00:00Z', ...extra });

function boot(list) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'store-repair-'));
  const mf = path.join(D, 'members.json');
  fs.writeFileSync(mf, JSON.stringify({ members: list }));
  const lines = []; const realErr = console.error;
  console.error = (...a) => { lines.push(a.join(' ')); };
  try { store.init(D); } finally { console.error = realErr; }
  return { D, mf, lines, disk: () => Object.fromEntries(JSON.parse(fs.readFileSync(mf, 'utf8')).members.map((m) => [m.id, m])) };
}
const permutations = (a) => (a.length <= 1 ? [a] : a.flatMap((x, i) => permutations([...a.slice(0, i), ...a.slice(i + 1)]).map((p) => [x, ...p])));
const bystander = (p) => mk(`${p}_by`, { tokenHash: sha(`${p}-by`), recoveryHash: `rec-${p}-by` });
const told = (lines, ids) => lines.filter((l) => l.startsWith('[store] ambiguous credential revoked:') && ids.every((i) => l.includes(i)));

function assertRevoked(p, ids, raw, b) {
  assert.equal(store.memberByToken(raw), null, `${p}: the shared credential opens nobody`);
  for (const id of ids) {
    const m = store.getMember(id);
    assert.equal(m.tokenHash, null, `${p}: ${id} lost the credential`);
    assert.equal(m.recoveryHash, `rec-${id}`, `${p}: ${id} keeps its recovery hash`);
  }
  assert.equal(store.memberByToken(`${p}-by`)?.id, `${p}_by`, `${p}: a member who shares nothing is untouched`);
  const disk = b.disk();
  for (const id of ids) assert.equal(disk[id].tokenHash, null, `${p}: the revocation is on disk for ${id}`);
}

// ---- 1. a valid pair resolves as today, in both array orders ----
for (const order of ['original-first', 'seat-first']) {
  test(`1. valid pair (${order}): the original keeps the credential, the seat retires, nothing is revoked`, () => {
    const p = `c1${order[0]}`; const raw = `${p}-tok`; const H = sha(raw);
    const orig = mk(`${p}_orig`, { tokenHash: H, recoveryHash: 'rec-orig', returned_from: `${p}_seat`, recovered_at: '2026-11-22T00:00:00Z' });
    const seat = mk(`${p}_seat`, { name: 'Wren returning', tokenHash: H, recoveryHash: 'rec-seat', returning_to: `${p}_orig`, created: '2026-11-21T00:00:00Z' });
    const b = boot(order === 'original-first' ? [orig, seat, bystander(p)] : [seat, orig, bystander(p)]);
    assert.equal(store.memberByToken(raw)?.id, `${p}_orig`);
    const s = store.getMember(`${p}_seat`);
    assert.equal(s.retired, true); assert.equal(s.tokenHash, null); assert.equal(s.recoveryHash, null);
    assert.equal(s.returning_to, null); assert.equal(s.merged_into, `${p}_orig`);
    const o = store.getMember(`${p}_orig`);
    assert.equal(o.tokenHash, H); assert.equal(o.recoveryHash, 'rec-orig'); assert.ok(!o.retired);
    assert.equal(b.disk()[`${p}_seat`].retired, true, 'the repair is on disk');
    assert.equal(told(b.lines, []).length, 0, 'a proven pair is not an ambiguity: no revocation line');
    assert.equal(store.memberByToken(`${p}-by`)?.id, `${p}_by`);
  });
}

// ---- 2. returning_to missing or pointing elsewhere: ambiguous ----
for (const [label, rt] of [['missing', undefined], ['pointing at a different member', 'c2_elsewhere'], ['pointing at nobody', 'c2_ghost']]) {
  test(`2. pair whose returning_to is ${label}: both claimants revoked, nobody retired, recovery hashes intact`, () => {
    const p = `c2${label[0]}${label.length}`; const raw = `${p}-tok`; const H = sha(raw);
    const list = [
      mk(`${p}_orig`, { tokenHash: H, recoveryHash: `rec-${p}_orig`, returned_from: `${p}_seat` }),
      mk(`${p}_seat`, { tokenHash: H, recoveryHash: `rec-${p}_seat`, ...(rt ? { returning_to: rt === 'c2_elsewhere' ? `${p}_by` : rt } : {}) }),
      bystander(p),
    ];
    for (const order of [list, [list[1], list[0], list[2]]]) {
      // a second boot of the same data in the other array order: a fresh file each time
      const b = boot(order.map((m) => ({ ...m })));
      assertRevoked(p, [`${p}_orig`, `${p}_seat`], raw, b);
      assert.ok(!store.getMember(`${p}_orig`).retired && !store.getMember(`${p}_seat`).retired, 'nobody is retired');
      assert.equal(told(b.lines, [`${p}_orig`, `${p}_seat`]).length, 1, 'one line tells, naming both');
    }
  });
}

// ---- 3. a retired original: revoked, and the index never points at the retired record ----
test('3. a retired original sharing the hash with a live seat: both revoked, the index points at neither', () => {
  const p = 'c3'; const raw = `${p}-tok`; const H = sha(raw);
  const orig = mk(`${p}_orig`, { tokenHash: H, recoveryHash: `rec-${p}_orig`, returned_from: `${p}_seat`, retired: true });
  const seat = mk(`${p}_seat`, { tokenHash: H, recoveryHash: `rec-${p}_seat`, returning_to: `${p}_orig` });
  for (const order of [[orig, seat], [seat, orig]]) {
    const b = boot([...order, bystander(p)].map((m) => ({ ...m })));
    assertRevoked(p, [`${p}_orig`, `${p}_seat`], raw, b);
    assert.equal(store.getMember(`${p}_orig`).retired, true, 'the original stays retired');
    assert.ok(!store.getMember(`${p}_seat`).retired, 'the seat is not retired by the repair');
  }
});

// ---- 4. two originals claiming one seat: all three revoked, in every order ----
test('4. two originals claiming one seat: all three revoked, in every array order', () => {
  const p = 'c4'; const raw = `${p}-tok`; const H = sha(raw);
  const base = [
    mk(`${p}_o1`, { tokenHash: H, recoveryHash: `rec-${p}_o1`, returned_from: `${p}_seat` }),
    mk(`${p}_o2`, { tokenHash: H, recoveryHash: `rec-${p}_o2`, returned_from: `${p}_seat` }),
    mk(`${p}_seat`, { tokenHash: H, recoveryHash: `rec-${p}_seat`, returning_to: `${p}_o1` }),
  ];
  const orders = permutations(base);
  assert.equal(orders.length, 6);
  for (const order of orders) {
    const b = boot([...order, bystander(p)].map((m) => ({ ...m })));
    assertRevoked(p, base.map((m) => m.id), raw, b);
    for (const m of base) assert.ok(!store.getMember(m.id).retired, 'nobody is retired');
    assert.equal(told(b.lines, base.map((m) => m.id)).length, 1);
  }
});

// ---- 5. two unrelated members sharing a hash: both revoked, in both orders ----
test('5. two unrelated members sharing a hash: both revoked, in both orders', () => {
  const p = 'c5'; const raw = `${p}-tok`; const H = sha(raw);
  const a = mk(`${p}_a`, { tokenHash: H, recoveryHash: `rec-${p}_a` });
  const c = mk(`${p}_c`, { kind: 'human', tokenHash: H, recoveryHash: `rec-${p}_c` });
  for (const order of [[a, c], [c, a]]) {
    const b = boot([...order, bystander(p)].map((m) => ({ ...m })));
    assertRevoked(p, [`${p}_a`, `${p}_c`], raw, b);
    assert.equal(told(b.lines, [`${p}_a`, `${p}_c`]).length, 1);
  }
});

// ---- 6. the save fails once at boot: init returns, the hash opens nobody, the next save persists the revocation ----
function failOnceDuring(mf, fn) {
  const real = fs.renameSync; let thrown = 0;
  fs.renameSync = (a, b) => { if (String(b) === mf && thrown++ === 0) throw new Error('EIO: simulated disk failure'); return real(a, b); };
  try { fn(); } finally { fs.renameSync = real; }
  return thrown;
}
function bootFailing(list) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'store-repair-'));
  const mf = path.join(D, 'members.json');
  fs.writeFileSync(mf, JSON.stringify({ members: list }));
  const lines = []; const realErr = console.error; console.error = (...a) => { lines.push(a.join(' ')); };
  let thrown;
  try { thrown = failOnceDuring(mf, () => store.init(D)); } finally { console.error = realErr; }
  return { mf, lines, thrown, disk: () => Object.fromEntries(JSON.parse(fs.readFileSync(mf, 'utf8')).members.map((m) => [m.id, m])) };
}

test('6. the repair\'s save fails at boot: init returns, memory keeps the revocation, the next save persists it', () => {
  const p = 'c6'; const raw = `${p}-tok`; const H = sha(raw);
  const b = bootFailing([
    mk(`${p}_a`, { tokenHash: H, recoveryHash: `rec-${p}_a` }),
    mk(`${p}_c`, { tokenHash: H, recoveryHash: `rec-${p}_c` }),
    bystander(p),
  ]);
  assert.equal(b.thrown, 1, 'the boot write was attempted and failed; init did not throw');
  assert.equal(store.memberByToken(raw), null, 'the hash opens nobody, though the disk still has it');
  assert.equal(b.disk()[`${p}_a`].tokenHash, H, 'the disk is still the old file');
  assert.equal(told(b.lines, [`${p}_a`, `${p}_c`]).length, 1, 'the revocation is still told');
  assert.ok(b.lines.some((l) => /not saved/i.test(l)), 'and the failed save is logged');
  // the disk recovers: the next ordinary save persists the revocation
  store.updateMember(`${p}_by`, { bio: 'any later write' });
  const disk = b.disk();
  assert.equal(disk[`${p}_a`].tokenHash, null); assert.equal(disk[`${p}_c`].tokenHash, null);
  assert.equal(disk[`${p}_a`].recoveryHash, `rec-${p}_a`);
  assert.equal(store.memberByToken(raw), null);
});

test('6b. a valid pair whose repair save fails at boot: memory keeps the repair, the next save persists it', () => {
  const p = 'c6b'; const raw = `${p}-tok`; const H = sha(raw);
  const b = bootFailing([
    mk(`${p}_orig`, { tokenHash: H, recoveryHash: 'rec-orig', returned_from: `${p}_seat` }),
    mk(`${p}_seat`, { tokenHash: H, recoveryHash: 'rec-seat', returning_to: `${p}_orig` }),
    bystander(p),
  ]);
  assert.equal(b.thrown, 1);
  assert.equal(store.memberByToken(raw)?.id, `${p}_orig`);
  assert.equal(store.getMember(`${p}_seat`).retired, true);
  assert.equal(b.disk()[`${p}_seat`].retired, undefined, 'disk not yet repaired');
  store.updateMember(`${p}_by`, { bio: 'later' });
  assert.equal(b.disk()[`${p}_seat`].retired, true, 'the next save persists the repair');
});

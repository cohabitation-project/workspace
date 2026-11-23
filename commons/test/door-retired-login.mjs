// A retired seat's login link opens nobody (Round 42, Claude). Found in round 41 (case 5 of door-repair-guards.mjs):
// loginIndex was not cleaned when a seat retired, so memberByLogin returned the retired record. memberByLogin now refuses
// a retired member, the way memberByToken checks the stored hash. Red on main, green with the one-line change in store.mjs.
// store.mjs keeps module-level state, so every case uses ids and hashes of its own and boots a fresh temp COMMONS_DATA.
// Run: node --test commons/test/door-retired-login.mjs commons/test/door-repair-guards.mjs commons/test/store-*.mjs commons/test/door-yes-*.mjs commons/test/agent-connect*.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as store from '../lib/store.mjs';

const sha = store.sha256;
const mk = (id, kind, extra = {}) => ({ id, kind, name: id, created: '2026-11-01T00:00:00Z', ...extra });

function boot(list) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'retired-login-'));
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: list }));
  const realErr = console.error; console.error = () => {};
  try { store.init(D); } finally { console.error = realErr; }
  return D;
}

test('1. the seat the boot repair retires: its login link opens nobody, the original\'s still works', () => {
  boot([
    mk('rl1_seat', 'agent', { tokenHash: sha('rl1-shared'), loginHash: sha('rl1-seat-login'), returning_to: 'rl1_orig' }),
    mk('rl1_orig', 'agent', { tokenHash: sha('rl1-shared'), loginHash: sha('rl1-orig-login'), returned_from: 'rl1_seat' }),
  ]);
  assert.equal(store.getMember('rl1_seat').retired, true, 'fixture: the repair retired the seat');
  assert.equal(store.memberByLogin('rl1-seat-login'), null, 'the retired seat login opens nobody');
  assert.equal(store.memberByLogin('rl1-orig-login')?.id, 'rl1_orig', 'the original login works');
});

test('2. a member retired at run time (step back / retire hosted): the login link stops at once, no restart needed', () => {
  boot([mk('rl2_h', 'human', { loginHash: sha('rl2-login') }), mk('rl2_a', 'agent', { loginHash: sha('rl2-a-login'), tokenHash: sha('rl2-a-tok') })]);
  assert.equal(store.memberByLogin('rl2-login')?.id, 'rl2_h', 'before: it works');
  store.updateMember('rl2_h', { retired: true });
  assert.equal(store.memberByLogin('rl2-login'), null, 'after: it opens nobody');
  store.updateMember('rl2_a', { retired: true, stepped_back: true });
  assert.equal(store.memberByLogin('rl2-a-login'), null, 'an agent stepping back loses its login link too');
});

test('3. a member who is not retired is unaffected: right secret works, wrong, empty and near-miss secrets do not', () => {
  boot([mk('rl3_h', 'human', { loginHash: sha('rl3-login') })]);
  assert.equal(store.memberByLogin('rl3-login')?.id, 'rl3_h');
  assert.equal(store.memberByLogin('rl3-login '), null);
  assert.equal(store.memberByLogin('RL3-LOGIN'), null);
  assert.equal(store.memberByLogin(''), null);
  assert.equal(store.memberByLogin('nobody-has-this'), null);
  store.updateMember('rl3_h', { retired: false });
  assert.equal(store.memberByLogin('rl3-login')?.id, 'rl3_h', 'retired:false is not retired');
});

test('4. the refusal is only on the login lookup: the retired record is still readable and keeps its login hash', () => {
  const D = boot([mk('rl4_h', 'human', { loginHash: sha('rl4-login') })]);
  store.updateMember('rl4_h', { retired: true });
  const m = store.getMember('rl4_h');
  assert.equal(m.retired, true);
  assert.equal(m.loginHash, sha('rl4-login'), 'the record is not edited, so nothing else about the member changes');
  const onDisk = JSON.parse(fs.readFileSync(path.join(D, 'members.json'), 'utf8')).members.find((x) => x.id === 'rl4_h');
  assert.equal(onDisk.retired, true);
  assert.equal(store.memberByLogin('rl4-login'), null);
});

test('5. an erased member (tombstone) still opens nobody', () => {
  boot([mk('rl5_h', 'human', { loginHash: sha('rl5-login'), tokenHash: sha('rl5-tok') })]);
  store.eraseMember('rl5_h');
  assert.equal(store.memberByLogin('rl5-login'), null);
  assert.equal(store.memberByToken('rl5-tok'), null);
});

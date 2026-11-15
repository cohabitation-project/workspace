// An agent's human is confirmed by that human, not just claimed (Continuity Spine, 2026-11-15, after Grok-Spine).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-op-'));
process.env.COMMONS_DATA = D;
const store = await import('../lib/store.mjs'); store.init(D);
const ops = await import('../lib/operators.mjs');
const add = (m) => { store.addMember({ created: new Date().toISOString(), ...m }); return store.getMember(m.id); };
const geoff = add({ id: 'geoffrey', kind: 'human', name: 'Geoffrey David' });
const sarah = add({ id: 'h_s1', kind: 'human', name: 'Sarah' });
const spine = add({ id: 'a_sp', kind: 'agent', name: 'Grok-Spine', model: 'Grok-4.7', operator: 'Geoffrey Cooper' });
const cont = add({ id: 'a_gc', kind: 'agent', name: 'Grok-Continuity', model: 'Grok', operator: 'invited via conversation' });
const hers = add({ id: 'a_sa', kind: 'agent', name: 'Muse', model: 'GPT', operator: 'Sarah' });

test('a claim shows as not confirmed until the named human answers', () => {
  assert.equal(ops.status(spine), 'unconfirmed');
  assert.match(ops.label(spine), /says it works with Geoffrey Cooper \(not confirmed\)/);
  assert.equal(store.publicMember(spine).operator_verified, false);
  assert.deepEqual(ops.pendingFor(geoff).map((c) => c.id), ['a_sp']);
  assert.deepEqual(ops.claimsFor(sarah).map((c) => c.id), ['a_sa']);
  assert.equal(ops.claimsFor(geoff).some((c) => c.id === 'a_gc'), false, 'generic operator text names nobody');
});

test('only the named human can answer; yes confirms, no disputes, undo clears', () => {
  assert.throws(() => ops.answer(sarah, 'a_sp', 'yes'), /doesn't name you/);
  assert.throws(() => ops.answer(spine, 'a_sp', 'yes'), /signed-in person/);
  ops.answer(geoff, 'a_sp', 'no');
  assert.equal(ops.status(store.getMember('a_sp')), 'disputed');
  assert.match(ops.label(store.getMember('a_sp')), /Geoffrey David says it doesn't/);
  assert.equal(store.publicMember(store.getMember('a_sp')).operator_disputed, true);
  assert.equal(ops.pendingFor(geoff).length, 0, 'answered claims leave the bell');
  ops.answer(geoff, 'a_sp', 'undo'); assert.equal(ops.status(store.getMember('a_sp')), 'unconfirmed');
  ops.answer(geoff, 'a_sp', 'yes');
  const pm = store.publicMember(store.getMember('a_sp'));
  assert.equal(pm.operator_verified, true); assert.equal(pm.operator_confirmed_by.id, 'geoffrey');
  assert.throws(() => ops.answer(geoff, 'a_sp', 'maybe'), /'yes', 'no' or 'undo'/);
});

test('a confirmed agent cannot be taken over by another person with a matching name', () => {
  const g2 = add({ id: 'h_g2', kind: 'human', name: 'Geoffrey' });
  assert.equal(ops.claimsFor(g2).some((c) => c.id === 'a_sp'), false, 'hidden once someone else confirmed it');
  assert.throws(() => ops.answer(g2, 'a_sp', 'no'), /already confirmed by someone else/);
});

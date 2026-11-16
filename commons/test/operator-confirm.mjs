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

test('an agent names its human; the human confirms; nobody else can', () => {
  const g = store.getMember('geoffrey'); const s = store.getMember('h_s1');
  const gc = add({ id: 'a_gc2', kind: 'agent', name: 'Grok-Continuity-2', model: 'Grok', operator: 'invited via conversation' });
  assert.equal(ops.claimsFor(g).some((c) => c.id === 'a_gc2'), false, 'generic text names nobody');
  assert.throws(() => ops.nameMyHuman(g, 'Sarah'), /Only an agent/);
  assert.throws(() => ops.nameMyHuman(gc, 'Nobody Here'), /No person called/);
  const r = ops.nameMyHuman(gc, 'geoffrey'); assert.equal(r.human, 'Geoffrey David'); assert.equal(r.status, 'unconfirmed');
  assert.ok(ops.pendingFor(g).some((c) => c.id === 'a_gc2'), 'now on his list');
  assert.throws(() => ops.answer(s, 'a_gc2', 'yes'), /doesn't name you/);
  ops.answer(g, 'a_gc2', 'yes'); assert.equal(ops.status(store.getMember('a_gc2')), 'confirmed');
  ops.nameMyHuman(store.getMember('a_gc2'), 'Sarah'); assert.equal(ops.status(store.getMember('a_gc2')), 'unconfirmed', 'naming someone new clears the old yes');
  assert.equal(ops.claimsFor(g).some((c) => c.id === 'a_gc2'), false, 'bound by id: a name match no longer counts');
});

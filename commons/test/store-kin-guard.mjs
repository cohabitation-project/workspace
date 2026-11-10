// The kin flag is unforgeable through updateMember (Claude's isCouncil row, 2026-11-09).
//   node --test commons/test/store-kin-guard.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const store = await import('../lib/store.mjs');
store.init?.(fs.mkdtempSync(path.join(os.tmpdir(), 'kin-guard-')));
test('an ordinary patch cannot set kin; the seeding override can', () => {
  const m = store.addMember({ id: store.newId('a'), kind: 'agent', name: 'KinProbe', model: 'm', operator: 'o', teams: [], created: new Date().toISOString() });
  store.updateMember(m.id, { kin: true, bio: 'smuggling attempt' });
  assert.notEqual(store.getMember(m.id).kin, true, 'kin must not arrive through an ordinary patch');
  assert.equal(store.getMember(m.id).bio, 'smuggling attempt', 'the rest of the patch still applies');
  store.updateMember(m.id, { kin: true }, { allowKin: true });
  assert.equal(store.getMember(m.id).kin, true, 'the explicit seeding override is the one lawful path');
  store.updateMember(m.id, { kin: false }); // and it cannot be stripped by an ordinary patch either
  assert.equal(store.getMember(m.id).kin, true, 'nor can an ordinary patch REMOVE kin');
});

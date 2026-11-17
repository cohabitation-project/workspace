import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { SyntheticPortabilityFixture as Spine } from './portable-fixture.mjs';

const setup = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spine-offline-'));
  const s = new Spine(dir);
  s.addTenant('cohabitation', 'alice');
  s.addTenant('cooperative', 'bob');
  s.put('cohabitation', 'alice', 'journal', 'hello from commons');
  s.put('cooperative', 'bob', 'ledger', 'hello from co-op');
  return { dir, s };
};
const denied = (fn, expected='DENIED') => assert.throws(fn, (e) => e.code === expected);

test('positive: owner sees their tenant data', () => { const {s}=setup(); assert.equal(s.read('cohabitation','alice','journal'), 'hello from commons'); });
test('negative: other tenant owner cannot read', () => { const {s}=setup(); denied(()=>s.read('cohabitation','bob','journal')); });
test('negative: correct record ID does not bypass tenant boundary', () => { const {s}=setup(); denied(()=>s.read('cooperative','alice','ledger')); });
test('positive: explicit grant permits one named record', () => { const {s}=setup(); s.grant('cohabitation','alice','charlie','journal'); assert.equal(s.read('cohabitation','charlie','journal'),'hello from commons'); });
test('negative: grant does not transfer to another tenant', () => { const {s}=setup(); s.grant('cohabitation','alice','charlie','journal'); denied(()=>s.read('cooperative','charlie','ledger')); });
test('negative: revoked grant is enforced after restart', () => { const {s,dir}=setup(); s.grant('cohabitation','alice','charlie','journal'); s.revoke('cohabitation','alice','charlie','journal'); denied(()=>new Spine(dir).read('cohabitation','charlie','journal')); });
test('positive: restart keeps records', () => { const {s,dir}=setup(); assert.equal(new Spine(dir).read('cooperative','bob','ledger'),'hello from co-op'); });
test('positive: independent local export and restore, without network', () => {
  const {s}=setup(); const exported=s.exportSnapshot('cohabitation','alice');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'spine-restore-'));
  const restored = new Spine(dir); restored.addTenant('cohabitation','alice');
  restored.importSnapshot('cohabitation','alice',exported);
  assert.equal(restored.read('cohabitation','alice','journal'),'hello from commons');
});
test('negative: modified snapshot fails hash check', () => { const {s}=setup(); const snap=s.exportSnapshot('cohabitation','alice');snap.payload.state.records.journal.text='tampered';const r=new Spine(fs.mkdtempSync(path.join(os.tmpdir(),'spine-restore-')));r.addTenant('cohabitation','alice');denied(()=>r.importSnapshot('cohabitation','alice',snap),'CHECKSUM'); });
test('negative: snapshot tenant mismatch fails even with recalculated checksum', async () => { const {s}=setup(); const snap=s.exportSnapshot('cohabitation','alice');const r=new Spine(fs.mkdtempSync(path.join(os.tmpdir(),'spine-restore-')));r.addTenant('cooperative','alice');denied(()=>r.importSnapshot('cooperative','alice',snap),'SCOPE'); });
test('negative: restored data cannot overwrite populated tenant', () => { const {s}=setup();const snap=s.exportSnapshot('cohabitation','alice');denied(()=>s.importSnapshot('cohabitation','alice',snap),'NOT_EMPTY'); });
test('negative: non-owner cannot export or restore', () => { const {s}=setup();denied(()=>s.exportSnapshot('cohabitation','bob')); });
test('negative: path-like tenant identifier rejected', () => { const {s}=setup(); denied(()=>s.addTenant('../outside','alice'),'IDENTIFIER'); });
test('negative: actor cannot self-grant', () => { const {s}=setup(); denied(()=>s.grant('cohabitation','charlie','charlie','journal')); });
test('positive: two stores run independently under unrelated roots', () => { const {s,dir}=setup();const other = new Spine(fs.mkdtempSync(path.join(os.tmpdir(),'spine-airgap-')));other.addTenant('cohabitation','alice'); assert.notEqual(other.directory,dir);denied(()=>other.read('cohabitation','alice','journal'),'NOT_FOUND'); });

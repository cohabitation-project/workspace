import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { PackageError, validateManifest, verifyBundle, checkInstallPlan } from './release.mjs';

const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');
const make = () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'spine-release-'));
  fs.writeFileSync(path.join(dir, 'app.mjs'), 'export const ready = false;\n');
  const m = { product: 'continuity-spine', schemaVersion: 1, version: '0.1.0', sourceCommit: 'a'.repeat(40), entrypoint: 'app.mjs', adapters: ['identity','authorization','storage','audit','backup'], files: [{path: 'app.mjs',sha256: sha(fs.readFileSync(path.join(dir, 'app.mjs')))}] };
  const save = () => fs.writeFileSync(path.join(dir, 'spine-manifest.json'), JSON.stringify(m)); save();
  return {dir,m,save};
};
const plan = () => ({tenancy:'single-tenant',baseUrl:'https://spine.example.org',adapters:Object.fromEntries(['identity','authorization','storage','audit','backup'].map(x=>[x,`org-${x}-adapter`])),secretRefs:['env:SPINE_KEY']});
const rejects = (fn, code) => assert.throws(fn,(e)=>e instanceof PackageError && e.code===code);

test('valid declared bytes verify but NEVER imply security readiness',()=>{const x=make();const v=verifyBundle(x.dir);assert.equal(v.integrity,'verified-offline');assert.equal(v.securityAssurance,'not-assessed');assert.equal(v.fileCount,1);});
test('modified file fails SHA-256 verification',()=>{const x=make();fs.appendFileSync(path.join(x.dir,'app.mjs'),'tamper');rejects(()=>verifyBundle(x.dir),'HASH');});
test('unknown extra file refused',()=>{const x=make();fs.writeFileSync(path.join(x.dir,'secret.txt'),'x');rejects(()=>verifyBundle(x.dir),'EXTRA');});
test('missing declared file refused',()=>{const x=make();fs.unlinkSync(path.join(x.dir,'app.mjs'));rejects(()=>verifyBundle(x.dir),'MISSING');});
test('symlink refused (even when checksum of target would match)',()=>{const x=make();fs.symlinkSync('app.mjs',path.join(x.dir,'alias'));rejects(()=>verifyBundle(x.dir),'SYMLINK');});
test('traversal, absolute, and Windows paths refused',()=>{for(const p of ['../escape','/etc/passwd','C:/escape','a\\b','./x']) {const x=make();x.m.files[0].path=p;rejects(()=>validateManifest(x.m),'INVENTORY');}});
test('duplicate file manifest refused',()=>{const x=make();x.m.files.push({...x.m.files[0]});rejects(()=>validateManifest(x.m),'INVENTORY');});
test('entrypoint required in inventory',()=>{const x=make();x.m.entrypoint='missing.mjs';rejects(()=>validateManifest(x.m),'ENTRY');});
test('unpinned source and version rejected',()=>{const x=make();x.m.sourceCommit='main';rejects(()=>validateManifest(x.m),'SOURCE');x.m.sourceCommit='a'.repeat(40);x.m.version='latest';rejects(()=>validateManifest(x.m),'VERSION');});
test('missing required adapters refused',()=>{const x=make();x.m.adapters.pop();rejects(()=>validateManifest(x.m),'ADAPTERS');});
test('valid plan is only structurally validated, never called production-ready',()=>{const p=checkInstallPlan(plan());assert.equal(p.planStructure,'valid');assert.equal(p.readiness,'NOT_READY');});
test('plaintext secret fields and literal secret refs refused',()=>{rejects(()=>checkInstallPlan({...plan(),clientSecret:'leaked'}),'SECRETS');rejects(()=>checkInstallPlan({...plan(),secretRefs:['actual-secret']}),'SECRETS');});
test('unencrypted transport refused',()=>{rejects(()=>checkInstallPlan({...plan(),baseUrl:'http://spine.example.org'}),'TRANSPORT');});
test('ambiguous tenancy and missing adapter refused',()=>{rejects(()=>checkInstallPlan({...plan(),tenancy:'shared'}),'TENANCY');const p=plan();delete p.adapters.audit;rejects(()=>checkInstallPlan(p),'ADAPTERS');});

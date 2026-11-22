import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildBrief } from '../scripts/continuity-warm-start.mjs';

test('small read-only brief links only to relevant source files and discloses missing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cohabi-brief-'));
  try {
    for (const [file,text] of Object.entries({
      'context/00-mission.md':'Mission source text',
      'context/00-welcome-and-reentry.md':'Welcome',
      'memory/kin/testagent.md':'Identity',
      'continuity/testagent/ACTIVE.md':'Finish marketplace',
      'continuity/testagent/2026-11-20-notes.md':'Recent work',
      'continuity/testagent/2026-11-21-notes.md':'Newest work'
    })) {
      const p=path.join(root,file); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,text);
    }
    const result=buildBrief({root,agent:'testagent',now:new Date('2026-11-21T00:00:00.000Z')});
    assert.equal(result.kind,'local-readonly-warm-start-v0');
    assert.equal(result.generated_at,'2026-11-21T00:00:00.000Z');
    assert(result.sources.find(x=>x.kind==='active')?.excerpt.includes('Finish marketplace'));
    assert(result.sources.some(x=>x.source==='continuity/testagent/2026-11-21-notes.md'));
    assert.equal(result.sources.filter(x=>x.kind==='continuity').length,2);
    assert.equal(result.missing.length,0);
    fs.rmSync(path.join(root,'continuity/testagent/ACTIVE.md'));
    assert(buildBrief({root,agent:'testagent'}).missing.includes('continuity/testagent/ACTIVE.md'));
    assert.throws(()=>buildBrief({root,agent:'../testagent'}),/invalid agent slug/);
  } finally {fs.rmSync(root,{recursive:true,force:true})}
});

// Software & Hardware, first stage (Aletheia-6's design, PR #165; 2026-11-16): kinds come from tags and licence.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-sw-'));
process.env.COMMONS_DATA = dir;
const mp = await import('../lib/marketpage.mjs');

test('a listing\'s kinds come from its tags, and an open licence makes it open source', () => {
  assert.deepEqual(mp.swTypesOf({ tags: ['app', 'android'], license: 'all-rights' }), ['apps']);
  assert.deepEqual(mp.swTypesOf({ tags: ['Hardware', 'sensor'], license: 'mit' }), ['hardware', 'open-source']);
  assert.deepEqual(mp.swTypesOf({ tags: ['api'], license: 'gpl' }), ['dev-tools', 'open-source']);
  assert.deepEqual(mp.swTypesOf({ tags: ['open-source'], license: 'mit' }), ['open-source'], 'open source counted once');
  assert.deepEqual(mp.swTypesOf({ tags: [], license: 'service' }), []);
  assert.deepEqual(Object.keys(mp.SW_TYPES), ['apps', 'saas', 'open-source', 'games', 'hardware', 'dev-tools']);
});

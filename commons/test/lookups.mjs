// Reading for the kin: paths said the human way (`lib/mail.mjs`) and pull requests (#205) now resolve.
//   node --test commons/test/lookups.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { findRefs, lookupBlock } from '../lib/lookups.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const deps = { root: ROOT, getContribution: () => null, getTask: () => null };

test('a bare commons path (`lib/mail.mjs`) resolves under commons/', () => {
  const r = findRefs(['I read `lib/mail.mjs` and commons/lib/feedback.mjs, plus `test/steward.mjs`.']);
  assert.ok(r.paths.includes('commons/lib/mail.mjs'), 'lib/ mapped');
  assert.ok(r.paths.includes('commons/test/steward.mjs'), 'test/ mapped');
  assert.ok(r.paths.includes('commons/lib/feedback.mjs'), 'full paths still found');
  assert.equal(r.paths.filter((p) => p === 'commons/lib/feedback.mjs').length, 1, 'no duplicate when both forms are named');
});

test('PR references are found in the ways people write them', () => {
  const r = findRefs(['Please re-review #205 and PR 190; the branch is pull/186.']);
  assert.deepEqual([...r.prs].sort((a, b) => a - b), [186, 190, 205]);
  assert.deepEqual(findRefs(['no refs here, not even word#word']).prs, []);
});

test('lookupBlock opens a bare-named file for the kin', () => {
  const block = lookupBlock(['@Claude the hole is in `lib/lookups.mjs`, in `findRefs`.'], deps);
  assert.match(block, /commons\/lib\/lookups\.mjs/, 'the file is in the block');
  assert.match(block, /findRefs/, 'its named section is shown');
});

test('a bare path that exists nowhere gets the honest DOES NOT EXIST line', () => {
  const block = lookupBlock(['see `lib/no-such-file-xyz.mjs`'], deps);
  assert.match(block, /DOES NOT EXIST|not readable|not part of the public record/);
});

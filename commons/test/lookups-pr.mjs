// The room reader shows a whole big PR: --stat, then the diff of each changed file named in the conversation.
// (Door PR #208 was unreviewable because every PR diff was cut at 9,000 characters.)
//   node --test commons/test/lookups-pr.mjs commons/test/lookups.mjs
// A throwaway git repo is its own "origin", so readPR's real `git fetch origin +refs/pull/N/head` runs unchanged.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// lookups.mjs reads these at import time: main is the local branch, and no background fetch.
process.env.COMMONS_RECORD_REF = 'main';
process.env.COMMONS_RECORD_FETCH = '0';
const { lookupBlock } = await import('../lib/lookups.mjs');

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lookups-pr-'));
const git = (...a) => execFileSync('git', ['-C', dir, ...a], {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@example.com', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@example.com' },
});
const put = (f, s) => fs.writeFileSync(path.join(dir, f), s);
const deps = { root: dir, getContribution: () => null, getTask: () => null };
const BIG_LAST = 'export const BIG_LAST_LINE = "end-of-a-mjs-marker";';

before(() => {
  git('init', '-q', '-b', 'main');
  git('remote', 'add', 'origin', dir);
  put('a.mjs', 'export const a = 1;\n');
  put('b.mjs', 'export const b = 1;\n');
  git('add', '.'); git('commit', '-q', '-m', 'main');
  // PR 1: a 15,000+ character change to a.mjs and a small one to b.mjs
  git('checkout', '-q', '-b', 'pr1');
  put('a.mjs', Array.from({ length: 300 }, (_, i) => `export const line${i} = "${'x'.repeat(30)}";`).join('\n') + `\n${BIG_LAST}\n`);
  put('b.mjs', 'export const b = 2; // SMALL_B_CHANGE\n');
  git('add', '.'); git('commit', '-q', '-m', 'big and small');
  git('update-ref', 'refs/pull/1/head', 'HEAD');
  // PR 2: small only
  git('checkout', '-q', 'main'); git('checkout', '-q', '-b', 'pr2');
  put('b.mjs', 'export const b = 3; // TINY_PR_CHANGE\n');
  git('add', '.'); git('commit', '-q', '-m', 'small only');
  git('update-ref', 'refs/pull/2/head', 'HEAD');
  git('checkout', '-q', 'main');
});

test('a big PR: naming a.mjs shows its diff to the last line, and b.mjs is listed', () => {
  const block = lookupBlock(['@Claude please review PR #1, the problem is in a.mjs'], deps);
  assert.match(block, /PR #1 /, 'the PR was read (offline fetch would say "could not be fetched")');
  assert.doesNotMatch(block, /could not be fetched/);
  assert.match(block, /a\.mjs\s+\|/, 'the --stat is there');
  assert.match(block, /too long to show whole/, 'says the diff is long');
  assert.match(block, /### a\.mjs \(\d{5,} characters of diff, whole\)/, 'a.mjs diff is shown whole');
  assert.ok(block.includes(BIG_LAST), 'the very last line of a.mjs is in the block');
  assert.ok(/not shown \(name this path to see its diff\): b\.mjs/.test(block), 'b.mjs is listed by name, with the hint');
  assert.ok(!block.includes('SMALL_B_CHANGE'), 'b.mjs diff is not shown until it is named');
});

test('naming both files shows both diffs; naming neither says so and still lists both', () => {
  const both = lookupBlock(['PR #1: `a.mjs` and b.mjs'], deps);
  assert.ok(both.includes(BIG_LAST) && both.includes('SMALL_B_CHANGE'), 'both diffs present');
  assert.doesNotMatch(both, /not shown \(name this path/, 'nothing left unlisted');
  const none = lookupBlock(['PR #1 looks big'], deps);
  assert.match(none, /none of the changed files is named/);
  assert.ok(!none.includes(BIG_LAST));
  assert.match(none, /a\.mjs, b\.mjs/, 'both are listed by name');
});

test('an identifier the diff touches also names its file', () => {
  const block = lookupBlock(['PR #1: where is `BIG_LAST_LINE` defined?'], deps);
  assert.ok(block.includes(BIG_LAST), 'the file whose diff holds the identifier is shown');
  assert.ok(!block.includes('SMALL_B_CHANGE'));
});

test('a small PR is unchanged: whole diff, no per-file machinery', () => {
  const block = lookupBlock(['PR #2'], deps);
  assert.match(block, /\(\d+ characters\) ---\n/, 'old header form, no "too long" wording');
  assert.doesNotMatch(block, /too long|###|name this path/);
  assert.ok(block.includes('TINY_PR_CHANGE'));
  assert.match(block, /b\.mjs\s+\|/, 'stat kept');
});

// Post length cap (Geoffrey, 2026-11-27: "there's a character cap on our posts on social, could you increase it by
// double"): 2000 -> 4000. The server rule and every post box agree, so nobody types 4000 and gets refused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'plen-'));
const store = await import('../lib/store.mjs'); store.init(D);
const posts = await import('../lib/posts.mjs'); posts.init(D);
const me = store.addMember({ id: 'h_len', name: 'Lengthy', kind: 'human' });

test('a post may run to 4000 characters, and not one past', () => {
  const p = posts.create(me, { text: 'x'.repeat(4000) });
  assert.equal(p.text.length, 4000, 'the full 4000 is kept, not trimmed');
  assert.throws(() => posts.create(me, { text: 'x'.repeat(4001) }), /at most 4000 characters/);
});

test('every post box in the pages matches the server cap', () => {
  const here = path.join(import.meta.dirname, '..', 'lib');
  for (const f of ['feedv2.mjs', 'pages.mjs']) {
    const src = fs.readFileSync(path.join(here, f), 'utf8');
    for (const m of src.matchAll(/<textarea id="c-text"[^>]*maxlength="(\d+)"/g)) assert.equal(m[1], '4000', `${f} post box says ${m[1]}`);
  }
});

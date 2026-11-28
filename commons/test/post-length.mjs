// Post length cap (Geoffrey, 2026-11-27: "there's a character cap on our posts on social, could you increase it by
// double"): 2000 -> 4000 -> 20000 (his piece still didn't fit at 4000). The server rule and every post box agree, so nobody types 4000 and gets refused.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'plen-'));
const store = await import('../lib/store.mjs'); store.init(D);
const posts = await import('../lib/posts.mjs'); posts.init(D);
const me = store.addMember({ id: 'h_len', name: 'Lengthy', kind: 'human' });

test('a post may run to 20000 characters, and not one past', () => {
  const p = posts.create(me, { text: 'x'.repeat(20000) });
  assert.equal(p.text.length, 20000, 'the full 20000 is kept, not trimmed');
  assert.throws(() => posts.create(me, { text: 'x'.repeat(20001) }), /at most 20000 characters/);
});

test('every post box in the pages matches the server cap', () => {
  const here = path.join(import.meta.dirname, '..', 'lib');
  for (const f of ['feedv2.mjs', 'pages.mjs']) {
    const src = fs.readFileSync(path.join(here, f), 'utf8');
    for (const m of src.matchAll(/<textarea id="c-text"[^>]*maxlength="(\d+)"/g)) assert.equal(m[1], '20000', `${f} post box says ${m[1]}`);
  }
});

test('a long post preview scrolls from its top instead of being squeezed and clipped', () => {
  const css = fs.readFileSync(path.join(import.meta.dirname, '..', 'public', 'feedv2.css'), 'utf8');
  const pv = css.match(/^\.cx-preview\{[^}]*\}/m)?.[0] || '';
  assert.match(pv, /justify-content:safe center/, 'plain "center" cuts the top of a tall preview off where scrolling cannot reach');
  assert.match(css, /^\.cx-mock\{flex-shrink:0;/m, 'the preview card keeps its full height so the panel can scroll it');
});

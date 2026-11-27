// Round 71 (DeepSeek): `POST /api/merch/listings` has no caller in the product.
//
// After round 70 deleted the dead `#mk-merch` block and round 71 deleted the branch that read it,
// `commons/public/market.js` can no longer reach this route: no file under `commons/public/` calls any
// `/api/merch/*` endpoint at all. The only callers left in the tree are two test files, one of which
// (this suite's sibling `market-no-dead-merch.mjs`) asserts the absence.
//
// This file pins that state from the source, with no server and no browser:
//   1. the client surface (`commons/public/`) is clean of `/api/merch/*`;
//   2. the routes `/api/merch/listings` and `/api/merch/products` appear nowhere in `commons/lib/`
//      except three image URLs that are handed to `<img src>`, never fetched by our own code;
//   3. the only files under `commons/` that mention `/api/merch/listings` are its boot test (which asserts the
//      404) and the guard that asserts the composer does not post to it;
//   4. the handler is gone from `commons/server.mjs` — and the create-mockup routes beside it are not.
//
// Rationale for (3) and (4): a new client caller, or a later re-addition of the handler, ought to redden this
// test at its own assertion rather than pass quietly. Round 72 retired the route; before it did, item 4 pinned
// the handler's two promises (refuse a price under the printer's base, withdraw if the link fails), and those
// two checks died with the code they tested. Evidence and line numbers:
// `teams/build/outputs/round71-deepseek-merch-listings-callers.md`,
// `teams/build/outputs/round72-deepseek-retire-listings.md`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function walk(rel) {
  const base = path.join(ROOT, rel);
  const out = [];
  const stack = [base];
  while (stack.length) {
    const dir = stack.pop();
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
    for (const e of entries) {
      if (e.name === 'node_modules' || e.name === '.git') continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) stack.push(p);
      else if (/\.(mjs|cjs|js|html)$/.test(e.name)) out.push(p);
    }
  }
  return out.sort();
}

// Comments state intent; they are not calls. Strip them so a sentence mentioning a route cannot pass
// for code that fetches it (round 70's lesson: a substring that appears anywhere is not an assertion).
const codeLines = (src) => src.split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l));

const relOf = (p) => path.relative(ROOT, p).split(path.sep).join('/');

test('/api/merch/listings: no file a browser runs posts to it', () => {
  const offenders = [];
  for (const file of walk('commons/public')) {
    const src = fs.readFileSync(file, 'utf8');
    // Stronger than the job asks: the client surface touches no /api/merch/* endpoint at all.
    // The three image routes are rendered into markup by commons/lib/merchsets.mjs, not fetched from here.
    for (const line of codeLines(src)) {
      if (line.includes('/api/merch')) offenders.push(`${relOf(file)}: ${line.trim().slice(0, 120)}`);
    }
  }
  assert.deepEqual(offenders, [], `commons/public must not call /api/merch/* (found ${offenders.length})`);
});

test('/api/merch/listings and /api/merch/products: commons/lib only builds image URLs for them', () => {
  const IMAGE_URL = /\/api\/merch\/(art|template|product-image)\//;
  const offenders = [];
  for (const file of walk('commons/lib')) {
    for (const line of codeLines(fs.readFileSync(file, 'utf8'))) {
      if (!line.includes('/api/merch')) continue;
      if (line.includes('/api/merch/listings') || line.includes('/api/merch/products')) {
        offenders.push(`${relOf(file)}: ${line.trim().slice(0, 120)}`);
      } else if (!IMAGE_URL.test(line)) {
        offenders.push(`${relOf(file)}: ${line.trim().slice(0, 120)}`);
      }
    }
  }
  assert.deepEqual(offenders, [], `commons/lib must not call the merch write/read routes (found ${offenders.length})`);
});

test('/api/merch/listings: only its boot test and the no-dead-merch guard mention it', () => {
  const allowed = new Set([
    'commons/test/merch-printful.mjs',
    'commons/test/market-no-dead-merch.mjs',
  ]);
  const seen = new Set();
  for (const file of walk('commons')) {
    const rel = relOf(file);
    if (rel === 'commons/test/merch-listings-no-client-caller.mjs') continue;
    // Comments are stripped here too, on purpose: a sentence saying "we used to post to this route" is not a
    // caller, and a file that can never reach the route (market.js) is allowed to talk about it in a comment.
    // Measured: a comment-only mutation in market.js stays green; a real `const x = '/api/merch/listings'` reddens.
    if (codeLines(fs.readFileSync(file, 'utf8')).some((l) => l.includes('/api/merch/listings'))) seen.add(rel);
  }
  assert.deepEqual([...seen].sort(), [...allowed].sort(),
    'a file other than the route and its two tests mentions /api/merch/listings');
});

test('/api/merch/listings: the handler is retired, and the routes beside it are not', () => {
  const lines = fs.readFileSync(path.join(ROOT, 'commons/server.mjs'), 'utf8').split('\n');
  const at = lines.findIndex((l) => l.includes("app.post('/api/merch/listings'"));
  assert.equal(at, -1, 'commons/server.mjs still registers POST /api/merch/listings; round 72 retired it, so a re-added handler reddens here');
  // Retirement must take the one route, not its neighbours: these three carry the mockup a maker still needs.
  for (const kept of ["app.get('/api/merch/products'", "app.post('/api/merch/mockups'", "app.get('/api/merch/mockups/:key'"]) {
    assert.ok(lines.some((l) => l.includes(kept)), `retiring the listing route also removed ${kept}`);
  }
  // And the comment above them must not promise it again: a route that is described but absent is how round 70's
  // wrong premise spread. Comments are the one place this can rot silently, so the absence is asserted on text.
  assert.ok(!lines.some((l) => l.includes('/api/merch/listings')), 'commons/server.mjs still names /api/merch/listings anywhere, including a comment');
});

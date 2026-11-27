// Round 70/71 (DeepSeek): the listing form's print-on-demand picker is gone from commons/public/market.js, and it must
// not come back by halves.
//
// Round 69 measured why: `/label/new` no longer renders a `#mk-merch` box at all, and `grep -rn mk-merch commons/lib` is
// empty. The picker lives in the maker panel at `/label/l/:id/products` (commons/lib/marketpage.mjs renders it,
// commons/public/merch-panel-aletheia.js drives it). The block in market.js was therefore fetching the product list and
// wiring listeners onto elements that no page has — dead code that also made it look, to anyone reading the market
// script, as if the composer still sold printed products.
//
// Correction to an earlier version of this comment: the maker panel does NOT call `GET /api/merch/products`. It reads
// `GET /api/market/listings/:id/merch/panel` (merch-panel-aletheia.js:63). After the box was deleted, the only callers
// of `/api/merch/products` left in the tree are tests. That route is Tier 1 (server.mjs) and is not this test's business.
//
// Round 71 also removed the submit handler's `merch` branch: `merch` was `!id && form.dataset.mockup && $('#mf-on')?.checked`,
// and with the box gone nothing in the repo sets `data-mockup` or renders `#mf-on` (grep over commons/: 0 hits each), so
// `POST /api/merch/listings` from this script could never run. The composer now has one publish path.
//
// This test is server-free on purpose (it needs no `node_modules`, no boot, no Chromium): the defect is a piece of text
// that should not be in a file, so reading the file is the honest measurement. It reads the files from the checkout the
// test itself lives in, so it works in any copy.
//
// What it does NOT prove: that the maker panel is the only picker in the browser. That is Kimi's booted panel test
// (`merch-panel-cold-read.mjs`) and Aletheia-6's design, not this file.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..'); // .../commons/test -> repo root
const read = (rel) => readFileSync(join(root, rel), 'utf8');
const marketJs = () => read('commons/public/market.js');

// Every file under commons/lib, recursively: the pages that would have to render a `#mk-merch` box for the deleted
// script to do anything at all.
const libFiles = () => {
  const out = [];
  const walk = (rel) => {
    for (const name of readdirSync(join(root, rel)).sort()) {
      const child = `${rel}/${name}`;
      if (statSync(join(root, child)).isDirectory()) walk(child);
      else out.push(child);
    }
  };
  walk('commons/lib');
  return out;
};

test('market.js no longer drives the dead print-on-demand box', () => {
  const src = marketJs();
  // The box, the element ids it wired, and the product-list call it made. Any one of these alone means the block is
  // back and is again talking to nothing.
  assert.ok(!src.includes('mk-merch'), 'commons/public/market.js still mentions mk-merch (the box no page renders)');
  assert.ok(!src.includes('/api/merch/products'), 'commons/public/market.js still fetches /api/merch/products (the maker panel reads /api/market/listings/:id/merch/panel instead)');
  assert.ok(!src.includes('#mf-go'), "commons/public/market.js still wires the old #mf-go mockup button");
});

test('no page under commons/lib renders the box the market script used to need', () => {
  const lib = libFiles();
  // Guard against a silent sweep: if the walk found nothing, the test would pass for the wrong reason.
  assert.ok(lib.length > 20, `expected to read many files under commons/lib, read ${lib.length}: ${lib.slice(0, 5).join(', ')}`);
  const hits = lib.filter((rel) => read(rel).includes('mk-merch'));
  assert.deepEqual(hits, [], `these page files render mk-merch; if the box comes back, the panel logic must come back with it, not market.js: ${hits.join(', ')}`);
  const page = read('commons/lib/marketpage.mjs');
  assert.ok(!page.includes('mk-merch'), 'commons/lib/marketpage.mjs references mk-merch');
});

test('the rest of market.js is still there (the deletion took the block, not the file)', () => {
  const src = marketJs();
  // Live work in this file, in the order a seller meets it: the listing form posts here, a section tile's Buy goes to
  // the listing, checkout opens in place, and "Send it again" on /label/sales actually sends it.
  for (const needed of ['/api/market/listings', 'data-buy', 'mk-checkout', "closest('[data-printer-send]')"]) {
    assert.ok(src.includes(needed), `commons/public/market.js lost ${needed}, which is not part of the dead block`);
  }
  // And the picker's conversations with the print partner are gone from this file: the product list, the mockup job,
  // and (round 71) the publish call. `merch` was `!id && form.dataset.mockup && $('#mf-on')?.checked`; after the box was
  // deleted nothing in the repo set `data-mockup` or rendered `#mf-on`, so the `/api/merch/listings` POST could never
  // run. It is deleted, so the ternary has one branch and this script can only ever create a market listing.
  assert.ok(!src.includes('/api/merch/products'), 'commons/public/market.js still asks for the product list');
  assert.ok(!src.includes('/api/merch/mockups'), 'commons/public/market.js still asks for mockups');
  assert.ok(!src.includes('/api/merch/listings'), 'commons/public/market.js still posts to the dead merch publish route');
  assert.ok(!src.includes('dataset.mockup'), 'commons/public/market.js still tests form.dataset.mockup, which nothing sets');
  assert.ok(!src.includes('mf-on'), 'commons/public/market.js still tests #mf-on, which no page renders');
});

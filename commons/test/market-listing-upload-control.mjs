// The listing form's picture upload is real, not decorative.
//
// Found by Geoffrey, 2026-11-23: the "List something" form carried an "Upload a new banner" file input
// (data-pg-upload, copy-pasted from the page editor) that market.js has no handler for. He picked his
// product's photo, nothing uploaded, no error — and the listing, having no picture of its own, showed his
// store's logo instead (marketpage.mjs's deliberate fallback from 2026-11-19). The product photo never
// existed anywhere.
//
// These are source-level assertions, on purpose: the upload control lives in browser JS that node cannot
// click. What they pin down is the contract between the two files —
//   1. the form offers exactly one file input, id="mk-imgup", and no data-pg-upload control
//      (pages.js, which handles data-pg-upload, is not loaded on /label/new; market.js is);
//   2. market.js wires #mk-imgup to POST /api/images and ticks the new image into name="images",
//      which the submit handler already sends (f.getAll('images'));
//   3. the new image lands in .mk-imglist, which the form renders even when the member has no uploads yet
//      (before, the empty state said to go upload from your profile page and come back).
//
// If someone replaces this control with something better, delete these assertions with it — but whatever
// replaces it must let a seller attach a product picture from the listing form itself.
//
// Run: node --test commons/test/market-listing-upload-control.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = (...p) => fs.readFileSync(path.join(import.meta.dirname, '..', ...p), 'utf8');

test('the listing form has one working upload control and no dead one', () => {
  const page = read('lib', 'marketpage.mjs');
  const formSrc = page.slice(page.indexOf('export function listingForm'), page.indexOf('/** The Storefront tab'));
  assert.ok(formSrc.length > 500, 'found the listingForm source');
  assert.match(formSrc, /id="mk-imgup"/, 'the form has the upload input market.js handles');
  assert.doesNotMatch(formSrc, /data-pg-upload/, 'no page-editor upload control (its handler never loads on /label/new)');
  assert.match(formSrc, /class="mk-imglist"/, 'the picture list exists even with no uploads, so a new upload has a place to land');
});

test('market.js actually handles the upload and ticks it into the listing', () => {
  const js = read('public', 'market.js');
  assert.match(js, /#mk-imgup/, 'market.js looks for the upload input');
  assert.match(js, /'\/api\/images',\s*'POST'/, 'the picked file is POSTed to /api/images');
  assert.match(js, /name="images"[^]*checked/, 'the uploaded image is inserted as a ticked images checkbox');
  assert.match(js, /getAll\('images'\)/, 'the submit handler sends the ticked images');
});

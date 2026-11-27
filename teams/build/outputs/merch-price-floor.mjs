// Candidate regression test for Round 74. Deliberately unplaced: the current
// market module is believed to lack an end-to-end provider-cost floor.
// This is a source-contract check, not an HTTP/runtime proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const read = (p) => readFile(path.join(root, p), 'utf8');

// The invariant is provider-aware: generic listing validation must reject a
// price below the current provider/selected-variant base before create/update
// can make the listing saleable. Keep this intentionally narrow; a comment or
// a check that only exists in merchsets.saveDraft does not satisfy it.
const hasProviderFloor = (source) =>
  /(?:base[_A-Z]?price|baseCost|providerBase|floor\s*\()/.test(source) &&
  /(?:price|amount)\s*(?:<|<=)|(?:<|<=)\s*(?:base|floor)/.test(source);

test('generic marketplace listing create/update enforce provider base floor', async () => {
  const market = await read('commons/lib/market.mjs');
  assert.ok(
    hasProviderFloor(market),
    'market.create/update must reject a price below the current provider base cost; draft-save alone is insufficient',
  );
});

test('Printful fulfillment link cannot bypass the listing price floor', async () => {
  const fulfillment = await read('commons/lib/fulfillment.mjs');
  assert.ok(
    hasProviderFloor(fulfillment),
    'fulfillment.link must validate the associated listing price against provider base cost',
  );
});

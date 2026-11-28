// Build round 81 candidate harness — initial checkpoint, implementation follows.
// Placement, if approved: commons/test/door-phone.mjs (Tier 2 test only).
// The completed harness boots an isolated Commons server and uses real Chromium.
import assert from 'node:assert/strict';
import test from 'node:test';

const VIEWPORTS = Object.freeze([
  { width: 320, height: 568 },
  { width: 390, height: 844 },
]);

// Replaced by the measured isolated-server/browser implementation in this session.
test('door phone harness checkpoint', { skip: 'implementation and evidence run in progress' }, () => {
  assert.equal(VIEWPORTS.length, 2);
});

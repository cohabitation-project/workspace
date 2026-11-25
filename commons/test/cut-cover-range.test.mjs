// Cut: the cover frame is pulled inside the trimmed range before export (Cut Claude, round 54).
// Found by reading cut.js (round 22), first hit by the round-21 browser run: clampTime() clamps the cover to the video
// duration, not to trimStart..trimEnd, and edit.mjs refuses a coverSec outside the trim with a 400. The scrubber starts at 0,
// so moving only the trim start (cover untouched) sent coverSec 0 with trim 1..3 -> 400.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { coverInRange, buildEdit, initCutEditor } from '../public/cut/cut.js';
import { editToTracks } from '../lib/cut/edit.mjs';

const cut = fs.readFileSync(new URL('../public/cut/cut.js', import.meta.url), 'utf8');

test('coverInRange keeps a cover inside the range and pulls an outside one to the nearest end', () => {
  assert.equal(coverInRange(2, 1, 3), 2);
  assert.equal(coverInRange(0, 1, 3), 1);
  assert.equal(coverInRange(9, 1, 3), 3);
  assert.equal(coverInRange(1, 1, 3), 1);
  assert.equal(coverInRange(3, 1, 3), 3);
});

test('coverInRange does not hide a broken range or a non-number from the server', () => {
  assert.ok(Number.isNaN(coverInRange('x', 1, 3)));
  assert.equal(coverInRange(0, 3, 1), 0);
  assert.equal(coverInRange(0, NaN, 3), 0, 'a broken trim leaves the cover as it was, for the server to name');
});

test('the untouched-cover case: trim 1..3 with cover 0 is refused raw, accepted after coverInRange', () => {
  const raw = buildEdit({ trimStart: 1, trimEnd: 3, coverSec: 0 });
  assert.throws(() => editToTracks(raw, { durationSec: 5 }), /coverSec 0 must lie inside the trimmed range/);
  const fixed = buildEdit({ trimStart: 1, trimEnd: 3, coverSec: coverInRange(0, 1, 3) });
  assert.equal(fixed.coverSec, 1);
  assert.doesNotThrow(() => editToTracks(fixed, { durationSec: 5 }));
});

test('the export click builds its edit through coverInRange', () => {
  assert.match(cut, /buildEdit\(\{ \.\.\.values, coverSec: coverInRange\(values\.coverSec, values\.trimStart, values\.trimEnd\) \}\)/);
});

// Round 29 (Cut Claude): after a trim change the visible cover scrubber must follow the trim, not just the value Export sends.
// Drives the shipped initCutEditor with a tiny fake DOM (initCutEditor takes a root with getElementById), the same file the page loads.
function fakeEl() {
  const l = {};
  return {
    value: '', dataset: {}, hidden: false, options: [], disabled: false, max: '', src: '',
    addEventListener(t, f) { (l[t] ||= []).push(f); },
    fire(t) { for (const f of l[t] || []) f({ preventDefault() {} }); },
    focus() {}, load() {},
  };
}
function bootEditor() {
  const els = {};
  const root = { getElementById: (id) => (els[id] ||= fakeEl()) };
  const saved = { fetch: globalThis.fetch };
  globalThis.fetch = () => Promise.reject(new Error('no network in this test'));
  try { initCutEditor(root); } finally { globalThis.fetch = saved.fetch; }
  return els;
}
function loadClip(els, seconds) {
  els['cut-preview'].duration = seconds;
  els['cut-preview'].fire('loadedmetadata');
}

test('trim 1..3 with the cover at 0: the scrubber itself shows 1 after the trim moves, not only the Export body', () => {
  const els = bootEditor();
  loadClip(els, 5);
  assert.equal(els['cover-scrub'].value, '0');
  els['trim-start'].value = '1'; els['trim-start'].fire('input');
  els['trim-end'].value = '3'; els['trim-end'].fire('input');
  assert.equal(els['cover-scrub'].value, '1');
});

test('a cover already inside the trim is left alone, and one beyond the trim end is pulled to it', () => {
  const els = bootEditor();
  loadClip(els, 5);
  els['cover-scrub'].value = '2';
  els['trim-start'].value = '1'; els['trim-start'].fire('input');
  els['trim-end'].value = '3'; els['trim-end'].fire('input');
  assert.equal(els['cover-scrub'].value, '2');
  els['trim-end'].value = '1.5'; els['trim-end'].fire('input');
  assert.equal(els['cover-scrub'].value, '1.5');
});

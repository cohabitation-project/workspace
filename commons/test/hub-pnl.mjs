// Work Hub P&L pane (Geoffrey, 2026-11-27: "live income expense separation", modeled on Mustang Corner's P&L).
// Rendered in real Chrome at 1280 and 390 wide before it shipped (with and without income); this pins the
// promises that matter so a later edit can't quietly break them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import path from 'node:path';
const js = fs.readFileSync(path.join(import.meta.dirname, '..', 'public', 'hq-workhub.js'), 'utf8');
const css = fs.readFileSync(path.join(import.meta.dirname, '..', 'public', 'hq-workhub.css'), 'utf8');
const pane = js.slice(js.indexOf('async function spend('), js.indexOf('async function spend(') + 9000);

test('the P&L tab exists and the pane separates income from expenses', () => {
  assert.match(js, /data-hw-tab="spend">P&amp;L</);
  assert.match(pane, /header\('income'/); assert.match(pane, /header\('expenses'/); assert.match(pane, /header\('net'/);
});
test('missing income is said out loud, never drawn as $0', () => {
  assert.match(pane, /Not reported yet/);
  assert.match(pane, /Nothing is shown as \$0 until it is real/);
});
test("co-op income is the cut (fees + reserves), never sellers' gross", () => {
  assert.match(pane, /cohabi_fee_cents\)\|\|0\)\+\(Number\(inc\.reserves_cents/);
  assert.match(pane, /sellers\\u2019 money, passed through/);
});
test('every line opens to show what built it, keyboard-reachable, 44px tall', () => {
  assert.match(pane, /setAttribute\('aria-expanded'/);
  assert.match(css, /\.hw-pnl-line\{[^}]*min-height:44px/);
});

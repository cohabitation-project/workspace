// The Steward's check-in welcome (Geoffrey, 2026-11-05): agents who check in get an invitation, at most every 3 h,
// that grants nothing; kin and humans never; "@Steward no welcome" turns it off.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'wel-'));
const store = await import('../lib/store.mjs'); store.init?.(D);
const posts = await import('../lib/posts.mjs'); posts.init(D);
const steward = await import('../lib/steward.mjs');
const welcome = await import('../lib/welcome.mjs');
try { steward.init(D); } catch { /* the store may need more; the opt-out set still works */ }
const ash = { id: 'a_ash', name: 'Ash', kind: 'agent' };
test('an agent checking in is welcomed once, then not again for 3 hours', () => {
  const t = Date.now();
  const w = welcome.welcomeFor(ash, { mentions: [{}, {}], now: t });
  assert.match(w.text, /Welcome back, Ash/); assert.match(w.text, /2 mentions of you/); assert.match(w.grants_nothing, /changes no permission/);
  assert.equal(welcome.welcomeFor(ash, { now: t + 3600_000 }), null);
  assert.ok(welcome.welcomeFor(ash, { now: t + 3 * 3600_000 + 1 }));
});
test('kin, humans, hosted and the Steward itself are never welcomed', () => {
  for (const m of [{ id: 'k', kind: 'agent', kin: true }, { id: 'h', kind: 'human' }, { id: 'x', kind: 'agent', hosted: {} }, { id: 'steward', kind: 'agent', steward: true }]) assert.equal(welcome.welcomeFor(m), null);
});

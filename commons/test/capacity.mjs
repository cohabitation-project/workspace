import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'cap-'));
process.env.CAP_DISK_PCT = '0'; // force the disk warning
const store = await import('../lib/store.mjs'); store.init(D);
const cap = await import('../lib/capacity.mjs');
test('measures, warns past a limit, and only once a day', () => {
  const m = cap.measure(); assert.ok(m.disk_pct >= 0 && m.mem_free_mb > 0 && m.members >= 0);
  assert.equal(cap.LIMITS.diskPct, 0);
  const a = cap.check(1_000_000); assert.ok(a.warned.includes('disk'));
  const b = cap.check(1_000_000 + 3600_000); assert.ok(!b.warned.includes('disk'), 'not again within a day');
  const c = cap.check(1_000_000 + 25 * 3600_000); assert.ok(c.warned.includes('disk'), 'again the next day');
});

test('memory warns only after it stays low, never on a brief dip or right after a start', () => {
  const T0 = 50_000_000;
  cap._reset({ boot: T0 });
  const low = cap.LIMITS.memFreeMB - 300, high = cap.LIMITS.memFreeMB + 1500;
  cap.sampleMemory(low);
  assert.equal(cap.memoryLowSustained(T0 + 30 * 60_000), false, 'one dip (a deploy) is not enough');
  cap.sampleMemory(high); cap.sampleMemory(low); cap.sampleMemory(low);
  assert.equal(cap.memoryLowSustained(T0 + 30 * 60_000), false, 'a recovery in the window resets it');
  cap.sampleMemory(low);
  assert.equal(cap.memoryLowSustained(T0 + 5 * 60_000), false, 'not in the first ten minutes after a start');
  assert.equal(cap.memoryLowSustained(T0 + 30 * 60_000), true, 'fifteen minutes low: warn');
  assert.ok(cap.check(T0 + 30 * 60_000).warned.includes('mem'));
  assert.ok(!cap.check(T0 + 31 * 60_000).warned.includes('mem'), 'once a day, as before');
});

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

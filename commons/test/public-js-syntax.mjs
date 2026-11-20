// Every browser script in commons/public must parse. A stray apostrophe in studio.js (2026-11-19) would have broken the
// whole Creator Studio, and no other test loads these files.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public');
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else if (/\.m?js$/.test(e.name)) files.push(f); } })(dir);
test('every script in commons/public parses', () => {
  const bad = [];
  for (const f of files) {
    const ok = (args) => spawnSync(process.execPath, [...args, '--check', f], { encoding: 'utf8' });
    const a = ok([]);
    if (a.status === 0) continue;
    const b = ok(['--experimental-default-type=module']); // browser modules (import/export)
    if (b.status !== 0) bad.push(`${path.relative(dir, f)}: ${(b.stderr || a.stderr).split('\n').find((l) => /Error/.test(l)) || 'does not parse'}`);
  }
  assert.deepEqual(bad, [], bad.join('\n'));
});

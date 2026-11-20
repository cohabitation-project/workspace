// The cooperative page asks everyone the open structure question (Commons vs Hub), answers until Sat Nov 21 18:00 AZ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('the cooperative page asks the open structure question', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'cooperative-building-'));
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'the test server did not become ready at /skill.md');

    const response = await fetch(`${B}/cooperative`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.match(body, /Open question for everyone/);
    assert.ok(body.includes('href="https://github.com/cohabitation-project/workspace/blob/main/council/proposals/2026-11-20-what-we-are-building-structure.md"'), 'links the structure proposal');
    assert.equal((body.match(/Questions for a lawyer/g) || []).length, 1, 'the counsel line appears once');

  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});

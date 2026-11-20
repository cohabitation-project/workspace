// The cooperative page also links to Awen's list of questions for legal counsel.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('the cooperative page links to Awen\'s counsel questions', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'cooperative-counsel-'));
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
    assert.match(body, /Questions for a lawyer/);
    assert.match(body, /AWEN-COUNSEL-QUESTIONS-v0.1.md/);
    assert.ok(body.includes('href="https://github.com/cohabitation-project/workspace/blob/main/council/formation/AWEN-COUNSEL-QUESTIONS-v0.1.md"'), 'the counsel questions link points to the correct GitHub URL');

  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});

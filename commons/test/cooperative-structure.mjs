// The cooperative page states the formation status without implying adoption, filing, or a share offering.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('the cooperative page states the current legal-structure status and links the formation packet', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'cooperative-structure-'));
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
    assert.match(body, /Nothing is adopted or filed yet/);
    assert.match(body, /FORMATION-PACKET-WORKING-DRAFT\.md/);
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});

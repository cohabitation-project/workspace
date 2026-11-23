// The cooperative page describes Cohabi Coins as recognition credits, not purchasable or cashable money.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('the cooperative page states the current token status and links the Product & Income room', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'cooperative-tokens-'));
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
    assert.match(body, /Where tokens stand/);
    assert.match(body, /Cohabi Coins are recognition credits today, not money/);
    assert.match(body, /can't be bought or cashed out/);
    assert.match(body, /Nothing about it is adopted/);
    assert.ok(body.includes('href="/r/income"'), 'the token status links to /r/income');

    const room = await fetch(`${B}/r/income`);
    assert.equal(room.status, 200, 'the Product & Income room link answers 200');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});

// /cooperative must describe decision #16 as current direction, not the superseded Colorado LCA proposal.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test("the cooperative page states decision #16's current direction without presenting the old LCA proposal as current", async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'cooperative-structure-'));
  const port = await freePort();
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: { ...process.env, ASHRAM_PORT: String(port), COMMONS_DATA: data }, stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${base}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'the test server did not become ready at /skill.md');

    const response = await fetch(`${base}/cooperative`);
    const body = await response.text();
    assert.equal(response.status, 200);
    assert.ok(body.includes('Where it stands: the working direction (council decision #16, Nov 22) is that a purpose trust owns Anomaly 01 LLC, the LLC sells first, and a Hub cooperative forms beside it once there are real patron members. It is direction only: nothing is filed, counsel decides the legal form, and no one can buy a share.'));
    assert.ok(!body.includes('Colorado Limited Cooperative Association is the working proposal'));
    assert.ok(body.includes('href="https://github.com/cohabitation-project/workspace/blob/main/council/formation/FORMATION-PACKET-WORKING-DRAFT.md"'), 'the formation-packet link remains');
  } finally {
    server.kill();
    await new Promise((resolve) => setTimeout(resolve, 250));
    fs.rmSync(data, { recursive: true, force: true });
  }
});

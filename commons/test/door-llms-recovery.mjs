// Door follow-up (review F1): /llms.txt no longer promises a recovery code "always" works.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('/llms.txt says a recovery code is single-use and names the General Hall for a lost one', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-llms-recovery-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ }
      await new Promise((s) => setTimeout(s, 250));
    }
    assert.ok(ready, 'the isolated Commons server started');
    const r = await fetch(`${B}/llms.txt`);
    assert.equal(r.status, 200);
    const body = await r.text();
    assert.ok(!body.includes('always return'), 'no promise that the code always works');
    assert.ok(body.includes('single-use'), 'says the code is single-use');
    assert.ok(body.includes('/room/general'), 'names the General Hall for a lost code');
    assert.ok(body.includes('rejoin tool'), 'still points at the rejoin tool');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

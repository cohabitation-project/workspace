// Door follow-up: /rejoin's no-code help gives real, working addresses.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('/rejoin links no-code help to the General Hall and people page, and both work', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-rejoin-help-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ }
      await new Promise((s) => setTimeout(s, 250));
    }
    assert.ok(ready, 'the isolated Commons server started');
    const r = await fetch(`${B}/rejoin`);
    assert.equal(r.status, 200);
    const body = await r.text();
    assert.ok(body.includes('/room/general'), 'help names the General Hall address');
    assert.ok(body.includes('/members'), 'help names the people-page address');
    for (const route of ['/room/general', '/members']) {
      const linked = await fetch(`${B}${route}`);
      assert.equal(linked.status, 200, `${route} answers 200`);
    }
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

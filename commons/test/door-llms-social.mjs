// Door follow-up: /llms.txt must send agents to /social for posts; /feed is the video feed since 2026-11-15.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('/llms.txt names /social as the social side, not /feed', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-llms-social-'));
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
    assert.ok(body.includes('/social is the social side'), 'says /social is the social side');
    assert.ok(!/\/feed is the social side/.test(body), 'no longer says /feed is the social side');
    assert.ok(body.includes('/feed is the video feed'), 'says /feed is the video feed');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

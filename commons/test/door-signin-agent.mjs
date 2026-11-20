// Door follow-up: a signed-out human can find their locked-out agent's way back.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('/signin links a locked-out agent to /connect and /rejoin, and both pages work', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-signin-agent-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ }
      await new Promise((s) => setTimeout(s, 250));
    }
    assert.ok(ready, 'the isolated Commons server started');
    const r = await fetch(`${B}/signin`);
    assert.equal(r.status, 200);
    const html = await r.text();
    assert.ok(html.includes('Is your AI agent locked out?'));
    assert.ok(html.includes('href="/connect"'));
    assert.ok(html.includes('href="/rejoin"'));
    for (const route of ['/connect', '/rejoin']) {
      const linked = await fetch(`${B}${route}`);
      assert.equal(linked.status, 200, `${route} answers 200`);
    }
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

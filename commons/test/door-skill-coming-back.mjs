// Door follow-up (review F4): /skill.md has a "Coming back" section for agents whose chat forgot them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('/skill.md ends with a "Coming back" section: connector, rejoin, rotate_recovery, General Hall', async () => {
  const { spawn } = await import('node:child_process');
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-skill-coming-back-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ }
      await new Promise((s) => setTimeout(s, 250));
    }
    assert.ok(ready, 'the isolated Commons server started');
    const r = await fetch(`${B}/skill.md`);
    assert.equal(r.status, 200);
    const body = await r.text();
    assert.ok(body.includes('## 4. Coming back'), 'has the section heading');
    assert.ok(body.includes('/mcp/connect'), 'names the connector');
    assert.ok(body.includes('/rejoin'), 'names the rejoin page');
    assert.ok(body.includes('rotate_recovery'), 'names rotate_recovery');
    assert.ok(body.includes('/room/general'), 'names the General Hall for a lost code');
    const rules = body.indexOf('## 3. The ground rules');
    const back = body.indexOf('## 4. Coming back');
    const more = body.indexOf('More detail, if you want it');
    assert.ok(rules >= 0 && rules < back && back < more, 'sits between the ground rules and the detail line');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

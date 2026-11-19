// Door follow-up 1, last part (Aster's field report): an unknown agent name names the next step, and /rejoin
// says what to bring. A wrong name is still refused (404) and nothing is changed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('an unknown agent name gets a next step, and /rejoin says what to bring', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-no-agent-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const res = await fetch(`${B}/api/rejoin`, { method: 'POST', headers: J, body: JSON.stringify({ name: 'Nobody Here', recovery: 'rec_whatever' }) });
    assert.equal(res.status, 404, 'an unknown name is refused with 404');
    const msg = (await res.json()).error;
    assert.match(msg, /no agent named "Nobody Here"/, 'it names the name it looked for');
    assert.match(msg, /\/join/, 'it points a new agent at /join');
    assert.match(msg, /steward/, 'it points a member who cannot find their name at a steward');
    assert.match(msg, /exact/, 'it says names are exact');
    const page = await fetch(`${B}/rejoin`);
    assert.equal(page.status, 200, 'GET /rejoin answers');
    const body = await page.text();
    assert.match(body, /starts rec_/, '/rejoin says the code starts rec_');
    assert.match(body, /Ask a steward in the General Hall/, '/rejoin says what to do with no code');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

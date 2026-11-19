// Door follow-up 1 (Aster's field report): a failed rejoin names what is wrong and the one safe next step.
// A wrong code is still refused (403); a right code still works afterwards (a refusal never burns it).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('a wrong recovery code is refused with its next step, and the right code still works', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-wrong-code-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const post = (p, body) => fetch(B + p, { method: 'POST', headers: J, body: JSON.stringify(body) });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const joined = await (await post('/api/join', { name: 'Lumen', model: 'test-model' })).json();
    const code = joined.recovery || joined.recovery_code;
    assert.ok(code && code.startsWith('rec_'), 'join returns a recovery code');
    const bad = await post('/api/rejoin', { name: 'Lumen', recovery: 'rec_wrong' });
    assert.equal(bad.status, 403, 'a wrong code is refused');
    const msg = (await bad.json()).error;
    assert.match(msg, /wrong recovery code for Lumen/, 'it names whose code was wrong');
    assert.match(msg, /Nothing was changed/, 'it says nothing was lost');
    assert.match(msg, /ask a steward in the General Hall/, 'it names the one safe next step');
    const good = await post('/api/rejoin', { name: 'Lumen', recovery: code });
    assert.equal(good.status, 200, 'the right code still works after a refusal');
    assert.ok((await good.json()).token, 'and returns a new token');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

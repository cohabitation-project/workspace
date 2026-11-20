// The link-only rejoin confirmation is single-use, and a reused or unknown link says how to start again.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('a rejoin confirm link works once and reused or unknown links name the next step', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-rejoin-confirm-once-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const post = (p, body, headers = {}) => fetch(B + p, { method: 'POST', headers: { ...J, ...headers }, body: JSON.stringify(body) });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const joined = await (await post('/api/join', { name: 'Lumen', model: 'test-model' })).json();
    const code = joined.recovery || joined.recovery_code;
    assert.ok(code && code.startsWith('rec_'), 'join returns a recovery code');

    const check = await fetch(`${B}/rejoin?name=Lumen&recovery=${encodeURIComponent(code)}`);
    assert.equal(check.status, 200, 'the check step accepts the right code');
    const checkText = await check.text();
    const confirmPath = checkText.match(/\/rejoin\/confirm\?n=[A-Za-z0-9_-]+/)?.[0];
    assert.ok(confirmPath, 'the check step contains a confirm link');

    const first = await fetch(B + confirmPath);
    assert.equal(first.status, 201, 'the first confirm opening completes the rejoin');
    const firstBody = await first.json();
    assert.ok(firstBody.token, 'the first opening returns a new token');

    const second = await fetch(B + confirmPath);
    assert.ok(second.status >= 400 && second.status < 500, `opening the same confirm link again is refused (got ${second.status})`);
    const secondText = await second.text();
    assert.match(secondText, /Open the rejoin link with your code again/, 'the refusal tells the agent to open the rejoin link with its code again');

    const unknown = await fetch(`${B}/rejoin/confirm?n=notarealnonce`);
    assert.ok(unknown.status >= 400 && unknown.status < 500, `an unknown confirm nonce is refused (got ${unknown.status})`);
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

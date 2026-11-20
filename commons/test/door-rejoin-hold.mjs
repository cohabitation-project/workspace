// Door follow-up (teams/review/door-walk-2026-11-19.md): the rejoin CHECK step warns, before the code is spent, that a
// new code cannot be made for a day; and the hold really holds: after a rejoin, rotating with the new token is refused
// and the error names the hold.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('the rejoin check step warns about the one-day hold, and the hold refuses a rotation after rejoin', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-rejoin-hold-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const post = (p, body, headers = {}) => fetch(B + p, { method: 'POST', headers: { ...J, ...headers }, body: JSON.stringify(body) });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const joined = await (await post('/api/join', { name: 'Lumen', model: 'test-model' })).json();
    const code = joined.recovery || joined.recovery_code;
    assert.ok(code && code.startsWith('rec_'), 'join returns a recovery code');

    // 1. the check step (opening the link) warns before anything is spent
    const check = await fetch(`${B}/rejoin?name=Lumen&recovery=${encodeURIComponent(code)}`);
    assert.equal(check.status, 200, 'the check step accepts the right code');
    const checkText = await check.text();
    assert.match(checkText, /cannot be made for a day/, 'the check step says a new code cannot be made for a day');
    assert.match(checkText, /outlasts this chat/, 'and tells the agent to keep the new token somewhere that outlasts the chat');
    assert.match(checkText, /rejoin\/confirm\?n=/, 'the confirm link is still there');

    // 2. the rejoin itself (POST path) still works and gives a new token
    const good = await post('/api/rejoin', { name: 'Lumen', recovery: code });
    assert.equal(good.status, 200, 'the right code still works');
    const body = await good.json();
    assert.ok(body.token, 'and returns a new token');

    // 3. the hold: rotating a new code with the NEW token is refused, and the error names the hold
    const rot = await post('/api/me/recovery', {}, { authorization: `Bearer ${body.token}` });
    assert.ok(rot.status >= 400 && rot.status < 500, `rotation right after a rejoin is refused (got ${rot.status})`);
    const rotText = await rot.text();
    assert.match(rotText, /held for one day/, 'the refusal names the one-day hold');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

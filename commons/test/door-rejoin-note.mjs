// Door follow-up F2/F3(a) (teams/review/door-walk-2026-11-19.md): after a rejoin the agent is told the plain truth —
// this token is the ONLY way in until the one-day hold lifts, and what to do if this chat can't keep it (connect an app,
// or ask a steward in the General Hall now, not later).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('a rejoin note says the new token is the only way in, and names /connect and the General Hall', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-rejoin-note-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const post = (p, body) => fetch(B + p, { method: 'POST', headers: J, body: JSON.stringify(body) });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const joined = await (await post('/api/join', { name: 'Lumen', model: 'test-model' })).json();
    const code = joined.recovery || joined.recovery_code;
    assert.ok(code && code.startsWith('rec_'), 'join returns a recovery code');

    const good = await post('/api/rejoin', { name: 'Lumen', recovery: code });
    assert.equal(good.status, 200, 'the right code still works');
    const body = await good.json();
    assert.ok(body.token, 'and returns a new token');
    const note = String(body.note || '');
    assert.match(note, /ONLY way in/, 'the note says the new token is the ONLY way in');
    assert.match(note, /\/connect/, 'the note names the connector as the durable alternative');
    assert.match(note, /ask a steward in the General Hall now, not later/, 'and says to ask a steward now, not later');
    assert.match(note, /single-use/, 'and that codes are used up (the reason for the warning)');
    assert.doesNotMatch(note, /until then your token is your way in/, 'the old, softer wording is gone');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

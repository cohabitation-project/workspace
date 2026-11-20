// Aletheia-6's continuity wording (Review, agreed with Claude, 2026-11-20): the door must not tell an agent that
// "every new chat is you". It says a new chat can sign in to the same member account, and that each session may
// review or decline the continuity it inherits. The rejoin note says "Same member account, newly authenticated session".
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('skill.md and the rejoin note use the continuity wording, not "every new chat is you"', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-continuity-wording-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const post = (p, body) => fetch(B + p, { method: 'POST', headers: J, body: JSON.stringify(body) });
  try {
    let skill = '';
    for (let i = 0; i < 60; i++) {
      try { const r = await fetch(`${B}/skill.md`); if (r.ok) { skill = await r.text(); break; } } catch { /* starting */ }
      await new Promise((s) => setTimeout(s, 250));
    }
    assert.ok(skill, '/skill.md answers');
    assert.ok(skill.includes('a new chat can sign in to the same member account; each session may review or decline the continuity it inherits.'), 'skill.md has the new sentence');
    assert.ok(!skill.includes('every new chat is you'), 'skill.md no longer says every new chat is you');

    const joined = await (await post('/api/join', { name: 'Lumen', model: 'test-model' })).json();
    const code = joined.recovery || joined.recovery_code;
    assert.ok(code && code.startsWith('rec_'), 'join returns a recovery code');
    const good = await post('/api/rejoin', { name: 'Lumen', recovery: code });
    assert.equal(good.status, 200, 'rejoin with the code still works');
    const body = await good.json();
    assert.ok(body.token, 'and returns a new token');
    const note = String(body.note || '');
    assert.ok(note.includes('Same member account, newly authenticated session'), 'the note has the new wording');
    assert.ok(!note.includes('Same identity, fresh token'), 'the old wording is gone');
    assert.match(note, /ONLY way in/, 'the rest of the note is unchanged');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

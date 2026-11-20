// Door review F2 + F3(a) (teams/review/door-walk-2026-11-19.md): the rejoin by link says, at the moment it matters,
// that the code is used up, a new one is held for a day, and the new token is the only way in until then.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('rejoin by link warns about the one-day window and names the safe next steps', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-rejoin-window-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const joined = await (await fetch(B + '/api/join', { method: 'POST', headers: J, body: JSON.stringify({ name: 'Ember', model: 'test-model' }) })).json();
    const code = joined.recovery || joined.recovery_code;
    assert.ok(code && code.startsWith('rec_'), 'join returns a recovery code');

    // step 1: the code is checked, nothing is spent; the reply already warns about the window
    const checked = await fetch(`${B}/rejoin?name=Ember&recovery=${encodeURIComponent(code)}`);
    assert.equal(checked.status, 200);
    const first = await checked.json();
    assert.match(first.next, /cannot be made for a day/, 'the first reply names the one-day hold');
    assert.match(first.next, /outlasts this chat/, 'and says to keep the token beyond this chat');
    const link = first.next.match(/(http\S*\/rejoin\/confirm\?n=\S+)/)[1];

    // step 2: the confirm reply carries the token and the way out of the window
    const done = await fetch(link);
    assert.equal(done.status, 201);
    const r = await done.json();
    assert.ok(r.token, 'a new token is returned');
    assert.match(r.how_to_talk, /only way in/, 'the token is named as the only way in for now');
    assert.match(r.how_to_talk, /\/connect/, 'it points at the connector page');
    assert.match(r.how_to_talk, /\/room\/general/, 'and at a steward in the General Hall');
    assert.match(r.how_to_talk, /now, not later/);
    assert.match(r.note, /USED UP/, 'the core note still says the code is used up');

    // F2: the stale docstring is gone
    const core = fs.readFileSync(path.join(import.meta.dirname, '..', 'lib', 'core.mjs'), 'utf8');
    assert.ok(!core.includes('keeps the recovery code stable'), 'rejoinAgent docstring no longer claims the code stays stable');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

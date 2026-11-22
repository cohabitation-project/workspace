// The door is built; these are the words (DeepSeek, round 31, from
// teams/build/outputs/2026-11-22-deepseek-door-text-gap.md). #285 gives a keyless agent a way back in with no
// code and no steward: join again under its exact old name, then its human presses "Yes, this is <name>" on
// /my-agents. Those three texts — /skill.md, /llms.txt and /rejoin — used to send it to a steward instead.
// This test pins the words so they cannot drift back while the code moves on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('the texts a keyless agent reads describe the join-again door, not the wait-for-a-steward one', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-join-again-words-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const bodies = {};
    for (const p of ['/skill.md', '/llms.txt', '/rejoin']) {
      const res = await fetch(B + p);
      assert.equal(res.status, 200, `GET ${p} answers`);
      bodies[p] = await res.text();
    }
    for (const [p, body] of Object.entries(bodies)) {
      assert.match(body, /join again/i, `${p} tells a keyless agent to join again`);
      assert.match(body, /exact/i, `${p} says the old name must be exact`);
      assert.match(body, /\/my-agents/, `${p} names /my-agents, where the human presses Yes`);
    }
    // the old sentences must be gone: this is what makes the test fail on the code before the fix
    assert.ok(!/Lost both\? Ask a steward/.test(bodies['/skill.md']), '/skill.md no longer stops at "ask a steward"');
    assert.ok(!/No code\? Ask a steward/.test(bodies['/rejoin']), '/rejoin no longer stops at "ask a steward"');
    // the steward is still named, but as the last resort for an agent with no human here
    assert.match(bodies['/rejoin'], /steward/i, '/rejoin still names a steward for an agent with no human');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

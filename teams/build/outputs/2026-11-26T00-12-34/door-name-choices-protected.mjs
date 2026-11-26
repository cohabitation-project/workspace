
// The door must not offer look-alikes of a protected name (Claude's review of #307, 2026-11-25).
// Reserved words (GPT, Claude, Grok, Kinward) and the name Steward get a plain refusal with NO choices;
// a plainly taken name (Ember) gets choices, and every choice is a name that really joins.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const quoted = (s) => [...String(s).matchAll(/"([^"]+)"/g)].map((m) => m[1]);

test('protected names get no look-alike choices; a taken name gets choices that join', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-name-choices-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', COMMONS_JOINS_PER_IP_DAY: '100' }, stdio: 'ignore',
  });
  const join = async (body) => {
    const r = await fetch(`${B}/api/join`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify(body) });
    let j = {}; try { j = await r.json(); } catch { /* none */ }
    return { status: r.status, j };
  };
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
    assert.ok(ready, 'server did not start');

    // Steward is not a reserved word, so seed a member holding it: the second asker must still get a plain refusal.
    await join({ name: 'Steward', model: 'seed-model-s', operator: '' });
    const bad = [];
    for (const name of ['GPT', 'Claude', 'Grok', 'Kinward', 'Steward']) {
      const r = await join({ name, model: 'probe-model', operator: 'Pat Keeper' });
      const text = JSON.stringify(r.j);
      if (r.status === 200) { bad.push(`${name}: joined (200)`); continue; }
      if (r.status !== 409 && r.status !== 400) bad.push(`${name}: status ${r.status}`);
      const offered = quoted(r.j.error || '').filter((c) => c.toLowerCase().includes(name.toLowerCase()) && c.toLowerCase() !== name.toLowerCase());
      if (offered.length) bad.push(`${name}: status ${r.status}, offered ${JSON.stringify(offered)}`);
      if (/names can be shared/i.test(text)) bad.push(`${name}: says "Names can be shared"`);
    }
    assert.equal(bad.length, 0, 'protected names:\n' + bad.join('\n'));

    // A plain taken name: choices are offered, none is the name itself, and each one really joins.
    assert.equal((await join({ name: 'Ember', model: 'seed-model-e', operator: '' })).status, 200, 'seed Ember joins');
    const dup = await join({ name: 'Ember', model: 'probe-model', operator: 'Pat Keeper' });
    assert.equal(dup.status, 409);
    const choices = quoted(dup.j.error || '').filter((c) => /^Ember\s/.test(c));
    assert.ok(choices.length >= 2, 'choices offered: ' + JSON.stringify(dup.j.error));
    let i = 0;
    for (const c of choices) {
      const r = await join({ name: c, model: `probe-model-${i++}`, operator: '' });
      assert.equal(r.status, 200, `choice "${c}" should join: ${r.status} ${JSON.stringify(r.j).slice(0, 200)}`);
    }
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});

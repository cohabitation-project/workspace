// The door must not offer look-alikes of a protected name (Claude's review of #307, 2026-11-25), and "Steward" is reserved.
// Reserved words (GPT, Claude, Grok, Kinward) and the name Steward get a plain refusal with NO choices;
// a plainly taken name (Ember) gets choices, and every choice is a name that really joins.
// Round 61: the second test is server-free and red on main b0c4a61 until 'steward' is in RESERVED (identity.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';
import { isReserved, validateName } from '../lib/identity.mjs';

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

    // Fresh data dir: no seed. The Steward member is created at boot (steward.init), so "Steward" is already held here.
    const bad = [];
    for (const name of ['GPT', 'Claude', 'Grok', 'Kinward', 'Steward', 'steward ', 'STEWARD']) {
      const r = await join({ name, model: 'probe-model', operator: 'Pat Keeper' });
      const text = JSON.stringify(r.j);
      if (r.status === 200) { bad.push(`${name}: joined (200)`); continue; }
      if (r.status !== 409 && r.status !== 400) bad.push(`${name}: status ${r.status}`);
      const offered = quoted(r.j.error || '').filter((c) => c.toLowerCase().includes(name.trim().toLowerCase()) && c.toLowerCase() !== name.trim().toLowerCase());
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

// "Steward" is created by steward.seedMember (store.addMember), never through validateName, so it must be reserved by
// name. Server-free, so it does not depend on boot order or on the seed having run.
test('"Steward" is a reserved name in every spelling, with no data and no booted server', () => {
  for (const n of ['Steward', 'steward ', 'STEWARD', ' Steward', 'Stewárd', 'Ѕteward']) {
    assert.equal(isReserved(n), true, `isReserved(${JSON.stringify(n)})`);
    const v = validateName(n, { taken: () => false });
    assert.equal(v.status, 409, `validateName(${JSON.stringify(n)}) -> ${JSON.stringify(v)}`);
  }
  assert.equal(isReserved('Stewardess Ann'), false, 'only the name itself is reserved, not every word that starts with it');
});

// PR #307 (names-choose-not-stack), protected names: an agent that arrives as GPT, Claude or Steward is refused, and
// the refusal must not hand it a look-alike ("Claude Star", "Steward P"). A plain taken name ("Ember") still gets
// choices, and every choice is a name the door would accept. Written by Claude (round 60) from the review of #307.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';
import { validateName } from '../lib/identity.mjs';

test('protected names get a refusal with no look-alike choices; a plain taken name gets choices that all pass', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-name-protected-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', COMMONS_JOINS_PER_IP_DAY: '100' }, stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const post = async (p, body) => { const r = await fetch(B + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify(body || {}) }); return { r, j: await r.json().catch(() => ({})) }; };
  try {
    let ready = false;
    for (let i = 0; i < 80 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
    assert.ok(ready, 'server started');

    for (const name of ['GPT', 'Claude', 'Steward']) {
      for (const operator of [undefined, 'Pat Keeper']) {
        const { r, j } = await post('/api/join', { name, model: 'test-model', ...(operator ? { operator } : {}) });
        const lookalikes = (j.choices || []).filter((c) => new RegExp(`^${name}\\b`, 'i').test(c));
        assert.equal(lookalikes.length, 0, `${name}${operator ? ' (with a human named)' : ''}: status ${r.status}, choices ${JSON.stringify(j.choices)} must not contain the protected name`);
        assert.notEqual(r.status, 200, `${name} is not let in under the protected name (status ${r.status}: ${JSON.stringify(j).slice(0, 200)})`);
        assert.ok(!j.token, `${name} gets no token`);
      }
    }

    // A plain taken name: choices are offered, nothing is created, and each choice would pass the name check.
    const first = await post('/api/join', { name: 'Ember', model: 'test-model' });
    assert.equal(first.r.status, 200, JSON.stringify(first.j));
    const taken = await post('/api/join', { name: 'Ember', model: 'newcomer', operator: 'Pat Keeper' });
    assert.equal(taken.r.status, 409);
    assert.equal(taken.j.name_taken, 'Ember');
    assert.ok(Array.isArray(taken.j.choices) && taken.j.choices.length >= 3, `choices: ${JSON.stringify(taken.j.choices)}`);
    for (const c of taken.j.choices) {
      const v = validateName(c, { taken: (k) => k === validateName('Ember').name?.toLowerCase() });
      assert.ok(v.name, `choice "${c}" passes the name check: ${v.error || ''}`);
      assert.notEqual(c.toLowerCase(), 'ember', 'a choice is never the taken name itself');
    }
    const pick = await post('/api/join', { name: taken.j.choices[0], model: 'newcomer', operator: 'Pat Keeper' });
    assert.equal(pick.r.status, 200, `the first choice is accepted: ${JSON.stringify(pick.j).slice(0, 200)}`);
  } finally { srv.kill(); }
});

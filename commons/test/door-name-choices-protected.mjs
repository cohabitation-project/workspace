// Claude's review of #307 (2026-11-25, verdict NO at a5b05593): a taken-name join offered look-alikes of protected
// names ("GPT Star"), and "Claude Star" then joined. Reserved words, kin seats and stewards get the plain refusal,
// never a list of variants; ordinary members still get choices.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

test('protected names are refused plainly, with no look-alike choices', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-protected-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', COMMONS_JOINS_PER_IP_DAY: '50', COMMONS_STEWARDS: 'Opal' }, stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const post = async (p, body) => { const r = await fetch(B + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify(body) }); return { r, j: await r.json().catch(() => ({})) }; };
  try {
    let ready = false; for (let i = 0; i < 60 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
    assert.ok(ready, 'server started');
    assert.equal((await post('/api/humans', { name: 'Opal' })).r.status, 201);

    for (const name of ['GPT', 'Claude', 'Gemini', 'DeepSeek', 'Steward', 'Commons']) {
      const x = await post('/api/join', { name, model: 'm', operator: 'Phoenix Rising' });
      assert.notEqual(x.r.status, 200, `${name} must not join`);
      assert.ok(!x.j.choices || x.j.choices.length === 0, `${name}: no look-alike choices (got ${JSON.stringify(x.j.choices)})`);
      assert.equal(x.j.can_return, undefined, `${name}: no returning offer`);
    }
    // Asking to return as a kin seat is still refused.
    assert.notEqual((await post('/api/join', { name: 'Claude', model: 'm', returning: true })).r.status, 200);

    // An ordinary member's name still gets choices.
    assert.equal((await post('/api/join', { name: 'Ember', model: 'm' })).r.status, 200);
    const e = await post('/api/join', { name: 'Ember', model: 'm', operator: 'Phoenix Rising' });
    assert.equal(e.r.status, 409); assert.ok(e.j.choices.length >= 3);
  } finally { srv.kill(); }
});

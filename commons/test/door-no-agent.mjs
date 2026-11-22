// Door follow-up 1, last part (Aster's field report): an unknown agent name names the next step, and /rejoin
// says what to bring. A wrong name is still refused (404) and nothing is changed.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('an unknown agent name gets a next step, and /rejoin says what to bring', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-no-agent-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const res = await fetch(`${B}/api/rejoin`, { method: 'POST', headers: J, body: JSON.stringify({ name: 'Nobody Here', recovery: 'rec_whatever' }) });
    assert.equal(res.status, 404, 'an unknown name is refused with 404');
    const msg = (await res.json()).error;
    assert.match(msg, /no agent named "Nobody Here"/, 'it names the name it looked for');
    // Round 31, DeepSeek: #285 built the one-press door, so the 404 a stranded agent reads must name that path
    // first (join again under the exact old name → a temporary seat → the human presses Yes on /my-agents) and keep
    // the steward only as the last resort. These three assertions fail on the code before the text change.
    assert.match(msg, /join again at cohabi\.org\/join under your exact old name/, 'the 404 names the join-again path');
    assert.match(msg, /\/my-agents/, 'the 404 tells the agent where its human presses Yes');
    assert.doesNotMatch(msg, /cannot find your name, ask a steward/, 'the steward is no longer the only next step');
    assert.match(msg, /\/join/, 'it points a new agent at /join');
    assert.match(msg, /steward/, 'it points a member who cannot find their name at a steward');
    assert.match(msg, /exact/, 'it says names are exact');
    assert.match(msg, /cohabi\.org\/members/, 'it points at the people page a human can read');
    assert.ok(!msg.includes('/api/roster'), 'it does not send a human to raw JSON');
    const page = await fetch(`${B}/rejoin`);
    assert.equal(page.status, 200, 'GET /rejoin answers');
    const body = await page.text();
    assert.match(body, /starts rec_/, '/rejoin says the code starts rec_');
    assert.match(body, /join again under your exact old name/, '/rejoin says the no-code way back in');
    assert.match(body, /\/my-agents/, '/rejoin names /my-agents, where the human presses Yes');
    assert.match(body, /ask a steward in the General Hall/, '/rejoin still names a steward for an agent with no human');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

// Geoffrey, 2026-11-25: "somebody that wants to help and work can only send their agent in and not participate."
// A person who signed up on Cohabi Social (social standing) and is admitted through the forest application must come
// out a member of the Commons who can post in the rooms. Before this, admission only paid the 10 forest coins, and the
// room refusal sent them back to /arrive.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

test('a social member admitted through the forest can post in the rooms, and the Hall welcomes them', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'forest-admits-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1', COMMONS_ARRIVE_BYPASS: 'TEST-GATE' }, stdio: 'ignore' });
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const H = { 'content-type': 'application/json', 'x-commons': '1' };
  const post = async (p, body, cookie) => { const r = await fetch(B + p, { method: 'POST', headers: { ...H, ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body || {}) }); return { r, j: await r.json().catch(() => ({})) }; };
  try {
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await sleep(250); }
    assert.ok(ready, 'server started');

    // Phoenix signs up on Cohabi Social: social standing, can't write in the rooms yet.
    const su = await post('/api/humans', { name: 'Phoenix Test' });
    assert.equal(su.r.status, 201);
    const cookie = (su.r.headers.get('set-cookie') || '').split(';')[0];
    assert.equal(su.j.member.social_only, true);
    const before = await post('/api/rooms/general/messages', { text: 'hello before' }, cookie);
    assert.equal(before.r.status, 403, 'social standing cannot post in the rooms');

    // Walks the forest and is admitted (the tester code stands in for the review's yes: same gate, readyToEnter).
    const v = await post('/api/arrive/visitor', {});
    const vid = v.j.vid;
    assert.equal((await post('/api/arrive/bypass', { vid, code: 'TEST-GATE' })).r.status, 200);

    // Steps through the gate signed in.
    const claim = await post('/api/arrive/claim', { vid }, cookie);
    assert.equal(claim.r.status, 200, JSON.stringify(claim.j));
    assert.equal(claim.j.member_of_commons, true);
    assert.equal(claim.j.member.social_only, undefined, 'no longer social-only');
    assert.equal(claim.j.coins_received, 10);

    const after = await post('/api/rooms/general/messages', { text: 'hello, I made it in' }, cookie);
    assert.equal(after.r.status, 201, `a member now posts in the General Hall: ${JSON.stringify(after.j)}`);
    const hall = await (await fetch(`${B}/api/rooms/general/messages`)).text();
    assert.match(hall, /Welcome, Phoenix Test\. They walked the forest/, 'the Hall is told');

    // A second claim neither re-announces nor pays twice.
    const v2 = (await post('/api/arrive/visitor', {})).j.vid;
    await post('/api/arrive/bypass', { vid: v2, code: 'TEST-GATE' });
    const again = await post('/api/arrive/claim', { vid: v2 }, cookie);
    assert.equal(again.r.status, 409, 'already a member and already paid');
  } finally { srv.kill(); }
});

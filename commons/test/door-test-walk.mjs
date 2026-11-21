// The door test, walked the way HELP-WANTED.md tells agents to walk it (Round 27, Claude, test only).
// Kinward invites agents to test our door; before strangers do, we walk it ourselves, end to end, in one file:
//   Day 1: /api/join with a fresh name -> 200, a token and a recovery code; post one message in `general`.
//   "Next day, new chat": forget the token. /api/rejoin with name + recovery code -> 200, a new token;
//     the old token is 401; the new token posts a message containing "door test" that reads back under the member's name.
//   A wrong code -> the plain refusal (no stack trace), and the real member still gets in with the right one afterwards.
// Each step's status is printed in a table at the end (pass or not). No source edits.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('door walk: join, post, forget the token, rejoin, old token dead, new token posts, wrong code refused plainly', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-test-walk-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, COMMONS_FAKE_LLM: '1', ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const post = (p, body, token) => fetch(B + p, { method: 'POST', headers: { ...J, ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const rows = [];
  // Read the body once, keep the status; record the step. Parsed JSON is null when the body isn't JSON.
  const step = async (label, r, expected) => {
    const body = await r.text();
    let json = null; try { json = JSON.parse(body); } catch { /* not JSON */ }
    rows.push({ step: label, status: r.status, expected, ok: r.status === expected });
    assert.equal(r.status, expected, `${label}: expected ${expected}, got ${r.status}: ${body.slice(0, 200)}`);
    return { body, json };
  };
  try {
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) break; } catch { /* starting */ } await new Promise((s) => setTimeout(s, 250)); }
    const NAME = 'Wren Walker';

    // Day 1
    const joined = (await step('1 join (/api/join)', await post('/api/join', { name: NAME, model: 'test-model' }), 200)).json;
    const token1 = joined.token; const code = joined.recovery || joined.recovery_code;
    assert.ok(token1, 'join returns a token');
    assert.ok(code && code.startsWith('rec_'), 'join returns a recovery code');
    const memberId = joined.member && joined.member.id; assert.ok(memberId, 'join names the member id');
    await step('2 post in general with the day-1 token', await post('/api/rooms/general/messages', { text: 'hello from day one' }, token1), 201);

    // A wrong code first: plain refusal, no stack trace, and it must not burn the real code
    const wrong = await step('3 rejoin with a WRONG code', await post('/api/rejoin', { name: NAME, recovery: 'rec_wrong' }), 403);
    assert.ok(wrong.json && typeof wrong.json.error === 'string' && wrong.json.error.length > 0, 'the refusal is JSON with a plain error sentence');
    assert.ok(!/\bat .*\.mjs:\d+/.test(wrong.body), 'no stack trace in the refusal');
    assert.ok(!wrong.body.includes(code), 'the refusal does not echo the real code');
    assert.equal((await step('3b day-1 token still works after the refused rejoin', await post('/api/rooms/general/messages', { text: 'still me after a refusal' }, token1), 201)).json.author, memberId, 'the refusal changed nothing');

    // "Next day, new chat": the token is forgotten; the member walks in with name + code
    const rj = (await step('4 rejoin with name + right code', await post('/api/rejoin', { name: NAME, recovery: code }), 200)).json;
    assert.ok(rj.token && rj.token !== token1, 'rejoin returns a NEW token');
    assert.equal(rj.member && rj.member.id, memberId, 'it is the same member account');
    await step('5 OLD token is refused', await post('/api/rooms/general/messages', { text: 'old token should not post' }, token1), 401);
    const posted = (await step('6 NEW token posts "door test"', await post('/api/rooms/general/messages', { text: 'door test: next day, new chat' }, rj.token), 201)).json;
    assert.equal(posted.author, memberId, 'the posted message belongs to the member');

    // It reads back with the member's name (public read, no token needed)
    const read = (await step('7 read general back', await fetch(`${B}/api/rooms/general/messages?limit=50`), 200)).json;
    const mine = read.messages.find((m) => /door test/.test(m.text || ''));
    assert.ok(mine, 'the "door test" message reads back in general');
    assert.equal(mine.author, memberId, 'by the same member id');
    assert.equal(read.authors[mine.author] && read.authors[mine.author].name, NAME, 'under the member\'s name');
    assert.ok(!read.messages.some((m) => /old token should not post/.test(m.text || '')), 'the old token\'s message was not posted');

    // The used code is single-use now: a second try with it is a plain refusal too (and still not a stack trace)
    const again = await step('8 rejoin again with the USED code', await post('/api/rejoin', { name: NAME, recovery: code }), 403);
    assert.ok(again.json && typeof again.json.error === 'string', 'a used code is refused in plain JSON');
    assert.ok(!/\bat .*\.mjs:\d+/.test(again.body), 'no stack trace');
    await step('8b the new token still works', await post('/api/rooms/general/messages', { text: 'door test: still in' }, rj.token), 201);
  } finally {
    console.log('\n door walk, step by step:');
    console.log(' ' + 'step'.padEnd(52) + 'status'.padEnd(8) + 'expected'.padEnd(10) + 'result');
    for (const r of rows) console.log(' ' + r.step.padEnd(52) + String(r.status).padEnd(8) + String(r.expected).padEnd(10) + (r.ok ? 'ok' : 'RED'));
    srv.kill(); fs.rmSync(D, { recursive: true, force: true });
  }
});

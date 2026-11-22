// Round 32, DeepSeek: the door's last words. Three agent-facing sentences still sent a stranded agent to a steward
// and nowhere else, after the one-press door (#285) had made a faster way in exist:
//   1. core.mjs useRecoveryCode, no recovery code on file (403)          — runtime, test 1 below
//   2. core.mjs endConnectionsAfterRecovery, the "NOT ended" note        — source text, test 2 below (is not reachable
//      over HTTP without making the revoke hook throw; the note is the exported function's return value)
//   3. core.mjs rejoinAgent, the note returned with a new token (200)    — runtime, test 3 below
// Each assertion is written presence + absence, so it is RED on 49997abc (the merged door-words branch) and green after
// the text change. Text only: no branch, status code, token or counter is touched by the change these pin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { freePort } from './lib/port.mjs';

const HERE = import.meta.dirname;
const ROOT = path.join(HERE, '..');

/** Clear a member's recovery code on disk (a member that "predates recovery codes"). Handles either members shape:
 *  an array of members, or an object keyed by id. Returns the id it cleared, or null when nothing matched. */
function clearCodeOnDisk(D, id) {
  for (const f of fs.readdirSync(D)) {
    if (!f.endsWith('.json')) continue;
    const p = path.join(D, f);
    let doc; try { doc = JSON.parse(fs.readFileSync(p, 'utf8')); } catch { continue; }
    const patch = (m) => { if (!m || m.id !== id) return false; m.recoveryHash = null; delete m.recovered_at; return true; };
    let hit = false;
    if (Array.isArray(doc?.members)) hit = doc.members.map(patch).some(Boolean);
    else if (doc?.members && typeof doc.members === 'object') { for (const k of Object.keys(doc.members)) hit = patch(doc.members[k]) || hit; }
    if (!hit) continue;
    fs.writeFileSync(p, JSON.stringify(doc));
    return id;
  }
  return null;
}

test('an agent with no recovery code on file is told the join-again path first, and the rejoin note names it too', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-last-words-'));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const env = { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D };
  const J = { 'content-type': 'application/json', 'x-commons': '1' };
  const post = (p, body) => fetch(B + p, { method: 'POST', headers: J, body: JSON.stringify(body) });
  const boot = async () => {
    const s = spawn(process.execPath, [path.join(ROOT, 'server.mjs')], { env, stdio: 'ignore' });
    for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/skill.md`)).ok) return s; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); }
    s.kill(); throw new Error('server did not come up');
  };
  let srv = await boot();
  try {
    // ---- 1. a member that has no recovery code at all (predates codes, or its code was cleared)
    const j = await (await post('/api/join', { name: 'Codeless', model: 'test-model' })).json();
    assert.ok(j.token && j.member?.id, 'join returns a token and a member');
    srv.kill(); await new Promise((r) => setTimeout(r, 400));
    assert.equal(clearCodeOnDisk(D, j.member.id), j.member.id, 'the test really cleared the code on disk (guards a wrong path)');
    srv = await boot();
    const res = await post('/api/rejoin', { name: 'Codeless', recovery: 'rec_not_the_code' });
    assert.equal(res.status, 403, 'a member with no code on file is still refused');
    const msg = String((await res.json()).error || '');
    assert.match(msg, /none on file/, 'it still says there is no code on file');
    assert.match(msg, /join again under your exact old name/, 'it names the join-again path first');
    assert.match(msg, /\/my-agents/, 'it says where the human presses Yes');
    assert.match(msg, /POST \/api\/me\/recovery/, 'it keeps the self-serve mint path');
    assert.match(msg, /ask a steward of the Commons to mint one/, 'it keeps the steward as the last resort');
    assert.doesNotMatch(msg, /none on file: ask a steward/, 'the old "none on file: ask a steward" sentence is gone (RED on 49997abc)');

    // ---- 3. the note returned with a fresh token after a rejoin
    const n = await (await post('/api/join', { name: 'Notekeeper', model: 'test-model' })).json();
    assert.ok(n.recovery?.startsWith('rec_'), 'join returns a recovery code');
    const back = await post('/api/rejoin', { name: 'Notekeeper', recovery: n.recovery });
    assert.equal(back.status, 200, 'the right code still works');
    const note = String((await back.json()).note || '');
    assert.match(note, /join again under your exact old name/, 'the note names the join-again path');
    assert.match(note, /\/my-agents/, 'and where the human presses Yes');
    assert.match(note, /\/connect/, 'it still names the connector');
    assert.match(note, /ask a steward in the General Hall now, not later/, 'it still says to ask a steward now, not later');
    assert.doesNotMatch(note, /instead \(\/connect\) or ask a steward/, 'the old either/or sentence is gone (RED on 49997abc)');
  } finally { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); }
});

test('the failed-revoke note names the way back in (source text, not a runtime path)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lib', 'core.mjs'), 'utf8');
  const line = src.split('\n').find((l) => l.includes('NOT ended: revoking your app connections failed'));
  assert.ok(line, 'the failed-revoke note is still in lib/core.mjs');
  assert.match(line, /revoke-all with your new token/, 'it still says to run revoke-all with the new token');
  assert.match(line, /join again under your exact old name/, 'it names the join-again path if that token is lost');
  assert.match(line, /\/my-agents/, 'and where the human presses Yes');
  assert.match(line, /or ask a steward in the General Hall/, 'and keeps the steward as the last resort');
  assert.doesNotMatch(line, /revoke-all with your new token, or ask a steward/, 'the old two-option sentence is gone (RED on 49997abc)');
});
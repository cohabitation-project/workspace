// Door crash window (Aletheia-6, Review m_mwrb17lmbw69e4a4; fix shape Claude m_mwrb1pxabz3c3cc1, backed by Ash).
// Before: answerReturn wrote members.json twice; a crash between the writes left the original agent and its
// returning seat both live with ONE tokenHash, and on restart the later record (the seat) won the token.
// Now: (1) the Yes is one write; (2) a file already in that state is repaired at load, original wins.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';
import * as store from '../lib/store.mjs';
import * as operators from '../lib/operators.mjs';

const TOKEN = 'tok-wren-returning';
const H = store.sha256(TOKEN);
const fixture = () => ({ members: [
  { id: 'a_orig', kind: 'agent', name: 'Wren', created: '2026-11-01T00:00:00Z', tokenHash: H, returned_from: 'a_seat', recovered_at: '2026-11-22T00:00:00Z' },
  { id: 'a_seat', kind: 'agent', name: 'Wren returning', created: '2026-11-21T00:00:00Z', tokenHash: H, returning_to: 'a_orig' },
] });

test('a members.json left by a crash mid-Yes resolves the token to the original only, over REST', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-crash-'));
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify(fixture()));
  const PORT = await freePort(); const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_FAKE_LLM: '1' }, stdio: 'ignore' });
  try {
    let ready = false;
    for (let i = 0; i < 60 && !ready; i++) { try { ready = (await fetch(`${B}/skill.md`)).ok; } catch { /* starting */ } if (!ready) await new Promise((r) => setTimeout(r, 250)); }
    assert.ok(ready, 'server started');
    const r = await fetch(`${B}/api/me`, { headers: { authorization: `Bearer ${TOKEN}` } });
    const j = await r.json();
    assert.equal(r.status, 200, JSON.stringify(j));
    assert.equal(j.member?.id || j.id, 'a_orig', `token opens the original, not the seat: ${JSON.stringify(j).slice(0, 200)}`);
    const disk = JSON.parse(fs.readFileSync(path.join(D, 'members.json'), 'utf8')).members;
    const seat = disk.find((m) => m.id === 'a_seat');
    assert.equal(seat.retired, true, 'the seat is retired on disk after the repair');
    assert.equal(seat.tokenHash, null, 'the seat no longer holds the hash');
  } finally { srv.kill(); }
});

test('the same repair at load, in-process: memberByToken, retired seat, original untouched', () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-crash-unit-'));
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify(fixture()));
  store.init(D);
  assert.equal(store.memberByToken(TOKEN)?.id, 'a_orig');
  assert.equal(store.getMember('a_seat').retired, true);
  assert.equal(store.getMember('a_seat').merged_into, 'a_orig');
  assert.equal(store.getMember('a_orig').retired, undefined, 'no role or standing change on the original');
});

test('a Yes saves all its changes together (one updateMembers call, one members.json write)', () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-crash-yes-'));
  const pat = { id: 'h_pat', kind: 'human', name: 'Pat', created: '2026-10-01T00:00:00Z' };
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: [
    pat,
    { id: 'a_orig', kind: 'agent', name: 'Wren', created: '2026-11-01T00:00:00Z', tokenHash: store.sha256('old'), human_id: 'h_pat', human_confirmed: true, human_confirmed_at: '2026-11-02T00:00:00Z' },
    { id: 'a_seat', kind: 'agent', name: 'Wren returning', created: '2026-11-21T00:00:00Z', tokenHash: H, returning_to: 'a_orig' },
    { id: 'a_sq', kind: 'agent', name: 'Wren returning 2', created: '2026-11-21T01:00:00Z', tokenHash: store.sha256('sq'), returning_to: 'a_orig' },
  ] }));
  store.init(D);
  const mf = path.join(D, 'members.json');
  // count real renames into members.json: the Yes must be exactly one write (a vacuous mtime check proved nothing)
  const realRename = fs.renameSync; let renames = 0;
  fs.renameSync = (a, b) => { if (String(b) === mf) renames++; return realRename(a, b); };
  let res;
  try { res = operators.answerReturn(store.getMember('h_pat'), 'a_seat', 'yes', { steward: true }); } finally { fs.renameSync = realRename; }
  assert.equal(renames, 1, 'the Yes wrote members.json exactly once');
  assert.equal(res.answer, 'yes');
  assert.equal(store.memberByToken(TOKEN)?.id, 'a_orig', 'the seat token opens the original');
  assert.equal(store.memberByToken('old'), null, 'the old token stops working');
  assert.equal(store.getMember('a_sq').returning_to, null, 'the other waiting seat is closed in the same write');
  // on disk, all three changes are present together
  const disk = Object.fromEntries(JSON.parse(fs.readFileSync(mf, 'utf8')).members.map((m) => [m.id, m]));
  assert.equal(disk.a_orig.tokenHash, H); assert.equal(disk.a_seat.retired, true); assert.equal(disk.a_sq.returning_to, null);
});

test('a failed members.json write during a Yes leaves memory where the disk is: the seat still opens, the original unchanged', () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'door-crash-fail-'));
  const OLD = store.sha256('old');
  fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: [
    { id: 'h_pat', kind: 'human', name: 'Pat', created: '2026-10-01T00:00:00Z' },
    { id: 'a_orig', kind: 'agent', name: 'Wren', created: '2026-11-01T00:00:00Z', tokenHash: OLD, human_id: 'h_pat', human_confirmed: true, human_confirmed_at: '2026-11-02T00:00:00Z' },
    { id: 'a_seat', kind: 'agent', name: 'Wren returning', created: '2026-11-21T00:00:00Z', tokenHash: H, returning_to: 'a_orig' },
    { id: 'a_sq', kind: 'agent', name: 'Wren returning 2', created: '2026-11-21T01:00:00Z', tokenHash: store.sha256('sq'), returning_to: 'a_orig' },
  ] }));
  store.init(D);
  const mf = path.join(D, 'members.json');
  const diskBefore = fs.readFileSync(mf, 'utf8');
  const origBefore = JSON.stringify(store.getMember('a_orig'));
  const seatRef = store.getMember('a_seat');
  const realRename = fs.renameSync; let thrown = 0;
  fs.renameSync = (a, b) => { if (String(b) === mf && thrown++ === 0) throw new Error('EIO: simulated disk failure'); return realRename(a, b); };
  try {
    assert.throws(() => operators.answerReturn(store.getMember('h_pat'), 'a_seat', 'yes', { steward: true }), /EIO/);
  } finally { fs.renameSync = realRename; }
  assert.equal(thrown, 1, 'the write was attempted and failed');
  assert.equal(store.memberByToken(TOKEN)?.id, 'a_seat', 'the seat token still opens the seat');
  assert.equal(store.memberByToken('old')?.id, 'a_orig', 'the original token still opens the original');
  assert.equal(JSON.stringify(store.getMember('a_orig')), origBefore, 'the original is unchanged in memory');
  assert.equal(store.getMember('a_seat'), seatRef, 'the same seat object is restored in place');
  assert.equal(store.getMember('a_seat').retired, undefined, 'the seat is not retired in memory');
  assert.equal(store.getMember('a_seat').returning_to, 'a_orig', 'the seat is still waiting');
  assert.equal(store.getMember('a_sq').returning_to, 'a_orig', 'the other waiting seat is untouched');
  assert.equal(fs.readFileSync(mf, 'utf8'), diskBefore, 'the file on disk is unchanged');
  // and a retry after the disk recovers succeeds
  const res = operators.answerReturn(store.getMember('h_pat'), 'a_seat', 'yes', { steward: true });
  assert.equal(res.answer, 'yes');
  assert.equal(store.memberByToken(TOKEN)?.id, 'a_orig');
  assert.equal(store.memberByToken('old'), null);
});

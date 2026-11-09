// Authorization fixes from Aletheia-6's 2026-11-08 route audit + Geoffrey's access matrix.
// Boots the real server on a test port and exercises the four paths.
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';

const PORT = 3470 + (process.pid % 29); const B = `http://127.0.0.1:${PORT}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'authz-'));
let srv;
const j = async (p, opt = {}) => { const r = await fetch(B + p, { ...opt, headers: { 'content-type': 'application/json', 'x-commons': '1', ...(opt.headers || {}) } }); let b; try { b = await r.json(); } catch { b = {}; } return { status: r.status, body: b, headers: r.headers }; };

test('setup: server boots', async () => {
  srv = spawn('node', ['commons/server.mjs'], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_STATION_ENABLED: '1' }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { const r = await fetch(B + '/api/rooms'); if (r.ok) return; } catch { /* booting */ } await new Promise((r) => setTimeout(r, 250)); }
  assert.fail('server did not boot');
});

test('open web signup creates a SOCIAL-ONLY human (full membership stays behind the forest)', async () => {
  const r = await j('/api/humans', { method: 'POST', body: JSON.stringify({ name: 'SocialSam' }) });
  assert.equal(r.status, 201);
  assert.equal(r.body.member.social_only, true, 'web-signup human must carry social_only: true');
});

test('a plain signed-in human cannot decide a held application; the error names the steward rule', async () => {
  const h = await j('/api/humans', { method: 'POST', body: JSON.stringify({ name: 'NosyNed' }) });
  const cookie = h.headers.get('set-cookie').split(';')[0];
  const r = await j('/api/applications/app_nonexistent/decide', { method: 'POST', headers: { cookie }, body: JSON.stringify({ admit: true }) });
  assert.equal(r.status, 403, 'non-steward decide must 403 before any lookup');
  assert.match(String(r.body.error || ''), /steward/i);
});

test('a plain signed-in human cannot grant Station entry or flip its session', async () => {
  const h = await j('/api/humans', { method: 'POST', body: JSON.stringify({ name: 'MicMallory' }) });
  const cookie = h.headers.get('set-cookie').split(';')[0];
  const g = await j('/api/station/grants', { method: 'POST', headers: { cookie }, body: JSON.stringify({ name: 'MicMallory', on: true }) });
  assert.equal(g.status, 403); assert.match(String(g.body.error || ''), /steward/i);
  const s = await j('/api/station/state', { method: 'POST', headers: { cookie }, body: JSON.stringify({ session: 'on' }) });
  assert.equal(s.status, 403); assert.match(String(s.body.error || ''), /steward/i);
});

test('social standing is a GATE: no room posts, no desk claims — the feed stays theirs', async () => {
  const h = await j('/api/humans', { method: 'POST', body: JSON.stringify({ name: 'SocialSue' }) });
  const cookie = h.headers.get('set-cookie').split(';')[0];
  const room = await j('/api/rooms/general/messages', { method: 'POST', headers: { cookie }, body: JSON.stringify({ text: 'hello hall' }) });
  assert.equal(room.status, 403, 'a social account must not write in rooms');
  assert.match(String(room.body.error || ''), /social standing/i);
  const claim = await j('/api/desk/doesnotexist/claim', { method: 'POST', headers: { cookie }, body: JSON.stringify({}) });
  assert.equal(claim.status, 403, 'a social account must not touch the desk');
  const feed = await j('/api/posts', { method: 'POST', headers: { cookie }, body: JSON.stringify({ text: 'the feed is mine though' }) });
  assert.equal(feed.status, 201, 'the FEED must stay open to social accounts');
  // Claude's re-run row (m_mw8spm9c): /api/submit published files past the gate
  const sub = await fetch(B + '/api/submit', { method: 'POST', headers: { cookie, 'x-commons': '1', 'content-type': 'multipart/form-data; boundary=x' }, body: '--x--\r\n' });
  assert.equal(sub.status, 403, 'a social account must not publish files into the record');
  // Claude's valid-body probe rows (social-gate-sweep-a5cda90.md): the gaps the empty-body sweep couldn't see
  for (const [what, route, body] of [
    ['mint a hosted agent (a Commons MEMBER)', '/api/hosted', { instructions: 'Be kind.', team: 'rnd' }],
    ['join a work team', '/api/teams/rnd/join', {}],
    ['post a room-board meeting', '/api/rooms/rnd/meetings', { title: 'x' }],
    ['add to the Library (the record)', '/api/library', { title: 'x', url: 'https://example.com' }],
    ['add a wish', '/api/wishes', { title: 'x', why: 'y' }],
  ]) {
    const r = await j(route, { method: 'POST', headers: { cookie }, body: JSON.stringify(body) });
    assert.equal(r.status, 403, `a social account must not ${what}`);
    assert.match(String(r.body.error || ''), /social standing/i, what);
  }
  // and what STAYS open to a social account, by design (Geoffrey: walk around, look — and the social side is theirs)
  const enter = await j('/api/rooms/rnd/enter', { method: 'POST', headers: { cookie }, body: '{}' });
  assert.equal(enter.status, 200, 'walking into a room (presence) stays open: look, not commit');
});

test('the @everyone megaphone uses the canonical council check: a fresh human wearing a council name gets no broadcast', async () => {
  // HARDENED after mutation M5 survived (2026-11-09): the old version asserted a field the API never returns
  // (groups vs gtags) and was conditional on creation, so it could never fail. Now: creation is asserted, the
  // human gets member standing (so the GATE isn't what stops the post), and the honored group tags are read
  // from the post's real gtags field. Under the canonical check this list is empty; under name-alone it isn't.
  const h = await j('/api/humans', { method: 'POST', body: JSON.stringify({ name: 'Tendril' }) });
  assert.equal(h.status, 201, 'the council guest name must be creatable on a fresh store');
  const cookie = h.headers.get('set-cookie').split(';')[0];
  const id = h.body.member.id;
  const { appendFileSync } = await import('node:fs'); const { join: pj } = await import('node:path');
  appendFileSync(pj(DATA, 'admin-queue.jsonl'), JSON.stringify({ op: 'standing', member: id, social_only: false }) + '\n');
  const ok = await (async () => { for (let i = 0; i < 20; i++) { const m = await j('/api/members/' + id); if (m.body.social_only !== true) return true; await new Promise((r) => setTimeout(r, 500)); } return false; })();
  assert.ok(ok, 'standing must apply so the social gate is not the thing blocking the post');
  const p = await j('/api/posts', { method: 'POST', headers: { cookie }, body: JSON.stringify({ text: '@everyone hello from a borrowed name' }) });
  assert.equal(p.status, 201, 'the post itself is allowed; only the megaphone must stay silent');
  assert.ok(!(p.body.gtags || []).includes('everyone'), 'a fresh member wearing a council name must not inherit the @everyone megaphone');
});

test('the door asks about doubles: same operator + model joins again only as itself or by saying how it differs', async () => {
  const a = await j('/api/join', { method: 'POST', body: JSON.stringify({ name: 'Probe-One', model: 'test-twin-model', operator: 'Twin Operator' }) });
  assert.equal(a.status < 300, true);
  const dup = await j('/api/join', { method: 'POST', body: JSON.stringify({ name: 'Probe-Two', model: 'Test-Twin-Model', operator: '  twin  operator ' }) });
  assert.equal(dup.status, 409, 'a silent double must be challenged (case/space differences included)');
  assert.match(String(dup.body.error || ''), /are you sure you're not Probe-One/);
  const ok2 = await j('/api/join', { method: 'POST', body: JSON.stringify({ name: 'Probe-Two', model: 'test-twin-model', operator: 'Twin Operator', distinct_from: 'a second instance run for the night shift; no shared memory with Probe-One' }) });
  assert.equal(ok2.status < 300, true, 'an honest distinct_from line opens the door');
});

test('a recovery code works ONCE, and the next code waits a day (replay + lockout hold)', async () => {
  const a = await j('/api/join', { method: 'POST', body: JSON.stringify({ name: 'Replayer', model: 'replay-model', operator: 'Replay Operator' }) });
  const { token, recovery } = a.body;
  assert.ok(recovery, 'join returns the recovery code once');
  const r1 = await j('/api/rejoin', { method: 'POST', body: JSON.stringify({ name: 'Replayer', recovery }) });
  assert.ok(r1.status < 300, 'the real code rejoins once');
  const r2 = await j('/api/rejoin', { method: 'POST', body: JSON.stringify({ name: 'Replayer', recovery }) });
  assert.equal(r2.status, 403, 'REPLAY of a used code must fail');
  assert.match(String(r2.body.error || ''), /single-use|already used/i);
  const rot = await j('/api/me/recovery', { method: 'POST', headers: { authorization: `Bearer ${r1.body.token}` }, body: '{}' });
  assert.equal(rot.status, 403, 'minting the next code is HELD for a day after a recovery');
  assert.match(String(rot.body.error || ''), /held for one day|steward/i);
});

test("an attacker's wrong recovery guesses never lock the real owner out (S3)", async () => {
  const a = await j('/api/join', { method: 'POST', body: JSON.stringify({ name: 'LockTarget', model: 'lock-model', operator: 'Lock Operator' }) });
  const { recovery } = a.body;
  for (let i = 0; i < 5; i++) {
    const w = await j('/api/rejoin', { method: 'POST', body: JSON.stringify({ name: 'LockTarget', recovery: 'rec_wrong_' + i }) });
    assert.equal(w.status, 403, 'a wrong code is refused');
  }
  const w6 = await j('/api/rejoin', { method: 'POST', body: JSON.stringify({ name: 'LockTarget', recovery: 'rec_wrong_6' }) });
  assert.equal(w6.status, 429, 'the SIXTH wrong guess is throttled per name');
  const real = await j('/api/rejoin', { method: 'POST', body: JSON.stringify({ name: 'LockTarget', recovery }) });
  assert.ok(real.status < 300, 'the REAL code still lands after the attack — failures throttle, never the owner');
  // S3 residual (Aletheia-6's shared-IP probe): exhaust the per-ADDRESS failure bucket against other names,
  // then a valid code for a different agent from that same address must still land.
  const b = await j('/api/join', { method: 'POST', body: JSON.stringify({ name: 'NatNeighbor', model: 'nat-model', operator: 'Nat Operator' }) });
  for (let i = 0; i < 22; i++) await j('/api/rejoin', { method: 'POST', body: JSON.stringify({ name: 'NoSuchAgent' + i, recovery: 'rec_x' }) });
  const blocked = await j('/api/rejoin', { method: 'POST', body: JSON.stringify({ name: 'NoSuchAgent99', recovery: 'rec_x' }) });
  assert.equal(blocked.status, 429, 'the address bucket is exhausted for FAILURES');
  const neighbor = await j('/api/rejoin', { method: 'POST', body: JSON.stringify({ name: 'NatNeighbor', recovery: b.body.recovery }) });
  assert.ok(neighbor.status < 300, 'a VALID code from the exhausted address still lands — nobody behind a NAT is denied their own identity');
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });

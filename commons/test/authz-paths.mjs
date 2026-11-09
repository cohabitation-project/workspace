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
  const h = await j('/api/humans', { method: 'POST', body: JSON.stringify({ name: 'Tendril' }) });
  // name may be tombstoned/taken; any status is fine — what matters is that IF it exists, it has no council power
  if (h.status === 201) {
    const cookie = h.headers.get('set-cookie').split(';')[0];
    const p = await j('/api/posts', { method: 'POST', headers: { cookie }, body: JSON.stringify({ text: '@everyone hello' }) });
    // the post may be allowed, but the group mention must not fan out as council; the API echoes groups it honored
    if (p.status === 201) assert.ok(!(p.body.groups || []).includes('@everyone'), 'newcomer with a council name must not broadcast');
  }
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

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });

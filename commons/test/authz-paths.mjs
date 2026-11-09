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

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });

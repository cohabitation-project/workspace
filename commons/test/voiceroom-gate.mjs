// voiceroom-gate.mjs — proves the Cohabi Live door: who gets a WebSocket into the voice room and who is refused.
// Written 2026-11-09 after Setu found the gate checking `member.standing === 'social_only'` while the real flag is
// `member.social_only === true` — a check that could never fire. This test makes the gate's behavior evidence.
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'vrgate-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });

// Seed members and mint cookies with the real store/auth modules, before the server boots on the same data dir.
const store = await import('../lib/store.mjs'); store.init(DATA);
const auth = await import('../lib/auth.mjs');
const now = new Date().toISOString();
store.addMember({ id: 'h_member01', name: 'MemberMay', kind: 'human', joined_at: now });
store.addMember({ id: 'h_social01', name: 'SocialSid', kind: 'human', joined_at: now, social_only: true });
const cookieOf = (id) => auth.sessionCookie(id, false, 0).split(';')[0];

let srv;
test('boot', async () => {
  srv = spawn('node', ['commons/voiceroom-server.mjs'], { cwd: ROOT, env: { ...process.env, VOICEROOM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { const r = await fetch(`http://127.0.0.1:${PORT}/voiceroom/state`); if (r.ok) return; } catch { /* booting */ } await new Promise((r) => setTimeout(r, 200)); }
  throw new Error('voiceroom server did not boot');
});

/** Raw WebSocket upgrade; resolves with the HTTP status line the server answers. */
function upgrade(headers = {}) {
  return new Promise((resolve, reject) => {
    const sock = net.connect(PORT, '127.0.0.1', () => {
      const h = { Host: `127.0.0.1:${PORT}`, Upgrade: 'websocket', Connection: 'Upgrade', 'Sec-WebSocket-Version': '13', 'Sec-WebSocket-Key': 'dGhlIHNhbXBsZSBub25jZQ==', 'Sec-WebSocket-Protocol': 'commons-voiceroom', ...headers };
      sock.write(`GET /voiceroom-ws HTTP/1.1\r\n${Object.entries(h).map(([k, v]) => `${k}: ${v}`).join('\r\n')}\r\n\r\n`);
    });
    sock.once('data', (d) => { resolve(String(d).split('\r\n')[0]); sock.destroy(); });
    sock.on('error', reject);
    setTimeout(() => { sock.destroy(); reject(new Error('no answer')); }, 4000);
  });
}

test('no credentials: refused (401)', async () => { assert.match(await upgrade(), / 401 /); });
test('a token in the URL is NOT a way in (query-param auth was removed)', async () => {
  const line = await new Promise((resolve) => {
    const sock = net.connect(PORT, '127.0.0.1', () => sock.write(`GET /voiceroom-ws?token=anything HTTP/1.1\r\nHost: x\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Version: 13\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n\r\n`));
    sock.once('data', (d) => { resolve(String(d).split('\r\n')[0]); sock.destroy(); });
  });
  assert.match(line, / 401 /);
});
test('a social-only web signup is refused (403) — the voice room is member-standing space', async () => {
  assert.match(await upgrade({ Cookie: cookieOf('h_social01') }), / 403 /);
});
test('a member in good standing is let in (101 Switching Protocols)', async () => {
  assert.match(await upgrade({ Cookie: cookieOf('h_member01') }), / 101 /);
});
test('public state shows a count, never names', async () => {
  const s = await (await fetch(`http://127.0.0.1:${PORT}/voiceroom/state`)).json();
  assert.deepEqual(Object.keys(s).sort(), ['count', 'max']);
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });

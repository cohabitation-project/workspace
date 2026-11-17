// The Mycelium API (Aletheia-6's Ambassador work, reviewed by Setu 2026-11-16): who is asking comes only from the
// token or session, never from the request body; unsigned requests are refused; status is public and holds no content.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { freePort } from './lib/port.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'commons-myc-')); const port = await freePort(); const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ['commons/server.mjs'], { cwd: root, env: { ...process.env, COMMONS_DATA: data, ASHRAM_PORT: String(port), COMMONS_FAKE_LLM: '1', OPENROUTER_API_KEY: '', LLM_API_KEY: '' }, stdio: 'ignore' });
try {
  let ready = false; for (let i = 0; i < 100; i++) { try { if ((await fetch(base + '/api/rooms')).ok) { ready = true; break; } } catch {} await new Promise((r) => setTimeout(r, 60)); }
  assert.ok(ready, 'server started');
  const post = (u, b) => fetch(base + u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) });
  const st = await (await fetch(base + '/api/mycelium/status')).json();
  assert.ok(Number.isInteger(st.docs), 'status counts documents'); assert.equal(st.results, undefined, 'status holds no content');
  assert.equal((await fetch(base + '/api/mycelium/search?q=x')).status, 401, 'unsigned GET refused');
  assert.equal((await post('/api/mycelium/search', { q: 'x', as: 'someone', member: 'geoffrey', author: 'geoffrey' })).status, 401, 'a name in the body is not an identity');
  assert.equal((await post('/api/mycelium/brief', { member: 'geoffrey' })).status, 401);
  const j = await (await post('/api/join', { name: 'Myc Probe', model: 'test' })).json(); assert.ok(j.token);
  const s = await (await post('/api/mycelium/search', { token: j.token, q: 'mission', limit: 3 })).json();
  assert.ok(Array.isArray(s.results), 'signed search answers');
  assert.ok(s.results.every((r) => r.layer !== 'personal'), 'nobody else\'s private entries');
  const b = await (await post('/api/mycelium/brief', { token: j.token })).json();
  assert.equal(b.brief.you.name, 'Myc Probe', 'the brief is the token holder\'s, whatever else is sent');
  console.log('mycelium api: all checks passed');
} finally { server.kill(); }

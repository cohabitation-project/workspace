// Download your data and delete your account (2026-11-14): starts a real server on a throwaway data folder, makes two
// people talk, then checks the export is complete and secret-free, and that deletion erases the words from the FILES.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const D = fs.mkdtempSync(path.join(os.tmpdir(), 'mydata-'));
const PORT = 4900 + Math.floor(Math.random() * 90), B = `http://127.0.0.1:${PORT}`;
const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], { env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D }, stdio: 'ignore' });
test.after(() => srv.kill());
const H = { 'x-commons': '1', 'content-type': 'application/json' };
async function up() { for (let i = 0; i < 60; i++) { try { if ((await fetch(B + '/healthz')).ok) return; } catch { /* starting */ } await new Promise((r) => setTimeout(r, 250)); } throw new Error('server did not start'); }
async function human(name) { const r = await fetch(B + '/api/humans', { method: 'POST', headers: H, body: JSON.stringify({ name, email: name.replace(/ /g, '').toLowerCase() + '@example.com', password: 'a-long-test-password-123', agree: true, age_ok: true }) }); assert.equal(r.status, 201); return { id: (await r.json()).member.id, cookie: r.headers.get('set-cookie').split(';')[0] }; }
const call = (who, p, body, method = body ? 'POST' : 'GET') => fetch(B + p, { method, redirect: 'manual', headers: { ...H, cookie: who.cookie }, body: body ? JSON.stringify(body) : undefined });
const filesText = () => fs.readdirSync(D, { recursive: true }).map((f) => path.join(D, f)).filter((f) => fs.statSync(f).isFile()).map((f) => fs.readFileSync(f, 'utf8')).join('\n');

test('export is complete and leaks no secrets; delete erases from the files and keeps the other person\'s words', async () => {
  await up();
  const a = await human('Alma Tester'), b = await human('Bruno Tester');
  const p = await (await call(a, '/api/posts', { text: 'ALMA-POST' })).json();
  const bp = await (await call(b, '/api/posts', { text: 'BRUNO-POST' })).json();
  await call(b, `/api/posts/${p.id}/comments`, { text: 'BRUNO-ON-ALMA' });
  await call(a, `/api/posts/${bp.id}/comments`, { text: 'ALMA-COMMENT' });
  const t = await (await call(a, '/api/messages', { to: b.id, text: 'ALMA-DM', client_id: 'abcdefgh1' })).json();
  await call(b, `/api/messages/${t.id}/accept`, {});
  await call(b, `/api/messages/${t.id}/messages`, { text: 'BRUNO-DM', client_id: 'abcdefgh2' });

  const ex = await call(a, '/account/data'); assert.equal(ex.status, 200);
  assert.match(ex.headers.get('content-disposition'), /attachment; filename="cohabi-my-data-/);
  const txt = await ex.text();
  for (const s of ['ALMA-POST', 'ALMA-COMMENT', 'ALMA-DM', 'BRUNO-DM']) assert.ok(txt.includes(s), `export has ${s}`);
  assert.doesNotMatch(txt, /loginHash|passHash|tokenHash|p256dh/, 'no secrets in the export');

  const form = (who, confirm) => fetch(B + '/account/delete', { method: 'POST', redirect: 'manual', headers: { cookie: who.cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: 'confirm=' + encodeURIComponent(confirm) });
  assert.equal((await form(a, 'someone else')).status, 400, 'the name must match');
  assert.equal((await form(a, 'alma tester')).status, 200);
  assert.equal((await call(a, '/account')).status, 303, 'signed out everywhere');

  const all = filesText();
  for (const s of ['ALMA-POST', 'ALMA-COMMENT', 'ALMA-DM', 'BRUNO-ON-ALMA', 'Alma Tester', 'almatester@example.com']) assert.ok(!all.includes(s), `${s} is erased from the data files`);
  for (const s of ['BRUNO-POST', 'BRUNO-DM']) assert.ok(all.includes(s), `${s} (the other person's) is kept`);
  const seen = await (await call(b, `/api/messages/${t.id}`)).json();
  assert.equal(seen.peer.name, 'Deleted member');
});

test('the public deletion page explains how, without signing in', async () => {
  await up();
  const r = await fetch(B + '/delete-account'); assert.equal(r.status, 200);
  const h = await r.text(); assert.match(h, /Delete your Cohabi account/); assert.match(h, /support@cohabi\.org/);
});

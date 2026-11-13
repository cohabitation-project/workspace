// Phone notifications end to end (2026-11-13): a person turns them on, someone messages them and asks to be friends,
// and a stand-in push service receives encrypted pings that say who and what (never the message) and decrypt with
// the browser's keys. Encryption was also checked against the independent http_ece library (see the PR).
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import net from 'node:net'; import http from 'node:http'; import crypto from 'node:crypto'; import assert from 'node:assert';
const ROOT = path.resolve(import.meta.dirname, '..', '..');
const free = () => new Promise((r) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });
const PORT = await free(); const B = `http://127.0.0.1:${PORT}`; const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'push-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// the "browser": its keys, and the push service that receives the server's posts
const ua = crypto.createECDH('prime256v1'); ua.generateKeys(); const auth = crypto.randomBytes(16);
const got = [];
const svc = http.createServer((q, r) => { const parts = []; q.on('data', (c) => parts.push(c)); q.on('end', () => { got.push({ headers: q.headers, body: Buffer.concat(parts) }); r.statusCode = 201; r.end(); }); });
await new Promise((r) => svc.listen(0, '127.0.0.1', r)); const SVC = `http://127.0.0.1:${svc.address().port}/push/abc`;
function decrypt(body) { // what a browser does with an aes128gcm push (RFC 8291)
  const salt = body.subarray(0, 16); const idlen = body[20]; const asPub = body.subarray(21, 21 + idlen); const ct = body.subarray(21 + idlen);
  const shared = ua.computeSecret(asPub);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', shared, auth, Buffer.concat([Buffer.from('WebPush: info\0'), ua.getPublicKey(), asPub]), 32));
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: aes128gcm\0'), 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, Buffer.from('Content-Encoding: nonce\0'), 12));
  const d = crypto.createDecipheriv('aes-128-gcm', cek, nonce); d.setAuthTag(ct.subarray(ct.length - 16));
  const plain = Buffer.concat([d.update(ct.subarray(0, ct.length - 16)), d.final()]);
  return JSON.parse(plain.subarray(0, plain.lastIndexOf(2)).toString());
}
const srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_PUSH_TEST_HTTP: '1' }, stdio: 'ignore' });
let fail = null;
try {
  for (let i = 0; i < 60; i++) { try { await fetch(B + '/healthz'); break; } catch { await sleep(200); } }
  const signup = async (name) => { const r = await fetch(B + '/api/humans', { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ name }) }); const j = await r.json(); return { id: j.member.id, ck: (r.headers.get('set-cookie') || '').split(';')[0] }; };
  const post = (ck, p, body) => fetch(B + p, { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1', cookie: ck }, body: JSON.stringify(body) });
  const a = await signup('Geoffro'); const b = await signup('Cousin');
  assert.equal((await fetch(B + '/sw.js')).headers.get('service-worker-allowed'), '/', 'the service worker covers the whole site');
  const key = (await (await fetch(B + '/api/push/key')).json()).key; assert.equal(Buffer.from(key, 'base64url').length, 65, 'a P-256 public key');
  const s = await post(b.ck, '/api/push/subscribe', { subscription: { endpoint: SVC, keys: { p256dh: ua.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } } });
  assert.equal(s.status, 200, 'the cousin turns notifications on');
  assert.equal((await post(b.ck, '/api/push/subscribe', { subscription: { endpoint: 'http://evil.example/x', keys: {} } })).status, 400, 'an insecure or keyless subscription is refused');
  assert.equal((await post(a.ck, '/api/messages', { to: 'Cousin', text: 'Hey cousin, welcome! This text must never be in the ping.', client_id: 'push-test-0001' })).status, 201, 'the message is sent');
  await post(a.ck, '/api/friends', { to: 'Cousin', label: 'Family' });
  for (let i = 0; i < 30 && got.length < 2; i++) await sleep(100);
  assert.ok(got.length >= 2, `two pings arrived (${got.length})`);
  for (const g of got) { assert.equal(g.headers['content-encoding'], 'aes128gcm'); assert.match(g.headers.authorization, /^vapid t=.+, k=.+/); }
  const msgs = got.map((g) => decrypt(g.body));
  assert.ok(msgs.some((m) => m.title === 'Message request from Geoffro'), JSON.stringify(msgs));
  assert.ok(msgs.some((m) => /Geoffro asked to be friends \(as Family\)/.test(m.title)), JSON.stringify(msgs));
  assert.ok(!JSON.stringify(msgs).includes('welcome'), 'the message itself never goes into a notification');
  assert.equal((await post(b.ck, '/api/push/unsubscribe', { endpoint: SVC })).status, 200);
  const n = got.length; await post(a.ck, '/api/messages', { to: 'Cousin', text: 'again', client_id: 'push-test-0002' }); await sleep(500);
  assert.equal(got.length, n, 'after turning it off, nothing more is sent');
  console.log('push test passed');
} catch (e) { fail = e; } finally { srv.kill(); svc.close(); }
if (fail) { console.error('push test FAILED:', fail.message); process.exit(1); }

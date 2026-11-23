// A failed account erase reaches the person as a page, not a stack (Claude, build seat, round 40, 2026-11-23).
// mydata-delete-write-fail.mjs proves deleteAccount throws a plain 503 when store.eraseMember's write fails.
// This one boots the REAL server and sends the confirmed delete request the page sends (POST /account/delete,
// form field `confirm`), then checks what the person actually receives (server.mjs:986-987 shows
// feedv2.deletePage(me, e.message) with e.status || 500).
//
// How the write is made to fail: the server child writes members.json through writeAtomic, which writes
// `members.json.<pid>.tmp` and renames it. The child's pid is known (we spawned it), so we plant a DIRECTORY at that
// tmp path: writeFileSync then throws EISDIR, as root or not, and nothing is stubbed. Removing the directory is the
// "disk works again" step. (chmod 0o444 on the data directory would also work, but is a no-op for root.)
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { freePort } from './lib/port.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const PORT = String(await freePort());
const B = `http://127.0.0.1:${PORT}`;
const D = fs.mkdtempSync(path.join(os.tmpdir(), 'mydata-503-http-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

// Seed one human before boot, with a login link, so the test can sign in the way a person does (GET /login/<secret>).
fs.mkdirSync(D, { recursive: true });
fs.writeFileSync(path.join(D, 'members.json'), JSON.stringify({ members: [
  { id: 'h_hana', kind: 'human', name: 'Hana Test', created: '2026-11-01T00:00:00Z', tokenHash: sha256('tok-hana'), loginHash: sha256('login-hana'), sessionVersion: 1 },
] }));

let child;
const boot = async () => {
  child = spawn('node', ['commons/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, COMMONS_PORT: PORT, COMMONS_REPO: ROOT, COMMONS_DATA: D, COMMONS_MESSAGES_PER_MIN: '100', COMMONS_FLOOD_MESSAGES: '100' },
    stdio: 'ignore'
  });
  for (let i = 0; i < 80; i++) {
    await sleep(250);
    try { if ((await fetch(`${B}/healthz`)).ok) return; } catch { /* booting */ }
  }
  child.kill();
  throw new Error('isolated Commons server did not become ready');
};

const PLANT = () => path.join(D, `members.json.${child.pid}.tmp`);
const REC = path.join(D, 'privacy', 'deletions.jsonl');
let cookie = '';
const get = (p) => fetch(`${B}${p}`, { redirect: 'manual', headers: { cookie } });
const post = (p, form) => fetch(`${B}${p}`, { method: 'POST', redirect: 'manual', headers: { cookie, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(form).toString() });
const stripTags = (h) => h.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/&#39;|&apos;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');

test.before(async () => {
  await boot();
  const r = await get('/login/login-hana');
  assert.equal(r.status, 303, `login link signs the member in (got ${r.status})`);
  cookie = (r.headers.getSetCookie?.() || []).map((c) => c.split(';')[0]).find((c) => /=/.test(c) && c.split('=')[1]) || '';
  assert.ok(cookie, 'the login link set a session cookie');
});
test.after(async () => { try { child?.kill(); } catch { /* gone */ } await sleep(200); });

test('before anything fails: the delete page shows and the member is signed in', async () => {
  const r = await get('/account/delete');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /Hana Test/);
  assert.equal((await get('/account')).status, 200);
});

test('wrong name over HTTP is a 400 page that names the right spelling, and deletes nothing', async () => {
  const r = await post('/account/delete', { confirm: 'someone else' });
  assert.equal(r.status, 400);
  assert.match(await r.text(), /type your name exactly/i);
  assert.equal((await get('/account')).status, 200, 'still signed in');
  assert.equal(fs.existsSync(REC), false);
});

test('the erase write fails: HTTP 503, a plain "try again" page, no stack or system text, and the session still works', async () => {
  fs.mkdirSync(PLANT()); // members.json.<child pid>.tmp is now a directory: the next members.json write throws EISDIR
  let r;
  try {
    r = await post('/account/delete', { confirm: 'Hana Test' });
    const html = await r.text();
    const words = stripTags(html);
    assert.equal(r.status, 503, `status 503, got ${r.status}: ${words.slice(0, 200)}`);
    assert.match(r.headers.get('content-type') || '', /html/);
    assert.match(words, /try again/i, 'says to try again');
    assert.match(words, /still (open|sign in)/i, 'says the account is still open');
    assert.doesNotMatch(html, /EIO|EISDIR|EACCES|ENOENT|EPERM|errno|syscall|rename|writeFileSync/i, 'no system error text anywhere in the page');
    assert.doesNotMatch(html, /\bat [\w.<>$]+ \(|\.mjs:\d+|node:internal|node_modules|Error:|\/tmp\//, 'no stack trace, file path or "Error:" text');
    assert.match(html, /del-confirm/, 'the form is still on the page, so the person can press the button again');
    // The person is still who they were: same cookie, a signed-in page answers 200, the delete page still opens.
    assert.equal((await get('/account')).status, 200, 'the session still works after the failed erase');
    assert.equal((await get('/account/delete')).status, 200);
    assert.equal((await get('/login/login-hana')).status, 303, 'the login link still works');
    assert.equal(fs.existsSync(REC), false, 'no deletion was recorded as done');
  } finally {
    fs.rmSync(PLANT(), { recursive: true, force: true });
  }
});

test('control: once the disk works again, the same request finishes the deletion, clears the cookie and writes one record', async () => {
  const r = await post('/account/delete', { confirm: 'hana test' });
  const words = stripTags(await r.text());
  assert.equal(r.status, 200, `retry finishes: ${r.status} ${words.slice(0, 200)}`);
  assert.ok((r.headers.getSetCookie?.() || []).some((c) => /Max-Age=0|Expires=/i.test(c)), 'the session cookie is cleared');
  const lines = fs.readFileSync(REC, 'utf8').split('\n').filter(Boolean);
  assert.equal(lines.length, 1, 'exactly one deletion record');
  assert.equal(JSON.parse(lines[0]).id, 'h_hana');
  const after = await get('/account');
  assert.equal(after.status === 200, false, 'the account page is no longer open to the old cookie');
});

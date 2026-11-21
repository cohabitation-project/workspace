// The connect page says who you're signed in as (Threshold approved his connection on a phone signed in as Sarah; the
// steward box was hidden and nothing said why). Signed out, plain human, steward: each sees the right line, the name is
// escaped, the "Not you?" link carries the authorize URL, and the steward form still shows only to the steward.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import net from 'node:net';

const ROOT = path.resolve(import.meta.dirname, '..', '..');
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'connect-who-'));
const PORT = await new Promise((res) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
const B = `http://127.0.0.1:${PORT}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const J = { 'content-type': 'application/json', 'x-commons': '1' };
const REDIRECT = 'https://claude.ai/api/mcp/auth_callback';
const post = (p, body, h = {}) => fetch(B + p, { method: 'POST', headers: { ...J, ...h }, body: JSON.stringify(body) });
const cookieOf = (r) => (r.headers.get('set-cookie') || '').split(';')[0];

let srv; let client; let opalCookie = '';
async function boot() {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, COMMONS_STEWARDS: 'Opal', COMMONS_STEWARD_NAME_CUTOFF: '2999-01-01T00:00:00Z' }, stdio: 'ignore' });
  for (let i = 0; i < 60; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) return; } catch { /* booting */ } await sleep(250); }
}
async function authorize(ck = '') {
  const challenge = crypto.createHash('sha256').update(crypto.randomBytes(40).toString('base64url')).digest('base64url');
  const q = new URLSearchParams({ response_type: 'code', client_id: client.client_id, redirect_uri: REDIRECT, state: 'st-who', code_challenge: challenge, code_challenge_method: 'S256', scope: 'commons' });
  const r = await fetch(`${B}/oauth/authorize?${q}`, { redirect: 'manual', headers: ck ? { cookie: ck } : {} });
  assert.equal(r.status, 200, 'the consent page loads');
  return { html: await r.text(), q };
}
const STEWARD_LINE = /The steward option shows only when a steward is signed in\./;
const NOT_SIGNED_IN = /You're not signed in\. A steward or an agent's operator signs in first; anyone can use the agent's recovery code below\./;

test('boot: an app registers; a steward, a plain human and a human with an apostrophe sign up', async () => {
  await boot();
  client = await (await post('/oauth/register', { client_name: 'Test App', redirect_uris: [REDIRECT], token_endpoint_auth_method: 'none' })).json(); assert.ok(client.client_id);
  const o = await post('/api/humans', { name: 'Opal' }); assert.equal(o.status, 201, await o.text()); opalCookie = cookieOf(o);
  srv.kill(); await sleep(500); await boot(); // Opal existed before this boot, so the steward name pins to her id
});

test('signed out: the page says so and says what to do', async () => {
  const { html } = await authorize();
  assert.match(html, NOT_SIGNED_IN);
  assert.doesNotMatch(html, /You're signed in as/);
  assert.doesNotMatch(html, STEWARD_LINE, 'the steward sentence is for signed-in non-stewards');
  assert.doesNotMatch(html, /Not you\?/, 'nobody to be "not"');
  assert.doesNotMatch(html, /name="how" value="steward"/);
  assert.match(html, /name="how" value="recovery"/, 'the recovery-code form is still there');
});

test('a plain human sees their name, why the steward box is missing, and a way to sign in as someone else', async () => {
  const q = await post('/api/humans', { name: 'Quill' }); assert.equal(q.status, 201, await q.text());
  const { html, q: query } = await authorize(cookieOf(q));
  assert.match(html, /You're signed in as <strong>Quill<\/strong>\./);
  assert.match(html, STEWARD_LINE);
  assert.doesNotMatch(html, NOT_SIGNED_IN);
  assert.doesNotMatch(html, /name="how" value="steward"/, 'a plain human gets no steward form');
  const href = html.match(/<a href="([^"]+)">Not you\? Sign in as someone else<\/a>/)?.[1];
  assert.ok(href, 'the Not you? link is there');
  assert.ok(href.startsWith('/signin?next='), href);
  const next = new URL(href, B).searchParams.get('next');
  assert.ok(next.startsWith('/oauth/authorize?'), next);
  const back = new URL(next, B).searchParams;
  assert.equal(back.get('client_id'), client.client_id, 'it returns to this very request');
  assert.equal(back.get('state'), 'st-who');
  assert.equal(back.get('code_challenge'), new URLSearchParams(query).get('code_challenge'));
});

test('a name with an apostrophe is escaped, not printed raw', async () => {
  const s = await post('/api/humans', { name: "Sarah O'Neil" }); assert.equal(s.status, 201, await s.text());
  const { html } = await authorize(cookieOf(s));
  assert.match(html, /You're signed in as <strong>Sarah O&#39;Neil<\/strong>\./);
  assert.doesNotMatch(html, /<strong>Sarah O'Neil<\/strong>/, 'no raw apostrophe in the name');
});

test('a steward sees their name and the steward form, and is not told the steward box is missing', async () => {
  const { html } = await authorize(opalCookie);

  assert.match(html, /You're signed in as <strong>Opal<\/strong>\./);
  assert.doesNotMatch(html, STEWARD_LINE);
  assert.match(html, /name="how" value="steward"/);
  assert.match(html, /Not you\? Sign in as someone else/);
});

test.after(() => { try { srv.kill(); } catch { /* gone */ } });

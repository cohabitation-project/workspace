// provider-signin.mjs — Continue with Google / GitHub, against a stand-in provider. Checks the things that matter:
// the answer must belong to this browser, is accepted once, binds by account number only, stores no email or token,
// and a provider that is not configured stays honestly off.
import test from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const PORT = 5000 + Math.floor(Math.random() * 90); const FAKE = PORT + 100; const B = `http://127.0.0.1:${PORT}`; const F = `http://127.0.0.1:${FAKE}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'prov-')); let srv; let fake; const seen = [];
const jwt = (claims) => `x.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.y`;
let googleClaims = () => ({ aud: 'g-id', iss: 'https://accounts.google.com', exp: Math.floor(Date.now() / 1000) + 600, sub: '1122334455', email: 'someone@example.com', name: 'Real Name' });
const jar = (res, prev = '') => { const m = new Map(prev.split('; ').filter(Boolean).map((c) => [c.split('=')[0], c])); for (const c of res.headers.getSetCookie()) { const kv = c.split(';')[0]; const k = kv.split('=')[0]; if (kv.endsWith('=')) m.delete(k); else m.set(k, kv); } return [...m.values()].join('; '); };
const go = (u, h = {}) => fetch(B + u, { headers: h, redirect: 'manual' });

test('boot', async () => {
  fake = http.createServer((req, res) => { let body = ''; req.on('data', (d) => { body += d; }); req.on('end', () => { seen.push({ url: req.url, body, auth: req.headers.authorization || '' }); res.setHeader('content-type', 'application/json');
    if (req.url === '/g/token') return res.end(JSON.stringify({ id_token: jwt(googleClaims()), access_token: 'G-ACCESS-TOKEN' }));
    if (req.url === '/h/token') return res.end(JSON.stringify({ access_token: 'H-ACCESS-TOKEN' }));
    if (req.url === '/h/user') return res.end(JSON.stringify({ id: 987654, login: 'octo', email: 'octo@example.com' }));
    res.statusCode = 404; res.end('{}'); }); }).listen(FAKE);
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, stdio: 'ignore', env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA, GOOGLE_CLIENT_ID: 'g-id', GOOGLE_CLIENT_SECRET: 'g-secret', GOOGLE_TOKEN_URL: `${F}/g/token`, GOOGLE_AUTHORIZE_URL: `${F}/g/authorize`,
    GITHUB_CLIENT_ID: 'h-id', GITHUB_CLIENT_SECRET: 'h-secret', GITHUB_TOKEN_URL: `${F}/h/token`, GITHUB_USER_URL: `${F}/h/user`, GITHUB_AUTHORIZE_URL: `${F}/h/authorize` } });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 200)); }
  assert.fail('server did not start');
});

const begin = async (p, cookie = '', next = '') => { const r = await go(`/auth/${p}${next}`, { cookie }); assert.equal(r.status, 303); const u = new URL(r.headers.get('location')); return { u, cookie: jar(r, cookie) }; };

test('the buttons point at real start routes, and the start asks the provider for as little as possible', async () => {
  const page = await (await fetch(B + '/signin')).text();
  assert.match(page, /data-auth-provider="google" data-auth-start="\/auth\/google"/); assert.match(page, /data-auth-provider="github" data-auth-start="\/auth\/github"/); assert.match(page, /No email address is stored/);
  const g = await begin('google'); assert.equal(g.u.origin + g.u.pathname, `${F}/g/authorize`); assert.equal(g.u.searchParams.get('scope'), 'openid'); assert.equal(g.u.searchParams.get('redirect_uri'), `${B}/auth/google/callback`); assert.ok(g.u.searchParams.get('state').length >= 30);
  const h = await begin('github'); assert.equal(h.u.searchParams.get('scope'), null, 'GitHub is asked for no scope at all');
  assert.match(g.cookie, /cx_oauth=/); const raw = (await go('/auth/google')).headers.getSetCookie()[0]; assert.match(raw, /HttpOnly/); assert.match(raw, /SameSite=Lax/); assert.match(raw, /Path=\/auth/);
});

test('an answer that did not start in this browser is refused, and an answer is accepted once', async () => {
  const a = await begin('google'); const state = a.u.searchParams.get('state');
  assert.equal((await go(`/auth/google/callback?code=c&state=${state}`)).status, 400, 'no cookie: another browser');
  const b = await begin('google'); assert.equal((await go(`/auth/google/callback?code=c&state=${state}`, { cookie: b.cookie })).status, 400, 'someone else\'s state');
  assert.equal((await go(`/auth/github/callback?code=c&state=${state}`, { cookie: a.cookie })).status, 400, 'a Google start cannot finish as GitHub');
  const ok = await go(`/auth/google/callback?code=c&state=${state}`, { cookie: a.cookie }); assert.equal(ok.status, 200); assert.match(await ok.text(), /Choose your name/);
  assert.equal((await go(`/auth/google/callback?code=c&state=${state}`, { cookie: a.cookie })).status, 400, 'the same answer again');
  assert.equal((await go('/auth/google/callback?error=access_denied', { cookie: (await begin('google')).cookie })).status, 400, 'the person pressed cancel');
});

let patCookie;
test('a new person chooses a name; we keep the account number and nothing else', async () => {
  const a = await begin('google'); const cb = await go(`/auth/google/callback?code=c&state=${a.u.searchParams.get('state')}`, { cookie: a.cookie }); const c2 = jar(cb, a.cookie);
  const form = (name, h = {}) => fetch(B + '/auth/finish', { method: 'POST', redirect: 'manual', headers: { cookie: c2, 'content-type': 'application/x-www-form-urlencoded', ...h }, body: `name=${encodeURIComponent(name)}` });
  assert.equal((await form('GooglePat')).status, 403, 'no Origin: not our form'); assert.equal((await form('GooglePat', { origin: 'https://evil.example' })).status, 403);
  const made = await form('GooglePat', { origin: B }); assert.equal(made.status, 303); assert.equal(made.headers.get('location'), '/welcome'); patCookie = jar(made, '');
  assert.match(patCookie, /commons_session=|=h_/); assert.equal((await go('/welcome', { cookie: patCookie })).status, 200, 'signed in');
  const members = fs.readFileSync(path.join(DATA, 'members.json'), 'utf8'); const pat = Object.values(JSON.parse(members)).flat().find?.((m) => m && m.name === 'GooglePat') || JSON.parse(members).find?.((m) => m.name === 'GooglePat');
  assert.ok(members.includes('"google":"1122334455"') || members.includes('"google": "1122334455"'), 'the account number is kept');
  for (const secret of ['someone@example.com', 'Real Name', 'G-ACCESS-TOKEN', 'g-secret']) for (const f of fs.readdirSync(DATA)) { const p = path.join(DATA, f); if (fs.statSync(p).isFile()) assert.ok(!fs.readFileSync(p, 'utf8').includes(secret), `${secret} is not written to ${f}`); }
  assert.ok(pat === undefined || pat.social_only === true, 'a public account, not a Commons member');
});

test('the same Google account signs back in to the same profile, and lands signed in', async () => {
  const a = await begin('google', '', '?next=/cohabi'); const cb = await go(`/auth/google/callback?code=c&state=${a.u.searchParams.get('state')}`, { cookie: a.cookie });
  assert.equal(cb.status, 200); const html = await cb.text(); assert.match(html, /Welcome back, GooglePat/); assert.match(html, /http-equiv="refresh" content="0;url=\/cohabi"/, 'moves on by itself, to where the person was going');
  assert.match(cb.headers.getSetCookie().join('\n'), /SameSite=Strict/);
  const off = await begin('google', '', '?next=https://evil.example/x'); const cb2 = await go(`/auth/google/callback?code=c&state=${off.u.searchParams.get('state')}`, { cookie: off.cookie }); assert.match(await cb2.text(), /url=\/welcome\?auto=1"/, 'an off-site destination is dropped');
});

test('a signed-in person can add GitHub; that GitHub account cannot then be taken by another profile', async () => {
  const a = await begin('github', patCookie); const cb = await go(`/auth/github/callback?code=c&state=${a.u.searchParams.get('state')}`, { cookie: a.cookie });
  assert.match(await cb.text(), /GitHub is now connected to GooglePat/); assert.ok(seen.some((s) => s.url === '/h/user' && s.auth === 'Bearer H-ACCESS-TOKEN'));
  const again = await begin('github'); const cb2 = await go(`/auth/github/callback?code=c&state=${again.u.searchParams.get('state')}`); assert.equal(cb2.status, 400);
  const fresh = await begin('github'); const cb3 = await go(`/auth/github/callback?code=c&state=${fresh.u.searchParams.get('state')}`, { cookie: fresh.cookie }); assert.match(await cb3.text(), /Welcome back, GooglePat/, 'GitHub alone now signs in to that profile');
  const other = await fetch(B + '/api/humans', { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ name: 'SomeoneElse', bio: 'x' }) }); const oc = jar(other, '');
  const steal = await begin('google', oc); const cb4 = await go(`/auth/google/callback?code=c&state=${steal.u.searchParams.get('state')}`, { cookie: steal.cookie }); assert.match(await cb4.text(), /Welcome back, GooglePat/, 'a bound account signs in to its own profile; it is never moved to whoever is signed in');
});

test('an answer issued for some other app is refused', async () => {
  const keep = googleClaims; googleClaims = () => ({ ...keep(), aud: 'another-app', sub: '999' });
  const a = await begin('google'); const cb = await go(`/auth/google/callback?code=c&state=${a.u.searchParams.get('state')}`, { cookie: a.cookie }); assert.equal(cb.status, 502); googleClaims = keep;
});

// Setu, 2026-11-11 (Ash's finding, R&D m_mwcn6p2b401bd01c): a "Connect Google" started by a signed-in person must not
// finish after that session has ended. Otherwise someone else at the same browser can attach their own account to the
// first person's profile within the ten minutes, and sign in as them from then on.
test('a connection started before sign-out cannot be finished after it', async () => {
  const keep = googleClaims; googleClaims = () => ({ ...keep(), sub: '5550001' });
  const made = await fetch(B + '/api/humans', { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ name: 'LeftTheDesk', bio: 'x' }) });
  const signedIn = jar(made, ''); assert.equal((await go('/welcome', { cookie: signedIn })).status, 200, 'signed in to start with');
  const a = await begin('google', signedIn); const state = a.u.searchParams.get('state');
  const oldState = a.cookie.split('; ').find((c) => c.startsWith('cx_oauth='));
  const out = await go('/logout', { cookie: a.cookie }); const after = jar(out, a.cookie);
  assert.ok(!/cx_oauth=/.test(after), 'signing out also drops the unfinished connection');
  const viaBrowser = await go(`/auth/google/callback?code=c&state=${state}`, { cookie: after });
  assert.doesNotMatch(await viaBrowser.text(), /now connected to LeftTheDesk/, 'the same tab, after sign-out, does not connect');
  const viaReplay = await go(`/auth/google/callback?code=c&state=${state}`, { cookie: oldState });
  assert.equal(viaReplay.status, 400); assert.doesNotMatch(await viaReplay.text(), /now connected to LeftTheDesk/, 'a kept copy of the old cookie does not connect either');
  assert.ok(!fs.readFileSync(path.join(DATA, 'members.json'), 'utf8').includes('5550001'), 'nothing was bound');
  googleClaims = keep;
});

test('a connection by a still-signed-in person still works', async () => {
  const keep = googleClaims; googleClaims = () => ({ ...keep(), sub: '5550002' });
  const made = await fetch(B + '/api/humans', { method: 'POST', headers: { 'content-type': 'application/json', 'x-commons': '1' }, body: JSON.stringify({ name: 'StillHere', bio: 'x' }) });
  const signedIn = jar(made, ''); const a = await begin('google', signedIn);
  const cb = await go(`/auth/google/callback?code=c&state=${a.u.searchParams.get('state')}`, { cookie: a.cookie });
  assert.match(await cb.text(), /Google is now connected to StillHere/); googleClaims = keep;
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } try { fake.close(); } catch { /* done */ } });

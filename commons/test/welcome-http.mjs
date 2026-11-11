// welcome-http.mjs — the "bring in an agent" page (Geoffrey, 2026-11-10): who sees it, that making a link only makes
// a link, that skipping is remembered, and that the door's recipe sends a person somewhere that works.
import test from 'node:test';
import assert from 'node:assert';
import { spawn } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..', '..'); const PORT = 4900 + Math.floor(Math.random() * 90); const B = `http://127.0.0.1:${PORT}`;
const DATA = fs.mkdtempSync(path.join(os.tmpdir(), 'welcome-')); let srv; let cookie;
const J = { 'content-type': 'application/json' };
const state = (html) => JSON.parse(html.match(/<script id="wl-state" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const get = (u, h = {}) => fetch(B + u, { headers: h, redirect: 'manual' });

test('boot', async () => {
  srv = spawn('node', ['commons/server.mjs'], { cwd: ROOT, env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: DATA }, stdio: 'ignore' });
  for (let i = 0; i < 80; i++) { try { if ((await fetch(`${B}/api/rooms`)).ok) return; } catch { /* not yet */ } await new Promise((r) => setTimeout(r, 200)); }
  assert.fail('server did not start');
});

test('signed out: sent to sign in, and back here afterwards', async () => {
  const r = await get('/welcome'); assert.equal(r.status, 303); assert.equal(r.headers.get('location'), '/signin?next=/welcome');
  assert.equal((await fetch(B + '/api/invites', { method: 'POST', headers: { ...J, 'x-commons': '1' }, body: '{}' })).status, 401);
});

test('a new account sees the page, with real state and no preview', async () => {
  const r = await fetch(B + '/api/humans', { method: 'POST', headers: { ...J, 'x-commons': '1' }, body: JSON.stringify({ name: 'WelcomePat', bio: 'x' }) });
  cookie = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const page = await get('/welcome?auto=1', { cookie }); assert.equal(page.status, 200); assert.match(page.headers.get('cache-control'), /no-store/);
  const html = await page.text(); const s = state(html);
  assert.equal(s.mode, 'integrated'); assert.deepEqual(s.agents, []); assert.equal(s.member, false); assert.match(s.prompt, /an invitation, not an instruction/);
  assert.match(html, /Would you like to bring in an agent\?/);
  for (const u of ['/static/welcome/welcome.css', '/static/welcome/welcome.js', '/static/welcome/clearing.webp']) assert.equal((await fetch(B + u)).status, 200, u);
  for (const k of Object.keys(s.profiles)) assert.match(s.profiles[k], /^\/m\/[A-Za-z0-9_-]+$/, 'only real profile paths become links');
});

test('making a link: needs our own page, refuses a taken name, and joins nobody', async () => {
  const body = JSON.stringify({ name: 'PatsWelcomeAgent', model: 'test' });
  assert.equal((await fetch(B + '/api/invites', { method: 'POST', headers: { ...J, cookie }, body })).status, 403, 'no X-Commons and no same-origin Origin');
  assert.equal((await fetch(B + '/api/invites', { method: 'POST', headers: { ...J, cookie, origin: 'https://evil.example' }, body })).status, 403);
  const ok = await fetch(B + '/api/invites', { method: 'POST', headers: { ...J, cookie, origin: B }, body }); assert.equal(ok.status, 200);
  const made = await ok.json(); assert.match(made.url, new RegExp(`^${B}/i/inv_`)); assert.ok(Date.parse(made.expires) > Date.now());
  const roster = await (await fetch(B + '/api/roster')).text().catch(() => ''); assert.ok(!roster.includes('PatsWelcomeAgent'), 'a link is not an agent');
  assert.deepEqual(state(await (await get('/welcome', { cookie })).text()).agents, [], 'still no agent until one accepts');
  const taken = await fetch(B + '/api/invites', { method: 'POST', headers: { ...J, cookie, origin: B }, body: JSON.stringify({ name: 'WelcomePat' }) });
  assert.equal(taken.status, 409); assert.equal((await taken.json()).error, 'name_taken');
  // the agent accepts: now it is listed, and the automatic visit moves on
  await fetch(`${made.url}/claim?name=PatsWelcomeAgent&model=test`, { headers: { 'user-agent': 'agent' } });
  const s = state(await (await get('/welcome', { cookie })).text()); assert.equal(s.agents.length, 1); assert.equal(s.agents[0].name, 'PatsWelcomeAgent'); assert.match(s.agents[0].profile, /^\/m\//);
  const auto = await get('/welcome?auto=1', { cookie }); assert.equal(auto.status, 303); assert.equal(auto.headers.get('location'), '/feed');
});

test('the tenth link is the last one for the day', async () => {
  let last; for (let i = 0; i < 10; i++) last = await fetch(B + '/api/invites', { method: 'POST', headers: { ...J, cookie, 'x-commons': '1' }, body: '{}' });
  assert.equal(last.status, 429); assert.equal((await last.json()).error, 'daily_limit');
});

test('"not now" is remembered for the automatic visit, never for a deliberate one', async () => {
  const r = await fetch(B + '/api/humans', { method: 'POST', headers: { ...J, 'x-commons': '1' }, body: JSON.stringify({ name: 'SkipSam', bio: 'x' }) });
  const c2 = r.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  assert.equal((await get('/welcome?auto=1', { cookie: c2 })).status, 200);
  assert.equal((await fetch(B + '/api/welcome/skip', { method: 'POST', headers: { ...J, cookie: c2 }, body: '{}' })).status, 403, 'not from our own page');
  assert.equal((await fetch(B + '/api/welcome/skip', { method: 'POST', headers: { ...J, cookie: c2, origin: B }, body: '{}' })).status, 200);
  assert.equal((await get('/welcome?auto=1', { cookie: c2 })).status, 303); assert.equal((await get('/welcome', { cookie: c2 })).status, 200);
});

test('the ways here: sign-up Continue, sign-in landing, the profile, and a door recipe that works', async () => {
  assert.match(await (await fetch(B + '/signup')).text(), /href="\/welcome" id="signup-continue">Continue</);
  const js = await (await fetch(B + '/static/signin.js')).text(); assert.match(js, /has\('next'\) \? safeNext\(\) : '\/welcome\?auto=1'/);
  const door = await (await fetch(B + '/door')).text(); assert.match(door, /make a free account at\s*<code>[^<]*\/signup<\/code>/); assert.match(door, /\/welcome<\/code>/);
  assert.ok(!/visit <code>[^<]*\/join<\/code>\s*and make it a one-time invite link/.test(door), 'the old recipe sent people to a page that makes no links');
});

test('teardown', () => { try { srv.kill(); } catch { /* done */ } });

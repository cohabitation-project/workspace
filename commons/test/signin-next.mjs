// Every protected page sends a signed-out visitor to /signin?next=<that same page>, and a signed-in member gets
// the page. Then signin.js is checked to send a person on only to a same-site path.
//
// Source of the table: every `'/signin?next=…'` redirect in commons/server.mjs for a GET page (grep "signin?next").
// Not covered: POST routes that redirect the same way (POST /invite, POST /account/delete), the OAuth
// consent page (next carries the whole /oauth/authorize query; covered by agent-connect tests), and
// /label/l/:id/edit when signed in (it needs a listing; signed-out is checked with a made-up id because the
// redirect happens before any lookup).
//
// Aliases: a few routes answer under two paths and put the canonical one in `next` (/studio -> /page/new,
// /me/house -> /house, the Stripe return path -> /wallet). They are listed with `next:` so the alias is on record.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const ROOT = path.resolve(import.meta.dirname, '..', '..');

// path: what is requested. next: what /signin?next= must carry (default: the same string).
// steward: a signed-in ordinary member is answered 403 by design (a page for stewards only).
const PAGES = [
  { path: '/journal' },
  { path: '/me' },
  { path: '/house' },
  { path: '/me/house', next: '/house' },
  { path: '/jobs/new' },
  { path: '/feedback', steward: true },
  { path: '/feed/saved' },
  { path: '/social?tab=history', membersOnly: true },
  { path: '/social?tab=commons&room=general', membersOnly: true },   // a query must survive the round trip
  { path: '/messages' },
  { path: '/messenger' },
  { path: '/account' },
  { path: '/account/data' },
  { path: '/account/delete' },
  { path: '/applications' },
  { path: '/invite' },
  { path: '/welcome' },
  { path: '/cobox' },
  { path: '/wishlist/add', membersOnly: true },
  { path: '/label/mine' },
  { path: '/label/new' },
  { path: '/page/new' },
  { path: '/studio', next: '/page/new' },
  { path: '/page/new/simple' },
  { path: '/orders' },
  { path: '/label/sales' },
  { path: '/label/l/l_doesnotexist/edit', signedInSkip: true },
  { path: '/steward/recovery', steward: true },
  { path: '/share-queue', steward: true },
  // /wallet is a public page that explains itself signed out (not a sign-in redirect), so it is not listed.
  // /watch is public and read-only since 2026-11-25 (guests watch public activity before having an account).
  { path: '/my-agents' }
];

test('signin.js and safeNext only send a person to a same-site path', async () => {
  const signinSrc = fs.readFileSync(path.join(ROOT, 'commons/public/signin.js'), 'utf8');
  const uiSrc = fs.readFileSync(path.join(ROOT, 'commons/public/auth/ui.js'), 'utf8');
  // The password sign-in goes through safeNext() whenever there is a next; the code form passes next through safeNext() too.
  assert.match(signinSrc, /location\.assign\(new URLSearchParams\(location\.search\)\.has\('next'\) \? safeNext\(\)/, 'password sign-in sends on via safeNext()');
  assert.match(signinSrc, /'\?next=' \+ encodeURIComponent\(safeNext\(\)\)/, 'the six-character code form carries next through safeNext()');
  assert.doesNotMatch(signinSrc, /location\.(assign|replace|href)[^;\n]*get\('next'\)/, 'signin.js never navigates to the raw next value');
  assert.match(uiSrc, /value\.startsWith\('\/'\)/, 'safeNext requires a leading slash');
  assert.match(uiSrc, /value\.startsWith\('\/\/'\)/, 'safeNext refuses //host');

  // Run the real function. It only touches `location` after its string checks, so give it a fake one.
  globalThis.location = { origin: 'http://cohabi.test', search: '' };
  const { safeNext } = await import(path.join(ROOT, 'commons/public/auth/ui.js'));
  const cases = [
    ['?next=/jobs/new', '/jobs/new'],
    ['?next=%2Forders', '/orders'],
    ['?next=%2Fsocial%3Ftab%3Dhistory%26room%3Dgeneral', '/social?tab=history&room=general'],
    ['?next=/m/abc#journal', '/m/abc#journal'],
    ['?next=//evil.example/x', '/social'],
    ['?next=https://evil.example/', '/social'],
    ['?next=javascript:alert(1)', '/social'],
    ['?next=/%5Cevil.example', '/social'],
    ['?next=/a%20b', '/social'],
    ['?next=', '/social'],
    ['', '/social']
  ];
  for (const [search, want] of cases) assert.equal(safeNext(search), want, `safeNext(${JSON.stringify(search)})`);
});

test('every protected page signs a visitor in and brings them back to the same page', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'signin-next-'));
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, ['commons/server.mjs'], {
    cwd: ROOT,
    env: { ...process.env, ASHRAM_PORT: String(PORT), COMMONS_DATA: D, COMMONS_ARRIVE_BYPASS: 'TESTGATE' },
    stdio: 'ignore'
  });
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const get = async (url, cookie) => {
    const headers = { 'x-commons': '1' };
    if (cookie) headers.cookie = cookie;
    const r = await fetch(`${B}${url}`, { headers, redirect: 'manual' });
    await r.text();
    return r;
  };
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try { if ((await fetch(`${B}/skill.md`)).ok) { ready = true; break; } } catch { /* starting */ }
      await sleep(250);
    }
    assert.ok(ready, 'isolated Commons server started');

    const su = await fetch(`${B}/api/humans`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-commons': '1' },
      body: JSON.stringify({ name: 'NextWalker' })
    });
    assert.equal(su.status, 201, 'a member signs up');
    const cookie = (su.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(cookie, 'the member has a session cookie');

    // membersOnly: a plain signup is a social-only member, so these pages refuse it by design
    // (403, or for /social's History view a bounce to /signin that still carries the same next).
    const sameSite = (loc) => /^\/(?!\/)/.test(loc) || loc.startsWith(`${B}/`);
    const failures = [];
    for (const p of PAGES) {
      // Signed out: a redirect to /signin whose next is exactly the page asked for.
      const out = await get(p.path);
      const loc = out.headers.get('location') || '';
      if (![302, 303].includes(out.status)) { failures.push(`${p.path} signed out: status ${out.status}, wanted a 302/303 to sign in`); }
      else {
        const u = new URL(loc, B);
        const want = p.next || p.path;
        if (u.pathname !== '/signin') failures.push(`${p.path} signed out: redirects to ${loc}, not /signin`);
        else if (u.searchParams.get('next') !== want) failures.push(`${p.path} signed out: next is ${JSON.stringify(u.searchParams.get('next'))}, wanted ${JSON.stringify(want)} (Location: ${loc})`);
        // Whatever next carries must itself be something safeNext lets through.
        else if (!/^\/(?!\/)/.test(u.searchParams.get('next'))) failures.push(`${p.path} signed out: next ${u.searchParams.get('next')} is not a same-site path`);
      }
      // Signed in: the page, or a redirect that stays on the site; a steward-only page may say 403.
      if (p.signedInSkip) continue;
      const inn = await get(p.path, cookie);
      if (p.membersOnly) {
        const l2 = inn.headers.get('location') || '';
        const keeps = [302, 303].includes(inn.status) && new URL(l2, B).searchParams.get('next') === (p.next || p.path);
        if (!(inn.status === 403 || keeps || inn.status < 300)) failures.push(`${p.path} signed in as a social-only member: status ${inn.status} ${l2}, wanted 403, the page, or a sign-in bounce keeping next`);
        continue;
      }
      if (inn.status >= 300 && inn.status < 400) {
        const l2 = inn.headers.get('location') || '';
        if (!sameSite(l2)) failures.push(`${p.path} signed in: redirects off-site to ${l2}`);
        if (/\/signin(\?|$)/.test(l2)) failures.push(`${p.path} signed in: bounced back to sign in (${l2})`);
      } else if (p.steward) {
        if (inn.status !== 403) failures.push(`${p.path} signed in as an ordinary member: status ${inn.status}, wanted 403 (stewards only)`);
      } else if (inn.status >= 400) {
        failures.push(`${p.path} signed in: status ${inn.status}`);
      }
    }
    // A made-up listing's edit page must still be asked to sign in first, and keep its own path in next.
    assert.deepEqual(failures, [], `every protected page returns the visitor to itself:\n  ${failures.join('\n  ')}`);
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});

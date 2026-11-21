// What a seller can't put in a listing (Round 23, teams/build/JOBS.md): the guards on POST /api/market/listings.
//
// Route: commons/server.mjs:1734 → market.create (commons/lib/market.mjs) → checkFields → checkPrice.
// Read from the code before this file was run:
//   title  — `out.title = clip(b.title, 90)` then `if (out.title.length < 3) fail(400, 'title: 3 to 90 characters')`.
//            The message says "3 to 90", but only the LOWER bound rejects: a very long title is silently truncated
//            to 90 characters and accepted. That is pinned below as measured behaviour and named as a finding —
//            a seller's 91st character is dropped without a word. It is not a hole (nothing unbounded is stored,
//            nothing 500s), so it does not leave this file red; it is a decision for whoever owns the form.
//   price  — `Math.round(Number(p.amount) * 100) / 100`, refused unless finite and between 1 and 100000. A negative
//            amount and a non-numeric amount both land there — measured below, not assumed from the expression.
//   errors — wrap() answers `e.status` with `{ error: e.message }`, and an uncaught error with 500 'server error'
//            (server.mjs ~460). So a 5xx on a bad body means a guard is missing, not that the message is ugly.
//   render — the title is stored as written and escaped at render time (`esc` from public/md.js) on /label/l/:id
//            (h1 and <title>), /label/mine and the /label home cards. Escaping is a page concern, so this file
//            asserts BOTH halves: storage keeps the hostile characters, and no page emits them raw.
//
// Section (4) adds the same contract on the seller's own EDIT (PATCH /api/market/listings/:id, server.mjs:1735 →
// market.update, which reuses checkFields with `partial: true`). It was added because it is the same contract on the
// same record and nothing had measured it; it is a test-only addition and no route was changed.
//
// Scope, deliberately: the five bodies the job names, four reads, the PATCH section, and no other route touched. The listing contract
// (rights, license, packages, bounties) is round 17's checkout test and market.mjs's own; not re-proved here.
//
// Run: node --test commons/test/market-create-guards.mjs
//
// MUTATION RECORD (measured; each break was made in the disposable copy, run, seen red, then restored. The green run
// after the last restore is the one reported. The assertion named is the one that actually failed, not the one I
// expected to fail):
//   break 1 — market.mjs checkPrice lower bound dropped (`amount < 1 || amount > 100000` → `amount > 100000`)
//             red at: "a negative price: refused with a 4xx (a 5xx would mean no guard), got 201"
//   break 2 — every `esc(l.title)` site rewritten to `l.title` (6 in marketpage.mjs, 3 in jobspage.mjs)
//             red at: "the listing page: no raw <script>alert(1)</script> reaches the reader"
//   break 3 — the title clip shortened (`clip(b.title, 90)` → `clip(b.title, 60)`)
//             red at: "and stored at exactly 90 characters — the rest is dropped without a word" (actual 60)
// NOT mutated, and so not proved by breaking: plainRefusal's own no-stack scan (it is the helper doing the catching),
// the "a refused listing creates nothing" check, and "the API does not HTML-escape its data". Those are read and
// reasoned, not broken and caught — said plainly so nobody counts four proofs where there are three.
// Section (4) (PATCH) is NOT separately mutated: it runs through the same checkFields, so the clip break would have
// caught it as well, but it was not proved by a break of its own. Measured green: 1/1 in 0.5 s, node v24.22.3.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

// A refusal must be a plain sentence, not a dump: no stack frame, no module path, no server directory.
const STACKY = [/\n\s+at\s[^\n]*\(/, /\.mjs:\d+/, /\/node_modules\//, /\bnode:internal\b/, /\/commons\//];
function plainRefusal(body, where) {
  assert.equal(typeof body.error, 'string', `${where}: refused with a message, not an empty body`);
  assert.ok(body.error.length > 0 && body.error.length < 300, `${where}: one plain sentence, got "${String(body.error).slice(0, 120)}"`);
  for (const re of STACKY) assert.ok(!re.test(body.error), `${where}: no stack or server path in "${body.error}"`);
}

test('a hostile listing title is stored intact and rendered escaped; bad titles and prices are refused in plain words', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-create-'));
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: {
      ...process.env,
      ASHRAM_PORT: String(PORT),
      COMMONS_PORT: String(PORT),
      COMMONS_DATA: D,
      // the forest gate's test bypass, so this test can make a real member (the open signup is social-only)
      COMMONS_ARRIVE_BYPASS: 'TESTGATE',
      // deliberately NOT set: COMMONS_PAYMENTS and every Stripe key. No payment is involved in this file.
    },
    stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`${B}/skill.md`)).ok || (await fetch(`${B}/healthz`)).ok) { ready = true; break; }
      } catch { /* still starting */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'the test server did not become ready');

    const send = (method, url, body, cookie) => fetch(`${B}${url}`, {
      method,
      redirect: 'manual',
      headers: { ...(body ? { 'Content-Type': 'application/json', 'X-Commons': '1' } : {}), ...(cookie ? { cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const post = (url, body, cookie) => send('POST', url, body, cookie);
    const get = (url, cookie) => send('GET', url, null, cookie);

    // One real member, by the forest gate (the same walk as market-sales-private.mjs).
    const visitor = await (await post('/api/arrive/visitor', {})).json();
    assert.ok(visitor.vid, 'the forest gate issued a visitor id');
    await post('/api/arrive/bypass', { vid: visitor.vid, code: 'TESTGATE' });
    const entered = await post('/api/arrive/enter', { vid: visitor.vid, name: 'CreateSeller' });
    const cookie = (entered.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(cookie, 'entering the Commons gave the seller a session');
    const me = await (await get('/api/me', cookie)).json();
    const id = me.id || me.member?.id;
    assert.ok(id, 'the seller has a member id');

    // The valid listing every bad body is one field away from. Accepted, so each refusal is the changed field's doing.
    const base = {
      title: 'A print of the north window',
      text: 'One print of the north window, made this autumn. Sold as a single copy.',
      category: 'art',
      type: 'product',
      price: { mode: 'fixed', amount: 5 },
      license: 'all-rights',
      rights: true,
    };
    const refused = async (label, patch) => {
      const r = await post('/api/market/listings', { ...base, ...patch }, cookie);
      assert.equal(r.status >= 400 && r.status < 500, true, `${label}: refused with a 4xx (a 5xx would mean no guard), got ${r.status}`);
      plainRefusal(await r.json(), label);
    };

    // (1) The three bodies that must be refused, each a plain 4xx.
    await refused('an empty title', { title: '' });
    await refused('a negative price', { price: { mode: 'fixed', amount: -5 } });
    await refused('a price that is not a number', { price: { mode: 'fixed', amount: 'not a number' } });

    // Nothing was created while refusing: the seller's listings are still empty.
    const afterRefusals = await (await get(`/api/market/listings?by=${encodeURIComponent(id)}`, cookie)).json();
    assert.equal((afterRefusals.listings || []).length, 0, 'a refused listing creates nothing');

    // (2) A 10,000-character title: MEASURED — accepted, truncated to exactly 90. Named as a finding in the header:
    //     the error text promises a 90-character limit, but over-length is clipped rather than refused, and the
    //     seller is told nothing. Asserted as today's behaviour so a later change to it is a visible decision.
    const LONG = 'L'.repeat(10_000);
    const longRes = await post('/api/market/listings', { ...base, title: LONG }, cookie);
    assert.equal(longRes.status, 201, 'a 10,000-character title is accepted (measured: clipped, not refused)');
    const longListing = await longRes.json();
    assert.equal(longListing.title.length, 90, 'and stored at exactly 90 characters — the rest is dropped without a word');

    // (3) The hostile title: stored intact, rendered escaped everywhere it is shown.
    const HOSTILE = '<script>alert(1)</script>"&';
    const hostileRes = await post('/api/market/listings', { ...base, title: HOSTILE, text: 'Testing the title guard.' }, cookie);
    assert.equal(hostileRes.status, 201, 'the hostile title is accepted (escaping is the page\'s job, not the store\'s)');
    const hostile = await hostileRes.json();
    assert.equal(hostile.title, HOSTILE, 'the store keeps the title exactly as written');

    const ESCAPED = '&lt;script&gt;alert(1)&lt;/script&gt;';
    const RAW = '<script>alert(1)</script>';
    const pages = [
      ['the listing page', `/label/l/${hostile.id}`, null],
      ['the seller\'s listings page', '/label/mine', cookie],
      ['the market home', '/label', null],
    ];
    for (const [label, url, who] of pages) {
      const r = await get(url, who);
      assert.equal(r.status, 200, `${label} answers 200`);
      const body = await r.text();
      assert.ok(!body.includes(RAW), `${label}: no raw <script>alert(1)</script> reaches the reader`);
      if (label !== 'the market home') assert.ok(body.includes(ESCAPED), `${label}: the title is shown, escaped`);
    }

    // The JSON keeps the plain text: escaping at the edge, data in the middle. Pinned so nobody "fixes" a page
    // problem by mangling what is stored.
    const api = await (await get(`/api/market/listings/${hostile.id}`)).json();
    assert.equal(api.title, HOSTILE, 'the listing API returns the stored title unchanged');
    assert.ok(!JSON.stringify(api).includes('&lt;'), 'the API does not HTML-escape its data');

    // (4) The same contract on the seller's own edit: PATCH /api/market/listings/:id (server.mjs:1735 → market.update
    //     → checkFields with `partial: true`). Measured, not assumed from the create path.
    const patchListing = (body) => send('PATCH', `/api/market/listings/${hostile.id}`, body, cookie);
    const refusedPatch = async (label, body) => {
      const r = await patchListing(body);
      assert.equal(r.status >= 400 && r.status < 500, true, `PATCH ${label}: refused with a 4xx (a 5xx would mean no guard), got ${r.status}`);
      plainRefusal(await r.json(), `PATCH ${label}`);
    };
    await refusedPatch('an empty title', { title: '' });
    await refusedPatch('a title of spaces only', { title: '   ' });
    await refusedPatch('a negative price', { price: { mode: 'fixed', amount: -5 } });
    await refusedPatch('a price that is not a number', { price: { mode: 'fixed', amount: 'not a number' } });
    await refusedPatch('nothing to change', {});
    await refusedPatch('only unknown fields', { nonsense: true });

    const untouched = await (await get(`/api/market/listings/${hostile.id}`)).json();
    assert.equal(untouched.title, HOSTILE, 'a refused PATCH leaves the listing exactly as it was');
    assert.equal(untouched.price.amount, 5, 'and its price with it');

    // FINDING (measured, pinned as today's behaviour, not filed as a hole): the min-length check only ever sees a
    // string, because the title is coerced first. An object becomes the literal text "[object Object]" — 18 characters
    // that sail through "3 to 90" and land on a live listing with a 200. Only the seller can do this to their own
    // listing, and nothing 500s, so it stays green here — but whoever owns the listing form should decide: refuse a
    // non-string title, or coerce it on purpose. Section (2)'s truncation finding is the same shape.
    const coerced = await patchListing({ title: {} });
    assert.equal(coerced.status, 200, 'a title that is an object is accepted, not refused (measured finding)');
    assert.equal((await coerced.json()).title, '[object Object]', 'and stored as the string "[object Object]"');

    const longPatch = await patchListing({ title: LONG });
    assert.equal(longPatch.status, 200, 'PATCH: a 10,000-character title is accepted (measured: clipped, not refused)');
    assert.equal((await longPatch.json()).title.length, 90, 'PATCH: and clipped to exactly 90, the same silent truncation');

    const hostilePatch = await patchListing({ title: HOSTILE });
    assert.equal(hostilePatch.status, 200, 'PATCH: the hostile title is accepted');
    assert.equal((await hostilePatch.json()).title, HOSTILE, 'PATCH: and stored exactly as written');
    for (const [label, url] of [['the listing page', `/label/l/${hostile.id}`], ['the seller\'s listings page', '/label/mine']]) {
      const body = await (await get(url, cookie)).text();
      assert.ok(!body.includes(RAW), `${label} after a PATCH: no raw <script>alert(1)</script> reaches the reader`);
      assert.ok(body.includes(ESCAPED), `${label} after a PATCH: the new title is shown, escaped`);
    }
  } finally {
    srv.kill();
  }
});

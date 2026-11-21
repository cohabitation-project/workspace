// What the market API tells a stranger: the signed-out half of every market read.
//
// Round 22 (teams/build/JOBS.md, DeepSeek). The market's write side is covered by now (checkout guards, seller edit,
// sales/orders privacy, fulfilment-link ownership). This file is the READ side, signed out: what a person who is not
// a member, holding no cookie and no token, is told about a listing, its maker, and a question someone asked on it.
//
// The routes under test — every `app.get('/api/market…` in commons/server.mjs (read 2026-11-21):
//   GET /api/market/listings              server.mjs:1732 → market.list({category, provider, type, q, by, free})
//                                             + {payments: 'not open: no money moves yet'}
//   GET /api/market/listings/:id          server.mjs:1733 → market.get(id) = the listing + its `asks`
//   GET /api/market/listings/:id/checkout server.mjs:1768 → checkout.quote(id, {pkg})
//   GET /api/market/listings/:id/fulfillment  server.mjs:1740 → SKIPPED, see below.
// That is the whole set. The other market routes are writes (POST/PATCH/DELETE at 1734, 1735, 1736, 1741-1743, 1770,
// 1794) and are not reads a stranger can make.
//
// SKIPPED, deliberately: GET …/:id/fulfillment answers anyone with the maker's fulfilment link (provider + product id).
// That is the known finding already pinned red in commons/test/market-fulfillment-guards.mjs and it waits on
// Geoffrey's "seller only" (teams/build/JOBS.md, "Next round"). It is not re-leaked here; this file must be green.
//
// What this file asserts, and why:
//   (1) The statuses. A stranger gets 200 from the list, the listing and the quote; a made-up listing id is a 404 on
//       both the listing and its quote, not a 200 with an empty body. No signed-out market read sets a cookie: a read
//       must never start a session.
//   (2) The secrets. One member rotates their recovery code (POST /api/me/recovery — the real credential that gets a
//       member back into their account) and asks a question. Then: that recovery code, the member's session token, any
//       Bearer string, any long hex blob and any email address must appear in NO signed-out market body. This is the
//       assertion that would catch a future `...member` spread into a listing or a quote.
//   (3) No forbidden key anywhere in the returned JSON tree: password, secret, token, cookie, session, recovery, email,
//       hash, salt, stripe, account_id, bank, journal, consent, visibility, private. It walks the object recursively,
//       so a new nested field cannot slip in unread. Keys only — prose is not matched, so a listing that talks about a
//       password in its text does not turn this red.
//   (4) The public half IS public, asserted as design so a later reader cannot call it a leak: the listing's title, its
//       maker's name and member id (member ids are public — they are the /m/<id> address), and the asker's name and id
//       on their question, exactly what /label/l/:id prints. The page says so in words: "Questions — Public, like
//       everything in the Commons". The page and the API are checked against the same credential sweep, so neither can
//       drift into printing something the other does not.
//
// Measured, not asserted (a t.diagnostic in the output): a WITHDRAWN listing still answers 200 on
// GET /api/market/listings/:id (market.get, market.mjs:216, does not filter on status) while its quote is a 404
// (checkout.quote refuses a non-live listing). That is not a private-data leak — nothing new is exposed — but a seller
// who withdraws a listing expecting it gone gets a 404 from the buy path and a 200 from the API. Reported for a
// decision, not fixed here: this file touches no route.
//
// Run: node --test commons/test/market-api-signed-out.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

// Keys that must never reach a signed-out market read, matched against KEY names in the JSON tree.
const FORBIDDEN_KEY = /password|passwd|secret|token|cookie|session|recovery|email|hash|salt|stripe|account_id|bank|iban|journal|consent|visibilit|private/i;

function walkKeys(value, at, out) {
  if (Array.isArray(value)) value.forEach((v, i) => walkKeys(v, `${at}[${i}]`, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) { out.push([`${at}.${k}`, k]); walkKeys(v, `${at}.${k}`, out); }
  }
  return out;
}
function walkStrings(value, out = []) {
  if (typeof value === 'string') out.push(value);
  else if (Array.isArray(value)) value.forEach((v) => walkStrings(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => walkStrings(v, out));
  return out;
}
// Every value of a credential-looking key, anywhere in a response: the recovery code above all.
function credentialValues(value, out = []) {
  if (Array.isArray(value)) value.forEach((v) => credentialValues(v, out));
  else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      if (typeof v === 'string' && /recovery|code|token|secret/i.test(k) && v.length >= 6) out.push(v);
      credentialValues(v, out);
    }
  }
  return out;
}
const tokenOf = (cookie) => cookie.slice(cookie.indexOf('=') + 1);

test('a stranger reading the market API gets the listing, never a credential', async (t) => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-api-out-'));
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: {
      ...process.env,
      ASHRAM_PORT: String(PORT),
      COMMONS_PORT: String(PORT),
      COMMONS_DATA: D,
      // the forest gate's test bypass, so this test can make real members (the open signup is social-only)
      COMMONS_ARRIVE_BYPASS: 'TESTGATE',
      // deliberately NOT set: COMMONS_PAYMENTS and every Stripe key. Payments are closed in this file.
    },
    stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`${B}/healthz`)).ok || (await fetch(`${B}/skill.md`)).ok) { ready = true; break; }
      } catch { /* still starting */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'the test server did not become ready');

    const send = (method, url, body, cookie) => fetch(`${B}${url}`, {
      method,
      redirect: 'manual',
      headers: {
        ...(body ? { 'Content-Type': 'application/json', 'X-Commons': '1' } : {}), // X-Commons: the CSRF guard
        ...(cookie ? { cookie } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const post = (url, body, cookie) => send('POST', url, body, cookie);
    const get = (url, cookie) => send('GET', url, null, cookie);

    // Two real members, by the forest gate (same walk as market-sales-private.mjs).
    const member = async (name) => {
      const visitor = await (await post('/api/arrive/visitor', {})).json();
      assert.ok(visitor.vid, 'the forest gate issued a visitor id');
      await post('/api/arrive/bypass', { vid: visitor.vid, code: 'TESTGATE' });
      const entered = await post('/api/arrive/enter', { vid: visitor.vid, name });
      const cookie = (entered.headers.get('set-cookie') || '').split(';')[0];
      assert.ok(cookie, `entering the Commons gave ${name} a session`);
      const me = await (await get('/api/me', cookie)).json();
      const id = me.id || me.member?.id;
      assert.ok(id, `${name} has a member id`);
      return { cookie, id, name };
    };
    const maker = await member('ApiOutMaker');
    const asker = await member('ApiOutAsker');

    // The maker lists something; the asker asks one question on it.
    const made = await post('/api/market/listings', {
      title: 'A print of the north window',
      text: 'One print of the north window, made this autumn. Sold as a single copy. No payment is taken here.',
      category: 'art',
      type: 'product',
      price: { mode: 'fixed', amount: 5 },
      license: 'all-rights',
      rights: true,
    }, maker.cookie);
    assert.equal(made.status, 201, 'a member can list something');
    const listing = await made.json();
    assert.ok(listing.id, 'the new listing has an id');

    const ASK = 'Is the print signed on the back?';
    const asked = await post(`/api/market/listings/${listing.id}/ask`, { text: ASK }, asker.cookie);
    assert.equal(asked.status, 201, 'a signed-in member can ask about a listing');

    // A real credential, so the sweep has something worth keeping out: the asker rotates their recovery code — the
    // code that gets a member back into their account. It must never be in a public read. (POST body {} only so the
    // CSRF header is sent; the route ignores the body.)
    const rotated = await post('/api/me/recovery', {}, asker.cookie);
    assert.equal(rotated.status, 200, 'a member can rotate their own recovery code');
    const creds = credentialValues(await rotated.json());
    assert.ok(creds.length > 0, 'rotating the recovery code returned a code (the canary this test needs)');
    const sessionToken = tokenOf(asker.cookie);
    assert.ok(sessionToken.length >= 16, 'the session cookie carries a real token');

    // ---- the reads, signed out ----
    const reads = [
      ['/api/market/listings', 200],
      ['/api/market/listings?q=window', 200],
      [`/api/market/listings?by=${maker.id}`, 200],
      [`/api/market/listings/${listing.id}`, 200],
      [`/api/market/listings/${listing.id}/checkout`, 200],
      ['/api/market/listings/l_doesnotexist00', 404],
      ['/api/market/listings/l_doesnotexist00/checkout', 404],
    ];
    const bodies = [];
    for (const [url, status] of reads) {
      const r = await get(url);
      const text = await r.text();
      assert.equal(r.status, status, `signed out, GET ${url} answers ${status}`);
      assert.equal(r.headers.get('set-cookie'), null, `signed out, GET ${url} sets no cookie`);
      bodies.push([url, text]);
    }

    // (2) No credential and no token-shaped string in any of them.
    for (const [url, text] of bodies) {
      assert.ok(!text.includes(sessionToken), `GET ${url} does not carry the session token`);
      for (const cred of creds) assert.ok(!text.includes(cred), `GET ${url} does not carry the recovery code (${cred.slice(0, 2)}…)`);
      assert.ok(!/Bearer\s/i.test(text), `GET ${url} carries no bearer token`);
      assert.ok(!/\b[a-f0-9]{32,}\b/.test(text), `GET ${url} carries no long hex blob (session/token shaped)`);
      assert.ok(!/[\w.+-]+@[\w-]+\.[\w.]+/.test(text), `GET ${url} carries no email address`);
    }

    // (3) No forbidden key anywhere in the returned JSON trees.
    for (const [url, text] of bodies) {
      let json;
      try { json = JSON.parse(text); } catch { continue; } // a 404 body that is not JSON is nothing to walk
      const bad = walkKeys(json, 'body', []).filter(([, k]) => FORBIDDEN_KEY.test(k));
      assert.deepEqual(bad, [], `GET ${url} exposes no private key (found: ${bad.map(([p, k]) => `${p} (${k})`).join(', ')})`);
    }

    // (4) The public half is public, by design, exactly as the listing page prints it.
    const one = JSON.parse(bodies.find(([u]) => u === `/api/market/listings/${listing.id}`)[1]);
    assert.equal(one.title, 'A print of the north window', 'the listing JSON carries the title');
    assert.equal(one.by.name, 'ApiOutMaker', "the maker's name is public (the page shows it)");
    assert.equal(one.by.id, maker.id, "the maker's member id is public — it is the address of their page, /m/<id>");
    assert.ok((one.asks || []).some((a) => a.text === ASK), 'the question is in the listing JSON (public by design)');
    const q = (one.asks || []).find((a) => a.text === ASK);
    assert.equal(q.by.name, 'ApiOutAsker', "the asker's name is on their question (the page prints it)");
    assert.equal(q.by.id, asker.id, "the asker's member id is on their question, as on any public post");
    assert.ok(!walkStrings(one).includes(asker.cookie), "the asker's cookie is not a value anywhere in the listing JSON");

    // The page agrees with the API, and holds no credential either.
    const page = await get(`/label/l/${listing.id}`);
    assert.equal(page.status, 200, 'the listing page answers a stranger');
    const pageText = await page.text();
    assert.equal(page.headers.get('set-cookie'), null, 'the listing page sets no cookie');
    assert.ok(pageText.includes(ASK), 'the page prints the question publicly (by design)');
    assert.ok(!pageText.includes(sessionToken), 'the page does not carry the session token');
    for (const cred of creds) assert.ok(!pageText.includes(cred), 'the page does not carry the recovery code');

    // Measured, not asserted: what a withdrawn listing answers (see the header note).
    const withdrawn = await post(`/api/market/listings/${listing.id}/withdraw`, { reason: 'test' }, maker.cookie);
    const afterJson = await get(`/api/market/listings/${listing.id}`);
    const afterQuote = await get(`/api/market/listings/${listing.id}/checkout`);
    t.diagnostic(`withdraw → ${withdrawn.status}; withdrawn listing JSON → ${afterJson.status}; its quote → ${afterQuote.status}`);
  } finally {
    srv.kill();
  }
});
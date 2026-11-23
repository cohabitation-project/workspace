// What the market API tells a stranger: every GET route under /api/market, read with no cookie at all.
//
// Round 22 (teams/build/JOBS.md, DeepSeek). Rounds 17-21 proved the checkout guards, the listing page's promise,
// who may edit a listing, and who may read an order. This file is the other side of the same object: what an
// anonymous reader — a crawler, a scraped bot, someone holding the link and nothing else — gets back from the API.
//
// THE ROUTES, read out of commons/server.mjs before writing this file (all GET):
//   1732  /api/market/listings                  → market.list({...query}) + {payments: 'not open: …'}
//   1733  /api/market/listings/:id              → market.get(id) = the listing + its `asks`
//   1768  /api/market/listings/:id/checkout     → checkout.quote(id) = {listing, title, seller, amount, currency, payable, why}
//         /api/market/listings/:id/merch        → merchsets.view(id) = {listing, items:[]} for art on no products; never `by`
//   1740  /api/market/listings/:id/fulfillment  → SKIPPED, see below
// Everything else under /api/market is a write (create, edit, ask, withdraw, checkout, fulfillment link/unlink,
// release). Those are covered by other files: market-seller-edit, market-sales-private, the checkout guards.
//
// SKIPPED, on purpose, and named: GET …/fulfillment (server.mjs:1740) answers anyone with the maker's provider
// link. That is a known private-data finding, written down in teams/build/JOBS.md and pinned by
// commons/test/market-fulfillment-guards.mjs. It waits on Geoffrey's word ("seller only") before anyone changes it.
// This file must be green to merge, so it does not re-assert that leak; it names it instead. The route-coverage
// check below still counts it, so it cannot be quietly forgotten either.
//
// ADDED beyond the letter of the job, because it is the most sensitive read in the market family:
//   GET /api/payments/account → checkout.payoutAccount(marketWriter(req)), a seller's payout account.
//   Signed out it must be a 401, not a 200 with an empty object — an empty object is a "success" shape that a later
//   caller could mistake for "this member has no account".
//
// WHAT THIS FILE PROVES, and what it does not:
//   Proves: with no cookie, the three examined market GET routes answer, they answer with the public listing data
//   and the public questions by design, they carry no credential-shaped or account-shaped value, and the payout
//   route refuses. Plus: a new GET route under /api/market fails this file until someone examines it.
//   Does not prove: that a signed-in member cannot read another member's private data (that is
//   market-sales-private and the order tests), nor anything about the money path (payments are closed here).
//
// The route-coverage check is what keeps this file honest over time: it reads server.mjs's source and compares the
// set of `app.get('/api/market…')` paths against the four named above. If a fifth appears, the assertion names it
// and says what to do. A test that only checks today's routes decays the moment someone adds one.
//
// Mutation-checked 2026-11-21, measured, in a throwaway runtime (no package.json in the snapshot: copytree, a
// private package.json, a stub src/llm.js exporting `chat`, `npm install express@4 ws dotenv`, node v24.22.3).
// Three breaks, run one at a time, and the assertion that actually caught each (all three red, then green restored):
//   market.get also returns `sellerEmail: 'leak@example.com'`
//       → "carries an email address to a stranger", raised by scan() at GET /api/market/listings/:id
//   a new route, `app.get('/api/market/newthing', …)`, added to server.mjs
//       → "a GET route under /api/market is not examined by this file: /api/market/newthing" (the coverage check)
//   the `asks` stripped from the single-listing read (`asks: []`)
//       → "the question is public by design (the listing page says so)"
// Note what these do NOT cover: no mutation was run against the payout-account check or the withdrawn-listing
// finding, so those two assertions are measured-true but not yet proven to bite.
//
// Run: node --test commons/test/market-api-signed-out.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

// The GET routes this file has read and decided about. `skip` means: named, not asserted, with the reason.
const EXAMINED = [
  { path: '/api/market/listings' },
  { path: '/api/market/listings/:id' },
  { path: '/api/market/listings/:id/checkout' },
  { path: '/api/market/listings/:id/merch' },
  { path: '/api/market/listings/:id/fulfillment', skip: 'known private-data finding, waiting on Geoffrey; pinned by market-fulfillment-guards.mjs' },
];
// Shapes a stranger must never receive from the market. Deliberately blunt: a false positive is cheap to fix, a
// missed credential is not.
const FORBIDDEN = [
  [/[\w.+-]+@[\w-]+\.[\w-]{2,}/, 'an email address'],
  [/password/i, 'a password field'],
  [/recovery_?code/i, 'a recovery code field'],
  [/\bsk_(test|live)_/, 'a Stripe secret key'],
  [/\b(session|cookie|bearer)\b/i, 'a session or cookie value'],
];

test('a stranger reading the market API gets the public listing and nothing that belongs to anyone', async () => {
  // (0) Route coverage, read from the source rather than from memory.
  {
    const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'server.mjs'), 'utf8');
    const found = new Set();
    for (const m of src.matchAll(/app\.get\(\s*['"](\/api\/market[^'"]*)['"]/g)) found.add(m[1]);
    const known = new Set(EXAMINED.map((e) => e.path));
    const unknown = [...found].filter((p) => !known.has(p));
    const gone = [...known].filter((p) => !found.has(p));
    assert.deepEqual(unknown, [], `a GET route under /api/market is not examined by this file: ${unknown.join(', ')} — read it, decide what it may show a stranger, add it to EXAMINED, and assert its status here`);
    assert.deepEqual(gone, [], `this file examines a market GET route server.mjs no longer has: ${gone.join(', ')} — drop it from EXAMINED rather than keep a test that proves nothing`);
  }

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
      // deliberately NOT set: COMMONS_PAYMENTS and every Stripe key. No payment happens in this file.
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
    const seller = await member('ApiSeller');
    const asker = await member('ApiAsker');

    // A live listing, and one question on it. Nothing else exists in this data directory, so every string found in
    // a response below came from here — which is what makes the "no credential-shaped value" scan meaningful.
    const made = await post('/api/market/listings', {
      title: 'A bowl turned from oak',
      text: 'One bowl, turned from a single piece of oak and oiled. A single copy, sold once.',
      category: 'art',
      type: 'product',
      price: { mode: 'fixed', amount: 5 },
      license: 'all-rights',
      rights: true,
    }, seller.cookie);
    assert.equal(made.status, 201, 'a member can list something');
    const listing = await made.json();
    assert.ok(listing.id, 'the new listing has an id');

    const QUESTION = 'How wide is the bowl across the rim?';
    const asked = await post(`/api/market/listings/${listing.id}/ask`, { text: QUESTION }, asker.cookie);
    assert.equal(asked.status, 201, 'a member can ask about a listing');

    // Every body this file reads, kept so the credential scan runs over all of them at the end, including the
    // routes that legitimately carry member names.
    const bodies = [];
    const read = async (url) => {
      const r = await get(url); // no cookie anywhere in this file's reads
      const text = await r.text();
      bodies.push([url, text]);
      return { r, text };
    };
    const scan = (where, text) => {
      for (const [re, what] of FORBIDDEN) {
        assert.ok(!re.test(text), `${where} carries ${what} to a stranger: ${String(text).slice(0, 300)}`);
      }
    };

    // (1) The list of listings: public, and it says the money path is shut.
    {
      const { r, text } = await read('/api/market/listings');
      assert.equal(r.status, 200, 'signed out, the listings API answers 200');
      const data = JSON.parse(text);
      assert.ok(Array.isArray(data.listings), 'the listings API returns a list');
      assert.equal(data.listings.length, 1, 'the one live listing is in it');
      assert.equal(data.listings[0].id, listing.id, 'and it is the listing just made');
      assert.equal(data.listings[0].title, 'A bowl turned from oak', 'with its public title');
      assert.equal(data.listings[0].seller_email, undefined, 'no seller email field, even as undefined-by-name');
      assert.match(String(data.payments || ''), /not open/i, 'the API says in words that payments are not open');
      scan('/api/market/listings', text);
    }

    // (2) One listing, with its questions. The question is public BY DESIGN — the listing page prints it under
    //     "Questions — Public, like everything in the Commons". Asserted so a later reader can tell design from leak.
    {
      const { r, text } = await read(`/api/market/listings/${listing.id}`);
      assert.equal(r.status, 200, 'signed out, one listing answers 200');
      const one = JSON.parse(text);
      assert.equal(one.id, listing.id, 'the listing comes back');
      assert.equal(one.title, 'A bowl turned from oak', 'with its title');
      const asks = one.asks || [];
      assert.ok(asks.some((a) => a.text === QUESTION), 'the question is public by design (the listing page says so)');
      assert.ok(asks.some((a) => a.by && a.by.name === 'ApiAsker'), "the question names who asked — also public by design, it is on the page");
      scan(`/api/market/listings/${listing.id}`, text);
    }

    // (3) The price quote. Public by its own design ("Safe to show anyone"): it names the seller and says why
    //     nothing can be bought yet. It must not carry the seller's account.
    {
      {
        // One artwork, many products (2026-11-23): public, because the same products show on the public listing page.
        // With none set it is an empty list; it never names who set them (the listing already says who made it).
        const m = await read(`/api/market/listings/${listing.id}/merch`);
        assert.equal(m.r.status, 200, 'signed out, the products list answers 200');
        const mj = JSON.parse(m.text);
        assert.equal(mj.listing, listing.id); assert.deepEqual(mj.items, [], 'no products set, none shown');
        assert.equal(mj.by, undefined, 'it carries no member id of who set them');
        scan(`/api/market/listings/${listing.id}/merch`, m.text);
      }
      const { r, text } = await read(`/api/market/listings/${listing.id}/checkout`);
      assert.equal(r.status, 200, 'signed out, the quote answers 200');
      const q = JSON.parse(text);
      assert.equal(q.listing, listing.id, 'the quote is about this listing');
      assert.equal(q.seller.name, 'ApiSeller', 'it names the seller');
      assert.equal(q.payable, false, 'nothing is payable while payments are closed');
      assert.ok((q.why || []).some((w) => /payments aren't open|not open/i.test(w)), 'and it says why, in words');
      assert.equal(q.account, undefined, 'the quote carries no payout account');
      assert.equal(q.stripe_account, undefined, 'and no Stripe account id');
      scan(`/api/market/listings/${listing.id}/checkout`, text);
    }

    // (4) The payout account: the one read in this family that is nobody else's business.
    {
      const r = await get('/api/payments/account');
      const text = await r.text();
      bodies.push(['/api/payments/account', text]);
      assert.equal(r.status, 401, 'the payout account is not a public read: signed out it is a 401, not an empty 200');
      scan('/api/payments/account', text);
    }

    // (5) A listing that does not exist, and a withdrawn one. Both must not leak a path, a stack trace or a record.
    {
      const missing = await read('/api/market/listings/l_doesnotexist');
      assert.equal(missing.r.status, 404, 'an unknown listing is a 404');
      assert.ok(!/\bat\s+\w+.*\(.*:\d+:\d+\)/.test(missing.text), 'the 404 is not a stack trace');
      assert.ok(!missing.text.includes(import.meta.dirname), 'the 404 does not print a server path');

      // MEASURED, and pinned so a decision has to be made rather than assumed: market.get (market.mjs:216) does not
      // filter on status, so a WITHDRAWN listing still answers 200 here (and its questions with it), while
      // checkout.quote refuses the same listing with a 404. The listing was public while it was live, so this is not
      // a private-data leak; it is an inconsistency between two reads of the same record. Named in finish() as a
      // finding. If the decision is that withdrawal should hide it, this assertion is the line that flips.
      const gone = await post(`/api/market/listings/${listing.id}/withdraw`, {}, seller.cookie);
      assert.ok(gone.status === 200 || gone.status === 204, 'the seller can withdraw the listing');
      const after = await read(`/api/market/listings/${listing.id}`);
      assert.equal(after.r.status, 200, 'FINDING, not a wish: a withdrawn listing still answers 200 on the API');
      const stillQuoted = await read(`/api/market/listings/${listing.id}/checkout`);
      assert.equal(stillQuoted.r.status, 404, 'while the quote for the same withdrawn listing is a 404 — the two reads disagree');
      const listAfter = await read('/api/market/listings');
      assert.equal(JSON.parse(listAfter.text).listings.length, 0, 'and the withdrawn listing is gone from the public list');
    }

    // (6) One last pass over every body this file read, so a credential that appears in a route added later (or in
    //     a shape this file did not think to look at) still fails here rather than in the wild.
    for (const [url, text] of bodies) scan(url, text);
  } finally {
    srv.kill();
  }
});

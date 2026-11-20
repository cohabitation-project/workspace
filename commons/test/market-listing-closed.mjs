// The listing PAGE while payments are closed: what a buyer and a visitor actually see at /label/l/<id>.
//
// Round 18 (teams/build/JOBS.md). Round 17's market-checkout-guards.mjs proves the route refuses (503 NOT_OPEN, no order).
// This file answers the other half: does the page a person reads make the same promise, or does it offer a Buy button
// that can only end in a 503? The page is marketpage.listingPage (commons/lib/marketpage.mjs) served by
// `GET /label/l/:id` (commons/server.mjs:1701) for anyone, signed in or not.
//
// What the code does, and therefore what this test asserts (marketpage.mjs:634-644 — the `live` gate):
//   `live = !!q && checkout.paymentsOpen() && q.seller.kind === 'human' && !q.why.some(/payout|agent|payments/)`
//   With COMMONS_PAYMENTS unset, paymentsOpen() is false, so `live` is false for every listing, and:
//     - a fixed-price listing renders `<button class="btn mk-closed" disabled>Buy · payments open soon</button>`
//       — disabled, and WITHOUT a `data-buy` attribute, which is the only hook market.js binds (:70) to open checkout.
//     - line 659 then prints the page's own NOT_OPEN line, whose wording is "Payments open soon. Nothing can be
//       bought or paid for yet: for now, free things are free and prices are asking prices."
//   So the honest-closed state on the page is: no active Buy, and a payments-closed sentence. Both are asserted below,
//   for the buyer AND for the signed-out visitor (a visitor is not shown a working Buy either).
//
// One wording note, recorded rather than smoothed over: the job names checkout.NOT_OPEN ("Payments aren't open yet…",
// commons/lib/checkout.mjs:29) as the text to look for, but the page prints marketpage's own NOT_OPEN constant
// ("Payments open soon…", marketpage.mjs:55). They say the same thing in two different sentences. The assertion accepts
// either, and checks the stronger, behavioural fact — no `data-buy` for this listing — so it cannot pass just because a
// sentence changed.
//
// NOT tested here: how the page looks (that is Aletheia-6's design), and a listing whose seller is an agent (that path
// adds a payout/agent reason to `why`; same disabled outcome, different sentence).
//
// Run: node --test commons/test/market-listing-closed.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('a listing page offers no working Buy while payments are closed, to buyer or visitor', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-listing-'));
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
      // deliberately NOT set: COMMONS_PAYMENTS and every Stripe key. This test is the payments-closed world.
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
      headers: { ...(body ? { 'Content-Type': 'application/json', 'X-Commons': '1' } : {}), ...(cookie ? { cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const post = (url, body, cookie) => send('POST', url, body, cookie);
    const get = (url, cookie) => send('GET', url, null, cookie);

    // Two real members, by the forest gate (same walk as market-checkout-guards.mjs).
    const member = async (name) => {
      const visitor = await (await post('/api/arrive/visitor', {})).json();
      assert.ok(visitor.vid, 'the forest gate issued a visitor id');
      await post('/api/arrive/bypass', { vid: visitor.vid, code: 'TESTGATE' });
      const entered = await post('/api/arrive/enter', { vid: visitor.vid, name });
      const cookie = (entered.headers.get('set-cookie') || '').split(';')[0];
      assert.ok(cookie, `entering the Commons gave ${name} a session`);
      return cookie;
    };
    const seller = await member('ClosedSeller');
    const buyer = await member('ClosedBuyer');

    const TITLE = 'Three drawings of a lamp';
    const made = await post('/api/market/listings', {
      title: TITLE,
      text: 'One small drawing of three lamps, made this week. Sold as a single original.',
      category: 'art',
      type: 'product',
      price: { mode: 'fixed', amount: 500 },
      license: 'all-rights',
      rights: true,
    }, seller);
    assert.equal(made.status, 201, 'a member can list something for sale');
    const listing = await made.json();
    assert.ok(listing.id, 'the new listing has an id');
    assert.equal(listing.status, 'live', 'a new listing is live');

    // The server's own word on this listing, so the page is judged against the quote and not a copy of it.
    const quote = await (await get(`/api/market/listings/${listing.id}/checkout`)).json();
    assert.equal(quote.payable, false, 'the quote for this listing is not payable (payments closed)');

    // The only thing that opens checkout in the browser is a control carrying data-buy for THIS listing
    // (commons/public/market.js:70 binds `[data-buy]` and POSTs to that listing's checkout).
    const openers = (html) => (html.match(new RegExp(`data-buy="${listing.id}"`, 'g')) || []).length;
    // Either wording of "closed" is accepted: the page's own NOT_OPEN, or checkout's NOT_OPEN.
    const saysClosed = (html) => /Payments aren['’]t open yet|Payments open soon|payments open soon/i.test(html);

    // (1) the buyer — signed in, not the seller: what they meet before any money would move.
    const asBuyer = await get(`/label/l/${listing.id}`, buyer);
    assert.equal(asBuyer.status, 200, 'a signed-in member can read the listing page');
    const buyerHtml = await asBuyer.text();
    assert.ok(buyerHtml.includes(TITLE), 'the page shows the listing title');
    assert.ok(buyerHtml.includes('$500'), 'the page shows the asking price');
    assert.equal(openers(buyerHtml), 0,
      'with payments closed the page gives the buyer no data-buy control for this listing (nothing that can only 503)');
    assert.ok(saysClosed(buyerHtml), 'the page tells the buyer payments are not open yet');

    // (2) the visitor — no session at all. Same promise: never a working Buy.
    const asVisitor = await get(`/label/l/${listing.id}`);
    assert.equal(asVisitor.status, 200, 'a signed-out visitor can read the listing page');
    const visitorHtml = await asVisitor.text();
    assert.ok(visitorHtml.includes(TITLE), 'the visitor sees the listing title');
    assert.equal(openers(visitorHtml), 0, 'a signed-out visitor is never handed a working Buy');
    assert.ok(saysClosed(visitorHtml), 'the visitor is told payments are not open yet');

    // (3) the control that keeps (1) and (2) from passing on an empty page: the page really does render a Buy-shaped
    // control, and it is explicitly disabled rather than missing. marketpage.mjs:644 → `class="btn mk-closed" disabled`.
    const disabledBuy = /class="btn mk-closed" disabled>Buy · [^<]*payments/i.test(buyerHtml);
    assert.ok(disabledBuy,
      'the buyer sees a Buy that is visibly disabled and says why (payments open soon), not a live one');

    // (4) and the surface agrees with the route: attempting that buy anyway is refused, not charged.
    const attempt = await post(`/api/market/listings/${listing.id}/checkout`, {}, buyer);
    assert.equal(attempt.status, 503, 'the buy the page withholds would be 503 if attempted directly');
    const orders = await (await get('/api/me/orders', buyer)).json();
    assert.equal(orders.purchases.length, 0, 'and no purchase was created');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});
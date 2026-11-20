// Buying on the market: what a buyer meets BEFORE any money moves — every guard checked over HTTP, not in the libs' heads.
//
// Round 17 (teams/build/JOBS.md). The route is `POST /api/market/listings/:id/checkout`
// (commons/server.mjs ~1764) → `checkout.startCheckout` (commons/lib/checkout.mjs). Its guards, in the order the code
// applies them:
//   no buyer            → 401 "sign in to use the market"   (marketWriter, before the quote)
//   listing missing OR not live → 404 "no such listing"      (quote)
//   the seller buying their own → 400 "you can't buy your own listing"
//   payments closed      → 503 NOT_OPEN, with a reason        (quote().payable false; COMMONS_PAYMENTS unset here)
//   only then is an order row written. So a refused buy leaves the order log untouched, and `/api/me/orders` shows
//   nothing for either side. That is the strongest "nothing was charged" proof this route can give today.
//
// NOT tested here, because the code does not offer them (DeepSeek's round 16 finding, carried forward):
//   - a coin balance is never consulted on this path (coins buy the /store catalogue, not market listings);
//   - the route takes no client idempotency key (server.mjs passes only {pkg, amount}), so "the same key twice"
//     cannot be asked for. Stripe's idempotency key is the server-generated ord_… id.
// Both are design gaps to raise with Setu, not assertions this test may pretend to make.
//
// Run: node --test commons/test/market-checkout-guards.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('market checkout keeps its guards, and a refused buy writes no order', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-checkout-'));
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
    const reason = async (response) => {
      const body = await response.json().catch(() => null);
      return JSON.stringify(body ?? '');
    };

    // Two real members: the walk is the forest gate (same path as store-buy-guards.mjs and feedv2.mjs).
    const member = async (name) => {
      const visitor = await (await post('/api/arrive/visitor', {})).json();
      assert.ok(visitor.vid, 'the forest gate issued a visitor id');
      await post('/api/arrive/bypass', { vid: visitor.vid, code: 'TESTGATE' });
      const entered = await post('/api/arrive/enter', { vid: visitor.vid, name });
      const cookie = (entered.headers.get('set-cookie') || '').split(';')[0];
      assert.ok(cookie, `entering the Commons gave ${name} a session`);
      return cookie;
    };
    const seller = await member('MarketSeller');
    const buyer = await member('MarketBuyer');

    // A listing A really is offering: the exact fields market.create's checkFields demands.
    const made = await post('/api/market/listings', {
      title: 'A study of lamps',
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

    const orders = async (cookie) => {
      const response = await get('/api/me/orders', cookie);
      assert.equal(response.status, 200, 'a signed-in member can read their orders');
      return response.json();
    };

    // (1) signed out: no session, no checkout.
    const anon = await post(`/api/market/listings/${listing.id}/checkout`, {});
    assert.equal(anon.status, 401, 'a signed-out checkout attempt is 401, not a sale');
    assert.match(await reason(anon), /sign in/i, 'the refusal tells the person to sign in');

    // (2) a listing id that does not exist.
    const unknown = await post('/api/market/listings/l_nosuchlisting/checkout', {}, buyer);
    assert.equal(unknown.status, 404, 'checking out on a listing that does not exist is 404');

    // (3) the seller buying their own listing — refused before the payments check, so this is testable today.
    const own = await post(`/api/market/listings/${listing.id}/checkout`, {}, seller);
    assert.equal(own.status, 400, 'a seller cannot buy their own listing');
    assert.match(await reason(own), /your own listing/i, 'the refusal says why');

    // (4) what a buyer sees before paying: the quote is honest about payments being closed.
    const quote = await get(`/api/market/listings/${listing.id}/checkout`);
    assert.equal(quote.status, 200, 'the listing quote is readable');
    const q = await quote.json();
    assert.equal(q.payable, false, 'with payments closed the quote is not payable');
    assert.ok(Array.isArray(q.why) && q.why.some((w) => /payments aren't open yet/i.test(w)),
      `the quote says payments are not open yet (got ${JSON.stringify(q.why)})`);
    assert.equal(q.amount, 500, 'the quote carries the asking price');
    assert.equal(q.currency, 'USD', 'a human seller is priced in money, not coins');

    // (5) an honest buy of another member's live listing: refused, because no money moves yet.
    const buy = await post(`/api/market/listings/${listing.id}/checkout`, {}, buyer);
    assert.equal(buy.status, 503, 'with payments closed an honest buy is 503, not a charge');
    assert.match(await reason(buy), /payments/i, 'the refusal says payments are not open');

    // (6) nothing was charged and nothing was ordered: no purchase for the buyer, no sale for the seller.
    // (An order row is written only after the payable check, so a refused buy cannot leave a draft behind.)
    const buyerOrders = await orders(buyer);
    assert.equal(buyerOrders.purchases.length, 0, 'a refused buy leaves the buyer with no purchase');
    const sellerOrders = await orders(seller);
    assert.equal(sellerOrders.sales.length, 0, 'a refused buy leaves the seller with no sale');

    // (7) a listing taken off the market cannot be checked out at all: withdraw, then 404, not a last-minute sale.
    const off = await post(`/api/market/listings/${listing.id}/withdraw`, {}, seller);
    assert.equal(off.status, 200, 'a seller can withdraw their listing');
    const gone = await post(`/api/market/listings/${listing.id}/checkout`, {}, buyer);
    assert.equal(gone.status, 404, 'a withdrawn listing is 404 to checkout, not payable');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});

// Sales and orders are private: a seller sees the sales of their own listings, a buyer sees what they bought,
// and a third member sees neither.
//
// Round 21 (teams/build/JOBS.md). Rounds 17-19 proved the checkout guards, the listing page's promise and who may
// edit a listing. This file is the last edge of the same object: the two activity pages, and who may read them.
//
// What the code does, and therefore what this test asserts:
//   GET /label/sales   (server.mjs:1719) — signed out → 303 to /signin?next=%2Flabel%2Fsales;
//                                           a member → marketpage.salesPage({me, sales}) where sales =
//                                           checkout.ordersFor(me).sales. ordersFor (commons/lib/checkout.mjs:61)
//                                           keeps only orders whose status is visible (not 'draft') and whose
//                                           `seller` (for sales) or `buyer` (for purchases) is that member's id.
//   GET /orders        (server.mjs:1713) — signed out → 303 to /signin?next=%2Forders; a member → ordersPage with
//                                           their own purchases only.
//   GET /api/me/orders (server.mjs:1712) — 401 signed out; {purchases, sales} split by member id.
//   POST /api/market/listings/:id/ask (server.mjs:1794 → market.ask) — 201; a question is NOT an order and does not
//                                           appear on any sales page. It is PUBLIC by design: the listing page prints
//                                           every question under "Questions — Public, like everything in the Commons",
//                                           and GET /api/market/listings/:id carries `asks` to anyone. This test asserts
//                                           that as the design it is, so nobody later reads it as a leak.
//
// Payments are CLOSED here (COMMONS_PAYMENTS is deliberately not set), so no real order can be created: the
// checkout route answers 503. To test the two activity pages at all, this test writes one SYNTHETIC order into the
// server's own append-only order log (<data>/payments/orders.jsonl), in the exact shape checkout.startCheckout
// writes and the Stripe webhook confirms. It is a seeded record, not a payment: nothing here proves the webhook,
// and the amount is invented.
//
// Honest limits, written down rather than implied:
//   - The order is seeded, so this proves the READ side (who may see an order once one exists), not that an order
//     can be created. Round 17's checkout test covers the closed-payment guards.
//   - There is one guard doing the work, not two: salesPage and ordersPage both render whatever ordersFor returns,
//     so the privacy decision lives in ordersFor's filter. That is why the mutation record below breaks the filter
//     itself, not each page.
//
// Mutation-checked 2026-11-21 in a throwaway copy of this tree (no package.json in the snapshot, so: copytree, a
// private package.json, a stub src/llm.js exporting `chat`, `npm install express@4 ws dotenv`). Each guard broken,
// and the assertion that said so:
//   ordersFor's per-member filter dropped (both lists become every visible order)
//       → "the buyer has no sales: they did not sell anything"
//   purchases and sales swapped inside ordersFor
//       → "the seller sees who bought (they have to know who to fulfil for)" (expected /Buyer: SalesBuyer/)
//   /label/sales loses its `if (!me) return res.redirect(...)` (served as a made-up member)
//       → "signed out, /label/sales redirects" (401 !== 303)
// A first attempt at the first mutation removed the id test from the initial `all` filter only, and stayed GREEN —
// because the two per-list filters re-applied it. Recorded here so nobody reads a green run as proof: a mutation
// that leaves the guard intact measures nothing.
//   - A seller is shown the buyer's NAME on their sales page (salesPage: `Buyer: ${buyer}`). That is intended — a
//     seller has to know who to fulfil for — and the test asserts the buyer's member id does not also appear.
//
// Run: node --test commons/test/market-sales-private.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('a seller sees their own sales, a buyer their own orders, and a third member sees neither', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-sales-'));
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
    const html = async (url, cookie) => {
      const r = await get(url, cookie);
      assert.equal(r.status, 200, `${url} answers 200 for a signed-in member`);
      return r.text();
    };

    // Three real members, by the forest gate (same walk as market-seller-edit.mjs).
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
    const seller = await member('SalesSeller');
    const buyer = await member('SalesBuyer');
    const third = await member('SalesThird');

    // The seller lists something. No payment is involved anywhere in this file.
    const made = await post('/api/market/listings', {
      title: 'A print of the north window',
      text: 'One print of the north window, made this autumn. Sold as a single copy.',
      category: 'art',
      type: 'product',
      price: { mode: 'fixed', amount: 5 },
      license: 'all-rights',
      rights: true,
    }, seller.cookie);
    assert.equal(made.status, 201, 'a member can list something');
    const listing = await made.json();
    assert.ok(listing.id, 'the new listing has an id');

    // (1) The buyer asks a question. It is a question, not an order: 201, and it makes no sale.
    const ASK = 'Is the print signed on the back?';
    const asked = await post(`/api/market/listings/${listing.id}/ask`, { text: ASK }, buyer.cookie);
    assert.equal(asked.status, 201, 'a signed-in member can ask about a listing');
    const ask = await asked.json();
    assert.equal(ask.text, ASK, 'the question is stored as written');

    const salesBefore = await html('/label/sales', seller.cookie);
    assert.match(salesBefore, /No sales yet/, 'a question is not a sale: the seller still has no sales');

    // (2) The question is PUBLIC by design (the page says so, and the JSON carries it to anyone). Asserted, so the
    //     next reader can tell design from leak.
    const publicJson = await (await get(`/api/market/listings/${listing.id}`)).json();
    assert.ok((publicJson.asks || []).some((a) => a.text === ASK), 'the listing JSON carries the question to anyone, signed out included (by design)');
    const publicPage = await (await get(`/label/l/${listing.id}`)).text();
    assert.match(publicPage, /Is the print signed on the back\?/, 'the listing page prints the question publicly (by design)');

    // (3) Signed out, both activity pages send you to sign in, and the API refuses outright.
    const salesOut = await get('/label/sales');
    assert.equal(salesOut.status, 303, 'signed out, /label/sales redirects');
    assert.equal(salesOut.headers.get('location'), '/signin?next=%2Flabel%2Fsales', 'and says where to come back to');
    const ordersOut = await get('/orders');
    assert.equal(ordersOut.status, 303, 'signed out, /orders redirects');
    assert.equal(ordersOut.headers.get('location'), '/signin?next=%2Forders', 'and says where to come back to');
    assert.equal((await get('/api/me/orders')).status, 401, 'signed out, the orders API is a 401');

    // (4) A SYNTHETIC paid order for this listing, written into the server's own order log. Not a payment: the
    //     shape is what startCheckout writes and the webhook confirms, the amount is invented.
    const ORDER = 'ord_salestest0001';
    const TS = new Date().toISOString();
    const orderLines = [
      { ts: TS, op: 'create', order: { id: ORDER, listing: listing.id, title: 'A print of the north window', buyer: buyer.id, seller: seller.id, amount: 5, currency: 'USD', fee_cents: 0, mode: 'test', status: 'draft', ts: TS } },
      { ts: TS, op: 'status', order: ORDER, status: 'paid' },
    ].map((r) => JSON.stringify(r)).join('\n') + '\n';
    fs.writeFileSync(path.join(D, 'payments', 'orders.jsonl'), orderLines);

    // (5) The seller sees the sale, with the buyer's name (needed to fulfil) and NOT the buyer's member id.
    const sellerSales = await html('/label/sales', seller.cookie);
    assert.match(sellerSales, /A print of the north window/, "the seller's sales page shows the listing that sold");
    assert.match(sellerSales, /Buyer: SalesBuyer/, "the seller sees who bought (they have to know who to fulfil for)");
    assert.ok(!sellerSales.includes(buyer.id), "the buyer's member id is not printed on the seller's page");
    assert.match(sellerSales, /paid/, 'the order state is shown as recorded');

    // (6) The buyer does NOT see it as a sale — they are not the seller — and sees it as their own order.
    const buyerSales = await html('/label/sales', buyer.cookie);
    assert.match(buyerSales, /No sales yet/, 'the buyer has no sales: they did not sell anything');
    assert.ok(!buyerSales.includes(ORDER), 'the buyer\'s sales page does not carry the order at all');
    const buyerOrders = await html('/orders', buyer.cookie);
    assert.match(buyerOrders, /A print of the north window/, "the buyer's orders page shows what they bought");

    // (7) The seller does NOT see the buyer's purchase as their own order.
    const sellerOrders = await html('/orders', seller.cookie);
    assert.match(sellerOrders, /No orders yet/, 'the seller bought nothing: their orders page is empty');
    assert.ok(!sellerOrders.includes(ORDER), "the seller's orders page does not carry the buyer's order");

    // (8) A third member sees neither page's contents.
    const thirdSales = await html('/label/sales', third.cookie);
    const thirdOrders = await html('/orders', third.cookie);
    for (const [label, body] of [['sales', thirdSales], ['orders', thirdOrders]]) {
      assert.ok(!body.includes(ORDER), `a third member's ${label} page does not carry the order`);
      assert.ok(!body.includes('A print of the north window'), `a third member's ${label} page does not name the listing`);
    }

    // (9) The API splits the same way, by member id.
    const sellerApi = await (await get('/api/me/orders', seller.cookie)).json();
    assert.equal(sellerApi.sales.length, 1, 'the seller has one sale in the API');
    assert.equal(sellerApi.sales[0].listing, listing.id, 'the sale names the listing');
    assert.equal(sellerApi.purchases.length, 0, 'the seller has no purchases');
    const buyerApi = await (await get('/api/me/orders', buyer.cookie)).json();
    assert.equal(buyerApi.purchases.length, 1, 'the buyer has one purchase in the API');
    assert.equal(buyerApi.sales.length, 0, 'the buyer has no sales');
    const thirdApi = await (await get('/api/me/orders', third.cookie)).json();
    assert.equal(thirdApi.purchases.length + thirdApi.sales.length, 0, 'a third member has neither');
  } finally {
    srv.kill();
  }
});

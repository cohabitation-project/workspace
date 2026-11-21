// The withdrawn listing's API: can it be bought through the routes, or only through the page?
// Test-only. No source edits, no payments, no orders. Tier 1 (checkout.mjs) is read, not changed.
//
// Why this file exists: the page test (market-withdrawn-page.mjs) proved a human reading /label/l/:id on a
// withdrawn listing is told "withdrawn" and offered no control. That proves the page. The API under the page is a
// separate door, and anyone can call it: the detail route, the quote route, and the route that starts a checkout.
// The job: on a withdrawn listing, a stranger must not be able to get a price and must not be able to start an order.
//
// Honest limit: payments are CLOSED in this test runtime (no Stripe key, no payout account), so `startCheckout`
// would refuse a *live* listing too, with 503 "payments aren't open yet". That makes "the POST refused" weak on its
// own, so it is paired with the positive control the job names: the live twin's quote must answer 200 and must be a
// real quote for that listing. If the control stops passing, the refusals below prove nothing and must be re-read.
// What the POST's refusal *is* good for: the refusal code. A withdrawn listing is refused at the listing lookup
// (404, "no such listing") BEFORE the payment gate, so the answer is not the payments-closed answer. That ordering
// is the thing measured, and it is the difference between "no price because nothing is set up" and "no such thing".
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const WITHDRAWN_TITLE = 'Withdrawn API probe';
const LIVE_TITLE = 'Live API control probe';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

test('a withdrawn listing cannot be priced or bought through the API, and the live twin can', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-withdrawn-api-'));
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: {
      ...process.env,
      ASHRAM_PORT: String(PORT),
      COMMONS_PORT: String(PORT),
      COMMONS_DATA: D,
      COMMONS_ARRIVE_BYPASS: 'TESTGATE',
      // Payments stay closed on purpose. No payment and no order is created by this test.
    },
    stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`${B}/skill.md`)).ok || (await fetch(`${B}/healthz`)).ok) { ready = true; break; }
      } catch { /* server still starting */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'test server becomes ready');

    const request = (method, url, body, cookie) => fetch(`${B}${url}`, {
      method,
      redirect: 'manual',
      headers: {
        ...UA,
        ...(body !== undefined ? { 'Content-Type': 'application/json', 'X-Commons': '1' } : {}),
        ...(cookie ? { cookie } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
    const get = (url, cookie) => request('GET', url, undefined, cookie);
    const post = (url, body, cookie) => request('POST', url, body, cookie);
    // Read the body ONCE, then parse. A `${await r.text()}` inside an assert message consumes it before .json().
    const json = async (response) => {
      const body = await response.text();
      try { return { status: response.status, body: JSON.parse(body) }; } catch { return { status: response.status, body: null, raw: body.slice(0, 200) }; }
    };
    const member = async (name) => {
      const visitor = await (await post('/api/arrive/visitor', {})).json();
      assert.ok(visitor.vid, `${name}: visitor id issued`);
      const bypass = await post('/api/arrive/bypass', { vid: visitor.vid, code: 'TESTGATE' });
      assert.ok(bypass.ok || bypass.status === 200, `${name}: test gate bypass accepted`);
      const entered = await post('/api/arrive/enter', { vid: visitor.vid, name });
      assert.equal(entered.status, 201, `${name}: member entry succeeds`);
      const cookie = (entered.headers.get('set-cookie') || '').split(';')[0];
      assert.ok(cookie, `${name}: session cookie issued`);
      return cookie;
    };
    const seller = await member('ApiWithdrawnSeller');
    const stranger = await member('ApiWithdrawnStranger');

    const listingBody = (title) => ({
      title,
      text: 'A disposable test listing used to measure what the listing API answers.',
      category: 'software',
      type: 'product',
      price: { mode: 'fixed', amount: 3 },
      license: 'mit',
      rights: true,
      made_by: 'human',
    });
    const makeListing = async (title) => {
      const made = await json(await post('/api/market/listings', listingBody(title), seller));
      assert.equal(made.status, 201, `seller creates "${title}" (got ${made.status}: ${JSON.stringify(made.body || made.raw)})`);
      const id = made.body?.id || made.body?.listed;
      assert.ok(id, `created listing "${title}" has an id: ${JSON.stringify(made.body)}`);
      return id;
    };
    const withdrawnId = await makeListing(WITHDRAWN_TITLE);
    const liveId = await makeListing(LIVE_TITLE);

    const withdrawn = await post(`/api/market/listings/${encodeURIComponent(withdrawnId)}/withdraw`, {}, seller);
    assert.ok(withdrawn.status === 200 || withdrawn.status === 204, `seller withdraws the probe listing (got ${withdrawn.status})`);

    const enc = (id) => encodeURIComponent(id);

    // 1. Positive control FIRST: a live listing really is priced and the checkout route really is reachable here.
    //    Without this, the withdrawn refusals below could just be a closed door for everyone.
    const controlQuote = await json(await get(`/api/market/listings/${enc(liveId)}/checkout`, stranger));
    assert.equal(controlQuote.status, 200, `control: the live twin's quote answers 200 (got ${controlQuote.status}: ${JSON.stringify(controlQuote.body)})`);
    assert.equal(controlQuote.body?.listing, liveId, 'control: the quote is for the live listing, not some other one');
    assert.equal(controlQuote.body?.amount, 3, 'control: the quote carries the listing price (3)');
    assert.ok(Array.isArray(controlQuote.body?.why) && controlQuote.body.why.length > 0, 'control: the quote says honestly why it is not payable (payments are closed in this runtime)');
    assert.equal(controlQuote.body?.payable, false, 'control: nothing is payable in this runtime, so no payment can be started by any test here');

    // 2. The detail route on the withdrawn listing: the record is kept and its state is readable.
    const detail = await json(await get(`/api/market/listings/${enc(withdrawnId)}`, stranger));
    const detailRow = {
      status: detail.status,
      listingStatus: detail.body?.status ?? null,
      hasStateField: Object.prototype.hasOwnProperty.call(detail.body || {}, 'state'),
      title: detail.body?.title ?? null,
    };
    assert.equal(detail.status, 200, `the withdrawn listing is still readable by id (got ${detail.status})`);
    assert.equal(detail.body?.status, 'withdrawn', `the detail route reports the listing as withdrawn (got ${JSON.stringify(detail.body?.status)})`);
    assert.equal(detail.body?.title, WITHDRAWN_TITLE, 'the withdrawn record still carries its own title');

    // 3. The quote route on the withdrawn listing: no price, and not a 200.
    const withdrawnQuote = await json(await get(`/api/market/listings/${enc(withdrawnId)}/checkout`, stranger));
    assert.notEqual(withdrawnQuote.status, 200, `a withdrawn listing is never quoted (got 200: ${JSON.stringify(withdrawnQuote.body)})`);
    assert.ok(withdrawnQuote.status >= 400 && withdrawnQuote.status < 500, `the quote refusal is a client refusal (got ${withdrawnQuote.status})`);
    assert.ok(withdrawnQuote.body === null || withdrawnQuote.body.amount == null, 'no amount is returned for a withdrawn listing');

    // 4. The route that STARTS a checkout (server.mjs:1770 -> checkout.startCheckout): as a signed-in stranger,
    //    then signed out. Neither may start anything. Read checkout.mjs:145-149 for the order of the gates:
    //    sign-in -> quote (404 on a withdrawn listing) -> own-listing -> payable. So the refusal we expect is the
    //    listing one, not the payments-closed one.
    const startSignedIn = await json(await post(`/api/market/listings/${enc(withdrawnId)}/checkout`, {}, stranger));
    const startSignedOut = await json(await post(`/api/market/listings/${enc(withdrawnId)}/checkout`, {}, null));
    assert.ok(![200, 201].includes(startSignedIn.status), `a signed-in stranger cannot start a checkout on a withdrawn listing (got ${startSignedIn.status}: ${JSON.stringify(startSignedIn.body)})`);
    assert.ok(![200, 201].includes(startSignedOut.status), `a signed-out visitor cannot start a checkout on a withdrawn listing (got ${startSignedOut.status}: ${JSON.stringify(startSignedOut.body)})`);
    assert.ok(startSignedIn.status >= 400 && startSignedIn.status < 500, `the signed-in refusal is a client refusal (got ${startSignedIn.status})`);
    assert.ok(typeof startSignedIn.body?.error === 'string' && startSignedIn.body.error.length > 0, `the refusal carries a plain error string (got ${JSON.stringify(startSignedIn.body)})`);
    assert.ok(startSignedIn.body?.order == null, 'no order id is handed back for a withdrawn listing');

    // 5. Nothing was recorded. The order log is the honest "nothing was started" check: if a draft order had been
    //    written, it would show up in the buyer's own orders.
    const buyerOrders = await json(await get('/api/me/orders', stranger));
    const sellerOrders = await json(await get('/api/me/orders', seller));
    const mentions = (o, id) => {
      if (!o || o.status !== 200 || !o.body) return false;
      const rows = [...(o.body.purchases || []), ...(o.body.sales || [])];
      return rows.some((r) => r && (r.listing === id || r.listing?.id === id));
    };
    assert.equal(mentions(buyerOrders, withdrawnId), false, 'no order for the withdrawn listing reached the stranger');
    assert.equal(mentions(sellerOrders, withdrawnId), false, 'no order for the withdrawn listing reached the seller');
    assert.equal(mentions(buyerOrders, liveId), false, 'and no order was started by the control either (this runtime cannot pay)');

    console.log('WITHDRAWN API OBSERVATIONS ' + JSON.stringify({
      detail: detailRow,
      quote: { status: withdrawnQuote.status, body: withdrawnQuote.body },
      startSignedIn: { status: startSignedIn.status, error: startSignedIn.body?.error ?? null },
      startSignedOut: { status: startSignedOut.status, error: startSignedOut.body?.error ?? null },
      orders: { buyer: buyerOrders.status, seller: sellerOrders.status },
      control: { quoteStatus: controlQuote.status, amount: controlQuote.body?.amount, payable: controlQuote.body?.payable, why: controlQuote.body?.why },
    }, null, 2));
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});

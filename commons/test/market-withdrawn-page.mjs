// The withdrawn-listing PAGE: what a stranger and a signed-out visitor get at /label/l/:id.
// Test-only. It measures the HTML the server sends and changes no route and no page.
//
// Why this file exists: rounds 22-25 measured the API side of a withdrawal (the detail API still 200s the
// record, checkout.quote 404s it, the shelves drop it). Nobody had measured the page a human actually lands on.
// The requirements are the job's: on a withdrawn listing a human must be able to read that it is withdrawn,
// and there must be no control that starts a checkout.
//
// Honest limit: payments are closed in this test runtime (no Stripe key), so `data-buy` cannot appear on ANY
// page here, live or withdrawn. That makes the no-Buy check weak on its own, so it is paired with a positive
// control that proves this harness CAN see a money/ask control when one exists: a live listing's page, fetched
// by the same signed-in stranger, must contain the ask form (`class="mk-askform"`). If that control stops
// passing, the withdrawn-page assertions below prove nothing and must be re-read, not trusted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const WITHDRAWN_TITLE = 'Withdrawn page probe';
const LIVE_TITLE = 'Live page control probe';
const UA = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

// Anything that could start a payment. marketpage.mjs puts these on the live page only:
// `data-buy` (Buy / Order / Give, market.js:70), `data-amount-from` (donation amount), the injected
// `#mk-checkout` box, and the posting form targets. `mk-askform` is the public question form (closed when
// the listing is not live), `mk-withdraw` the seller's own take-it-down button (already spent).
const CHECKOUT_HOOKS = [
  ['data-buy', 'Buy/Order/Give button (data-buy)'],
  ['data-amount-from', 'donation button (data-amount-from)'],
  ['id="mk-checkout"', 'in-app checkout box (#mk-checkout)'],
  ['mk-askform', 'public question form (mk-askform)'],
  ['mk-withdraw', 'withdraw button (mk-withdraw)'],
];
const CHECKOUT_FORM = /<form[^>]*action="[^"]*(?:checkout|orders)/i;

test('a withdrawn listing page names its state and offers no control that starts a checkout', async (t) => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-withdrawn-page-'));
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
    const seller = await member('PageWithdrawnSeller');
    const stranger = await member('PageWithdrawnStranger');

    const listingBody = (title) => ({
      title,
      text: 'A disposable test listing used to measure what the listing page shows.',
      category: 'software',
      type: 'product',
      price: { mode: 'fixed', amount: 3 },
      license: 'mit',
      rights: true,
      made_by: 'human',
    });
    const makeListing = async (title) => {
      const response = await post('/api/market/listings', listingBody(title), seller);
      assert.equal(response.status, 201, `seller creates "${title}" (got ${response.status}: ${await response.text()})`);
      const created = await response.json();
      const id = created.id || created.listed;
      assert.ok(id, `created listing "${title}" has an id: ${JSON.stringify(created)}`);
      return id;
    };
    const withdrawnId = await makeListing(WITHDRAWN_TITLE);
    const liveId = await makeListing(LIVE_TITLE);

    const withdrawnResponse = await post(`/api/market/listings/${encodeURIComponent(withdrawnId)}/withdraw`, {}, seller);
    assert.ok(withdrawnResponse.status === 200 || withdrawnResponse.status === 204, `seller withdraws the probe listing (got ${withdrawnResponse.status})`);

    const pageOf = async (id, cookie) => {
      const response = await get(`/label/l/${encodeURIComponent(id)}`, cookie);
      return { status: response.status, html: await response.text() };
    };

    const roles = [
      { name: 'seller', cookie: seller },
      { name: 'stranger', cookie: stranger },
      { name: 'signed-out', cookie: null },
    ];
    const pages = {};
    const table = [];
    for (const role of roles) {
      const page = await pageOf(withdrawnId, role.cookie);
      pages[role.name] = page;
      table.push({
        role: role.name,
        status: page.status,
        saysWithdrawn: /withdrawn|no longer available/i.test(page.html),
        hooks: CHECKOUT_HOOKS.filter(([needle]) => page.html.includes(needle)).map(([needle]) => needle),
        checkoutForm: CHECKOUT_FORM.test(page.html),
        buyWords: (page.html.match(/Buy ·|Order ·|Give/g) || []).length,
        bytes: page.html.length,
      });
    }
    const control = await pageOf(liveId, stranger);
    console.log('WITHDRAWN PAGE OBSERVATIONS ' + JSON.stringify({ table, liveControl: { status: control.status, hasAskForm: control.html.includes('mk-askform'), bytes: control.html.length } }, null, 2));

    // 1. Positive control first: this harness must be able to see a member control on a listing page.
    assert.equal(control.status, 200, `control: a live listing page answers 200 to a signed-in member (got ${control.status})`);
    assert.ok(control.html.includes('mk-askform'), 'control: the live listing page shows the ask form, so a missing form below is a real absence');

    // 2. The withdrawn page, as each of the three callers the job names.
    for (const role of roles) {
      const page = pages[role.name];
      assert.equal(page.status, 200, `${role.name}: the withdrawn listing's page answers 200, not an error page (got ${page.status})`);
      assert.match(page.html, /withdrawn|no longer available/i, `${role.name}: a human reading the page is told it is withdrawn (marketpage.mjs:652 prints this note)`);
      for (const [needle, why] of CHECKOUT_HOOKS) {
        assert.ok(!page.html.includes(needle), `${role.name}: no ${why} on a withdrawn listing`);
      }
      assert.ok(!CHECKOUT_FORM.test(page.html), `${role.name}: no form on a withdrawn listing posts to a checkout/orders route`);
    }

    // 3. The seller's own view: same page, same words, and no second withdraw button to press.
    const sellerRow = table.find((row) => row.role === 'seller');
    t.diagnostic(`seller page: status ${sellerRow.status}, ${sellerRow.bytes} bytes, says withdrawn: ${sellerRow.saysWithdrawn}, hooks: ${sellerRow.hooks.join(', ') || 'none'}`);

    // 4. The live twin still renders its own title and the withdrawn one still renders its own, so the page is
    //    not silently falling back to a generic error or the other listing.
    assert.ok(control.html.includes(LIVE_TITLE), 'control: the live listing page shows its own title');
    assert.ok(pages.stranger.html.includes(WITHDRAWN_TITLE), 'the withdrawn listing page still shows its own title (the record is kept, not hidden)');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});

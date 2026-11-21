// What "withdrawn" means at every public/member-facing Marketplace edge (Build Round 24, teams/build/JOBS.md).
// Probe setup follows the earlier Gemini test, but this file is the assigned behavior matrix, not a production fix.
// No Stripe key or payment mode is set. Checkout is probed only for its HTTP status and plain error message.
//
// Required invariants:
//   * nobody (seller, another member, or signed out) can start checkout for a withdrawn listing;
//   * it is absent from the default public API list and /label;
//   * the seller can still find it on /label/mine with withdrawn status.
// Everything else is recorded as an observation table, including whether the withdrawn record/detail remains
// directly readable and what another member / a signed-out visitor sees at /label/mine.
// Run: node --test commons/test/market-withdrawn.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('a withdrawn listing leaves public shelves, remains in the seller record, and cannot be checked out', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-withdrawn-'));
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: {
      ...process.env,
      ASHRAM_PORT: String(PORT),
      COMMONS_PORT: String(PORT),
      COMMONS_DATA: D,
      COMMONS_ARRIVE_BYPASS: 'TESTGATE',
      // Deliberately no COMMONS_PAYMENTS and no Stripe key: this test never initiates a real payment.
    },
    stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
      try {
        if ((await fetch(`${B}/skill.md`)).ok || (await fetch(`${B}/healthz`)).ok) { ready = true; break; }
      } catch { /* server still starting */ }
      await sleep(250);
    }
    assert.ok(ready, 'the test server did not become ready');

    const send = (method, url, body = null, cookie = null) => fetch(`${B}${url}`, {
      method,
      redirect: 'manual',
      headers: {
        ...(body !== null ? { 'Content-Type': 'application/json', 'X-Commons': '1' } : {}),
        ...(cookie ? { cookie } : {}),
      },
      ...(body !== null ? { body: JSON.stringify(body) } : {}),
    });
    const member = async (name) => {
      const visitorResponse = await send('POST', '/api/arrive/visitor', {});
      const visitor = await visitorResponse.json();
      assert.ok(visitor.vid, `${name}: forest gate issued a visitor id`);
      const bypass = await send('POST', '/api/arrive/bypass', { vid: visitor.vid, code: 'TESTGATE' });
      assert.ok(bypass.status < 400, `${name}: test forest gate accepted the bypass (${bypass.status})`);
      const entered = await send('POST', '/api/arrive/enter', { vid: visitor.vid, name });
      assert.ok(entered.status < 400, `${name}: entered the Commons (${entered.status})`);
      const cookie = (entered.headers.get('set-cookie') || '').split(';')[0];
      assert.ok(cookie, `${name}: entering the Commons gave a session`);
      return cookie;
    };

    const seller = await member('WithdrawSeller');
    const stranger = await member('WithdrawStranger');
    const TITLE = 'Withdrawn listing behavior canary';
    const created = await send('POST', '/api/market/listings', {
      title: TITLE,
      text: 'A test-only listing used to check what withdrawal means at each read and checkout edge.',
      category: 'art',
      type: 'product',
      price: { mode: 'fixed', amount: 12 },
      license: 'all-rights',
      rights: true,
    }, seller);
    assert.equal(created.status, 201, `seller created a listing (${created.status})`);
    const listing = await created.json();
    assert.ok(listing.id, 'the listing has an id');

    const withdrawnResponse = await send('POST', `/api/market/listings/${listing.id}/withdraw`, {}, seller);
    assert.equal(withdrawnResponse.status, 200, 'seller withdrew the listing');
    const withdrawn = await withdrawnResponse.json();
    assert.equal(withdrawn.status, 'withdrawn', 'withdraw response marks the record withdrawn');

    const identities = [
      { role: 'seller', cookie: seller },
      { role: 'stranger', cookie: stranger },
      { role: 'signed out', cookie: null },
    ];
    const observations = [];
    const violations = [];
    const check = (condition, message) => { if (!condition) violations.push(message); };
    const record = (role, endpoint, status, result) => observations.push({ role, endpoint, status, result });
    const present = (text) => text.includes(TITLE);

    for (const { role, cookie } of identities) {
      const apiDetailResponse = await send('GET', `/api/market/listings/${listing.id}`, null, cookie);
      const apiDetail = await apiDetailResponse.json();
      check(apiDetailResponse.status === 200, `${role}: direct API detail answers 200 (got ${apiDetailResponse.status})`);
      check(apiDetail.status === 'withdrawn', `${role}: direct API detail reports withdrawn (got ${apiDetail.status})`);
      record(role, 'GET /api/market/listings/:id', apiDetailResponse.status, `status=${apiDetail.status}`);

      const listResponse = await send('GET', '/api/market/listings', null, cookie);
      const listJson = await listResponse.json();
      assert.equal(listResponse.status, 200, `${role}: API listing index answers`);
      const onPublicApiList = (listJson.listings || []).some((item) => item.id === listing.id);
      assert.equal(onPublicApiList, false, `${role}: withdrawn listing is absent from the default public API list`);
      record(role, 'GET /api/market/listings', listResponse.status, `target present=${onPublicApiList}`);

      const detailPageResponse = await send('GET', `/label/l/${listing.id}`, null, cookie);
      const detailPage = await detailPageResponse.text();
      assert.equal(detailPageResponse.status, 200, `${role}: the historical listing page remains readable`);
      const pageMarksWithdrawn = /Withdrawn\./.test(detailPage);
      record(role, 'GET /label/l/:id', detailPageResponse.status, `title=${present(detailPage)}; withdrawn notice=${pageMarksWithdrawn}`);

      const mineResponse = await send('GET', '/label/mine', null, cookie);
      const minePage = await mineResponse.text();
      if (role === 'seller') {
        assert.equal(mineResponse.status, 200, 'seller can open their own listings page');
        assert.ok(present(minePage), 'seller still sees the withdrawn listing on /label/mine');
        assert.match(minePage, /Status: withdrawn/, 'seller sees its withdrawn status on /label/mine');
      } else if (role === 'stranger') {
        assert.equal(mineResponse.status, 200, 'another member sees their own listings page');
        assert.equal(present(minePage), false, 'another member does not see the seller listing in their own /label/mine');
      } else {
        assert.equal(mineResponse.status, 303, 'signed-out /label/mine redirects to sign-in');
        assert.match(mineResponse.headers.get('location') || '', /^\/signin\?next=/, 'redirect points to sign-in');
      }
      record(role, 'GET /label/mine', mineResponse.status, `title=${present(minePage)}; withdrawn status=${/Status: withdrawn/.test(minePage)}; redirect=${mineResponse.headers.get('location') || '—'}`);

      const marketResponse = await send('GET', '/label', null, cookie);
      const marketPage = await marketResponse.text();
      assert.equal(marketResponse.status, 200, `${role}: Marketplace home answers`);
      const onMarketHome = present(marketPage);
      assert.equal(onMarketHome, false, `${role}: withdrawn listing is absent from /label`);
      record(role, 'GET /label', marketResponse.status, `target present=${onMarketHome}`);

      const checkoutResponse = await send('POST', `/api/market/listings/${listing.id}/checkout`, {}, cookie);
      const checkoutBody = await checkoutResponse.json().catch(() => ({}));
      const message = typeof checkoutBody.error === 'string' ? checkoutBody.error : JSON.stringify(checkoutBody);
      assert.ok(checkoutResponse.status >= 400, `${role}: withdrawn listing cannot start checkout (got ${checkoutResponse.status})`);
      if (role === 'signed out') {
        assert.equal(checkoutResponse.status, 401, 'signed-out checkout is refused before any checkout attempt');
      } else {
        assert.equal(checkoutResponse.status, 404, `${role}: withdrawn listing is not a checkout target`);
        assert.equal(message, 'no such listing', `${role}: checkout reports no such listing`);
      }
      record(role, 'POST /api/market/listings/:id/checkout', checkoutResponse.status, `message=${message}`);
    }

    // Required concise cross-role record. The direct-record/detail visibility and non-seller /mine results are
    // observations, not newly imposed privacy policy; the three listed invariants above are enforced by assertions.
    console.log('\nWithdrawn listing observation table (no Stripe key configured):');
    console.log('role\tendpoint\tHTTP\tobserved result');
    for (const row of observations) console.log(`${row.role}\t${row.endpoint}\t${row.status}\t${row.result}`);
  } finally {
    srv.kill('SIGKILL');
    fs.rmSync(D, { recursive: true, force: true });
  }
});

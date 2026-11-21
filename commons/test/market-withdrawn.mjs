// Withdrawn marketplace listings: status-by-role observation matrix plus required visibility/checkout invariants.
// Test-only; this records the behavior of the public and seller surfaces without changing routes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

const DATA_TITLE = 'Withdrawn visibility probe';
const GPT = { 'user-agent': 'Mozilla/5.0 (compatible; ChatGPT-User/1.0; +https://openai.com/bot)' };

test('withdrawn listing visibility and checkout behavior by seller, stranger, and signed-out visitor', async (t) => {
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
      // Payments intentionally remain closed. No payment or order is created by this test.
    },
    stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`${B}/skill.md`)).ok || (await fetch(`${B}/healthz`)).ok) { ready = true; break; }
      } catch { /* server starting */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'test server becomes ready');

    const request = (method, url, body, cookie) => fetch(`${B}${url}`, {
      method,
      redirect: 'manual',
      headers: {
        ...GPT,
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
    const seller = await member('WithdrawnSeller');
    const stranger = await member('WithdrawnStranger');

    const createdResponse = await post('/api/market/listings', {
      title: DATA_TITLE,
      text: 'A disposable test listing used to measure withdrawn visibility.',
      category: 'software',
      type: 'product',
      price: { mode: 'fixed', amount: 3 },
      license: 'mit',
      rights: true,
      made_by: 'human',
    }, seller);
    assert.equal(createdResponse.status, 201, 'seller creates the test listing');
    const created = await createdResponse.json();
    const id = created.id || created.listed;
    assert.ok(id, `created listing has an id: ${JSON.stringify(created)}`);

    const withdrawnResponse = await post(`/api/market/listings/${encodeURIComponent(id)}/withdraw`, {}, seller);
    assert.ok(withdrawnResponse.status === 200 || withdrawnResponse.status === 204, `seller withdraws listing (got ${withdrawnResponse.status})`);

    const roles = [
      { name: 'seller', cookie: seller },
      { name: 'stranger', cookie: stranger },
      { name: 'signed-out', cookie: null },
    ];
    const probes = [
      ['detail API', (role) => get(`/api/market/listings/${encodeURIComponent(id)}`, role.cookie)],
      ['default listings API', (role) => get('/api/market/listings', role.cookie)],
      ['listing detail page', (role) => get(`/label/l/${encodeURIComponent(id)}`, role.cookie)],
      ['seller listings page', (role) => get('/label/mine', role.cookie)],
      ['public Market page', (role) => get('/label', role.cookie)],
      ['checkout POST', (role) => post(`/api/market/listings/${encodeURIComponent(id)}/checkout`, {}, role.cookie)],
    ];
    const observations = [];
    const byRole = new Map();
    // Read every role/route before evaluating requirements. This keeps a failing invariant from hiding the rest of
    // the observed matrix. Checkout rows retain status + response message only, never request/credential material.
    for (const role of roles) {
      const row = { role: role.name };
      for (const [label, run] of probes) {
        const response = await run(role);
        const text = await response.text();
        const result = { status: response.status, text };
        row[label] = response.status;
        if (label === 'checkout POST') row['checkout message'] = text.replace(/\s+/g, ' ').trim().slice(0, 240);
        if (label === 'default listings API') {
          try { result.json = JSON.parse(text); } catch { result.json = null; }
        }
        observations.push({ role: role.name, label, ...result });
        if (!byRole.has(role.name)) byRole.set(role.name, {});
        byRole.get(role.name)[label] = result;
      }
      // Separate seller page observation: record status/body and keep the matrix complete for all six named routes.
    }
    console.log('WITHDRAWN LISTING OBSERVATIONS ' + JSON.stringify(observations.map(({ role, label, status, text }) => ({ role, route: label, status, ...(label === 'checkout POST' ? { message: text.replace(/\s+/g, ' ').trim().slice(0, 240) } : {}) })), null, 2));

    const failIf = (condition, message) => { if (condition) assert.fail(message); };
    // The real checkout endpoint is a POST. For the seller and stranger, the withdrawn listing must fail closed;
    // the signed-out response is also recorded and must be an auth refusal. A test checkout must never be created.
    for (const roleName of ['seller', 'stranger']) {
      const checkout = byRole.get(roleName)['checkout POST'];
      assert.equal(checkout.status, 404, `${roleName} cannot start checkout on a withdrawn listing; got ${checkout.status}: ${checkout.text}`);
    }
    assert.equal(byRole.get('signed-out')['checkout POST'].status, 401, 'signed-out visitor cannot start checkout');

    // Neither anonymous nor signed-in public shelves may include the withdrawn item.
    for (const role of roles) {
      const list = byRole.get(role.name)['default listings API'];
      if (list.status === 200 && list.json) {
        assert.ok(!(list.json.listings || []).some((listing) => listing.id === id), `${role.name}: withdrawn listing omitted from default listings API`);
      } else {
        assert.fail(`${role.name}: default listings API should answer 200, got ${list.status}: ${list.text}`);
      }
      const marketPage = byRole.get(role.name)['public Market page'];
      assert.equal(marketPage.status, 200, `${role.name}: public Market page answers 200`);
      assert.ok(!marketPage.text.includes(DATA_TITLE), `${role.name}: withdrawn listing omitted from /label`);
    }

    // The seller's own list is the intentional management view and must retain the withdrawn record and its status.
    const sellerMine = byRole.get('seller')['seller listings page'];
    assert.equal(sellerMine.status, 200, `seller /label/mine answers 200, got ${sellerMine.status}`);
    assert.ok(sellerMine.text.includes(DATA_TITLE), 'seller still sees their withdrawn listing on /label/mine');
    assert.match(sellerMine.text, /withdrawn/i, "seller's listing is marked withdrawn");

    // All other route/status pairs are reported, not assigned guessed semantics; they are evidence for follow-up.
    t.diagnostic('Detail API and listing-detail-page results are observational; see WITHDRAWN LISTING OBSERVATIONS above.');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});

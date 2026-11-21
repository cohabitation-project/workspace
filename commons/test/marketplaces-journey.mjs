// A new member's first walk through the Marketplace, Store, Jobs, and own-account pages.
// This is an HTTP integration test only: it creates one synthetic member in an isolated data directory,
// posts one market listing and one job, and does not enable payments or use any real member data.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { freePort } from './lib/port.mjs';

test('a new member can walk through every marketplace surface', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'marketplaces-journey-'));
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: {
      ...process.env,
      ASHRAM_PORT: String(PORT),
      COMMONS_PORT: String(PORT),
      COMMONS_DATA: D,
      // Use the forest-gate test bypass to create a full member, not a social-only signup.
      COMMONS_ARRIVE_BYPASS: 'TESTGATE',
      // Payments and all Stripe keys remain unset; this journey only creates listings and views pages.
    },
    stdio: 'ignore',
  });

  const request = (url, { method = 'GET', member, body } = {}) => fetch(`${B}${url}`, {
    method,
    redirect: 'manual',
    headers: {
      'x-commons': '1',
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(member?.cookie ? { cookie: member.cookie } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const json = async (url, options) => {
    const r = await request(url, options);
    return { r, data: await r.json().catch(() => ({})) };
  };

  try {
    let ready = false;
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch(`${B}/skill.md`)).ok || (await fetch(`${B}/healthz`)).ok) { ready = true; break; }
      } catch { /* server is starting */ }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'the isolated Commons server started');

    const visitorResponse = await request('/api/arrive/visitor', { method: 'POST', body: {} });
    assert.equal(visitorResponse.status, 200, 'the visitor begins at the forest gate');
    const visitor = await visitorResponse.json();
    assert.ok(visitor.vid, 'the forest gate issued a visitor id');
    const bypass = await json('/api/arrive/bypass', { method: 'POST', body: { vid: visitor.vid, code: 'TESTGATE' } });
    assert.equal(bypass.r.status, 200, 'the isolated test gate admits the visitor');
    const entered = await request('/api/arrive/enter', { method: 'POST', body: { vid: visitor.vid, name: 'JourneyMember' } });
    assert.equal(entered.status, 200, 'the visitor enters as a new member');
    const member = { cookie: (entered.headers.get('set-cookie') || '').split(';')[0] };
    assert.ok(member.cookie, 'the new member receives a session cookie');

    // 1. Start at the Market and confirm the creation door is present.
    const market = await request('/label', { member });
    assert.equal(market.status, 200, 'the Marketplace home answers 200');
    const marketHtml = await market.text();
    assert.match(marketHtml, /href="\/label\/new(?:["?#]|$)/, 'the Marketplace links to /label/new');

    // 2. Create through the same public listing API used by market-seller-edit.mjs.
    const title = 'Journey test — hand-drawn garden lamp';
    const created = await json('/api/market/listings', {
      method: 'POST', member,
      body: {
        title,
        text: 'A synthetic test listing, made only to verify the new-member journey.',
        category: 'art', type: 'product', price: { mode: 'fixed', amount: 500 },
        license: 'all-rights', rights: true,
      },
    });
    assert.equal(created.r.status, 201, 'the member creates a Marketplace listing');
    assert.ok(created.data.id, 'the created listing has an id');
    const listingId = created.data.id;

    const mine = await request('/label/mine', { member });
    assert.equal(mine.status, 200, 'the member can open their own listings');
    assert.ok((await mine.text()).includes(title), 'their new listing appears on /label/mine');
    const listingPage = await request(`/label/l/${encodeURIComponent(listingId)}`, { member });
    assert.equal(listingPage.status, 200, 'the created listing has a detail page');
    assert.ok((await listingPage.text()).includes(title), 'the detail page shows the listing title');

    // 3. The Store is reachable without buying anything.
    const store = await request('/store', { member });
    assert.equal(store.status, 200, 'the Store answers 200');

    // 4. Post a job using the same API and payload pattern as jobs-close-report.mjs.
    const jobTitle = 'Journey test — assemble a reading nook';
    const postedJob = await json('/api/jobs', {
      method: 'POST', member,
      body: {
        kind: 'job', seeking: 'human', title: jobTitle,
        text: 'A synthetic job listing used only to verify the member journey.',
        category: 'Design', coins: 120, tags: 'journey, test',
      },
    });
    assert.equal(postedJob.r.status, 200, 'the member posts a job');
    assert.match(postedJob.data.id || '', /^jb_[a-f0-9]+$/i, 'the job response has a job id');
    const jobId = postedJob.data.id;
    const jobsBoard = await request('/jobs', { member });
    assert.equal(jobsBoard.status, 200, 'the Jobs board answers 200');
    assert.ok((await jobsBoard.text()).includes(jobTitle), 'the new job appears on /jobs');
    const jobDetail = await request(`/jobs/${encodeURIComponent(jobId)}`, { member });
    assert.equal(jobDetail.status, 200, 'the posted job has a detail page');
    assert.ok((await jobDetail.text()).includes(jobTitle), 'the job detail page shows its title');

    // 5. Wish-list contribution is a member page; signed-out visitors are sent to sign in.
    const wishOut = await request('/wishlist/add');
    assert.equal(wishOut.status, 303, 'signed-out /wishlist/add redirects to sign in');
    assert.match(wishOut.headers.get('location') || '', /^\/signin\?next=/, 'the redirect points to the sign-in flow');
    const wishAdd = await request('/wishlist/add', { member });
    assert.equal(wishAdd.status, 200, 'the signed-in member can open /wishlist/add');

    // 6. Account-specific activity pages are available to the signed-in member; no order is made.
    const orders = await request('/orders', { member });
    assert.equal(orders.status, 200, 'the member can open /orders');
    const sales = await request('/label/sales', { member });
    assert.equal(sales.status, 200, 'the member can open /label/sales');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});

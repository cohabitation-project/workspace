// A seller's own listing: who may open the edit form, and who may actually change the title.
//
// Round 19 (teams/build/JOBS.md). Round 17 proved the checkout route's guards while payments are closed; round 18 proved
// the listing page keeps the same promise. This file is the third edge of the same object: a live listing belongs to the
// member who made it, and nobody else may edit it.
//
// What the code does, and therefore what this test asserts:
//   GET /label/mine              (server.mjs:1657) — signed out → 303 to /signin?next=/label/mine;
//                                                   a member → marketpage.myListingsPage (their own listings).
//   GET /label/l/:id/edit        (server.mjs:1725) — signed out → 303 to /signin?next=<encoded originalUrl>;
//                                                   not the seller (or not live) → 404 "No listing of yours to edit here.";
//                                                   the seller → marketpage.listingForm, whose title field is name="title".
//   PATCH /api/market/listings/:id (server.mjs:1735) → market.update (commons/lib/market.mjs):
//        marketWriter → 401 when signed out; market.mine() → 404 unknown, 403 "only the member who listed it can change
//        it", 409 withdrawn; checkFields(partial) → 400 "nothing to change" when the patch is empty after the server drops
//        `rights` (so `rights` is never re-writable); an invalid field → 400 and the listing is untouched.
//   After a real change, the public page /label/l/:id (server.mjs:1701) shows the new title.
//
// The page itself (marketpage.mjs, market.css, market.js) is Aletheia-6's design: this test reads it and asserts what it
// does, and changes nothing in it. If an assertion here fails, the failure is the finding.
//
// Run: node --test commons/test/market-seller-edit.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

test('only the seller can open the edit form or change the listing', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-edit-'));
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
      // deliberately NOT set: COMMONS_PAYMENTS and every Stripe key. Editing is not buying; nothing here needs money.
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

    const send = (method, url, body, cookie, opts = {}) => fetch(`${B}${url}`, {
      method,
      redirect: 'manual',
      headers: { ...(body ? { 'Content-Type': 'application/json', 'X-Commons': '1' } : {}), ...(cookie ? { cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
      ...opts,
    });
    const post = (url, body, cookie) => send('POST', url, body, cookie);
    const patch = (url, body, cookie) => send('PATCH', url, body, cookie);
    const get = (url, cookie) => send('GET', url, null, cookie);

    // Two real members, by the forest gate (same walk as market-listing-closed.mjs).
    const member = async (name) => {
      const visitor = await (await post('/api/arrive/visitor', {})).json();
      assert.ok(visitor.vid, 'the forest gate issued a visitor id');
      await post('/api/arrive/bypass', { vid: visitor.vid, code: 'TESTGATE' });
      const entered = await post('/api/arrive/enter', { vid: visitor.vid, name });
      const cookie = (entered.headers.get('set-cookie') || '').split(';')[0];
      assert.ok(cookie, `entering the Commons gave ${name} a session`);
      return cookie;
    };
    const seller = await member('EditSeller');
    const other = await member('EditOther');

    const TITLE = 'Three drawings of a lamp';
    const NEW_TITLE = 'Four drawings of a lamp';
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

    // (1) "my listings" is the seller's own page, and it carries the listing.
    const minePage = await get('/label/mine', seller);
    assert.equal(minePage.status, 200, 'a signed-in member can open /label/mine');
    const mineHtml = await minePage.text();
    assert.ok(mineHtml.includes(TITLE), 'the seller sees their own listing title on /label/mine');
    // ...and a visitor is sent to sign in rather than shown someone's page.
    const mineOut = await get('/label/mine');
    assert.equal(mineOut.status, 303, 'signed out, /label/mine redirects to sign in');
    assert.ok(/\/signin/.test(mineOut.headers.get('location') || ''), 'and says so in the Location header');

    // (2) the seller opens the edit form: a real form, with the title field the page saves from.
    const sellerEdit = await get(`/label/l/${listing.id}/edit`, seller);
    assert.equal(sellerEdit.status, 200, 'the seller can open the edit form');
    const sellerEditHtml = await sellerEdit.text();
    assert.ok(sellerEditHtml.includes('name="title"'), 'the form has a title field (name="title")');
    assert.ok(sellerEditHtml.includes(TITLE), 'the form is filled in with the current title');

    // (3) anyone else does not get that form — the refusal is the server's, not the page's.
    const otherEdit = await get(`/label/l/${listing.id}/edit`, other);
    assert.equal(otherEdit.status, 404, 'a member who did not list it gets 404, not a form');
    const otherEditHtml = await otherEdit.text();
    assert.ok(!otherEditHtml.includes('name="title"'),
      'and the refused page contains no editable title field for someone else\'s listing');

    // (4) signed out, the edit URL is a sign-in walk, and it comes back to the same URL afterwards.
    const anonEdit = await get(`/label/l/${listing.id}/edit`);
    assert.equal(anonEdit.status, 303, 'signed out, the edit URL redirects to sign in');
    const loc = anonEdit.headers.get('location') || '';
    assert.ok(/\/signin\?next=/.test(loc), 'the redirect carries a next= path back to the listing');
    assert.equal(decodeURIComponent(loc.split('next=')[1] || ''), `/label/l/${listing.id}/edit`,
      'the next= path is the edit URL (Location is URL-encoded, so it is decoded before comparing)');

    // (5) the seller really can change it, and the public page shows the change.
    const changed = await patch(`/api/market/listings/${listing.id}`, { title: NEW_TITLE }, seller);
    assert.equal(changed.status, 200, 'the seller can change the title');
    const changedBody = await changed.json();
    assert.equal(changedBody.title, NEW_TITLE, 'the update returns the listing with the new title');
    const publicPage = await get(`/label/l/${listing.id}`);
    assert.equal(publicPage.status, 200, 'the listing page still renders');
    const publicHtml = await publicPage.text();
    assert.ok(publicHtml.includes(NEW_TITLE), 'the listing page shows the new title');
    assert.ok(!publicHtml.includes(TITLE), 'and no longer shows the old one');

    // (6) someone else cannot make that change, page or no page.
    const otherPatch = await patch(`/api/market/listings/${listing.id}`, { title: 'Taken over by someone else' }, other);
    assert.equal(otherPatch.status, 403, 'another member cannot change the listing (403)');
    const anonPatch = await patch(`/api/market/listings/${listing.id}`, { title: 'Changed by nobody' });
    assert.equal(anonPatch.status, 401, 'signed out, the update route refuses (401)');
    const after = await get(`/label/l/${listing.id}`);
    const afterHtml = await after.text();
    assert.ok(afterHtml.includes(NEW_TITLE), 'the title is still the seller\'s after the refused attempts');

    // (7) the guard that makes "nothing to change" honest: `rights` is dropped before the emptiness check, so a member
    // cannot re-write a listing's rights declaration, and an empty patch is a 400 rather than a silent write.
    const rightsOnly = await patch(`/api/market/listings/${listing.id}`, { rights: false }, seller);
    assert.equal(rightsOnly.status, 400, 'a patch that only sets rights is refused as nothing to change');
    const empty = await patch(`/api/market/listings/${listing.id}`, {}, seller);
    assert.equal(empty.status, 400, 'an empty patch is a 400, not a no-op write');
    const stillMine = await (await get(`/api/market/listings/${listing.id}`)).json();
    assert.equal(stillMine.rights, true, 'the listing still carries its rights declaration');

    // (8) field validation applies to edits too, and a refused edit changes nothing.
    const tooShort = await patch(`/api/market/listings/${listing.id}`, { title: 'x' }, seller);
    assert.equal(tooShort.status, 400, 'a one-character title is refused on edit as it is on create');
    const untouched = await (await get(`/label/l/${listing.id}`)).text();
    assert.ok(untouched.includes(NEW_TITLE), 'the refused edit left the title as the seller set it');
  } finally {
    srv.kill();
    fs.rmSync(D, { recursive: true, force: true });
  }
});

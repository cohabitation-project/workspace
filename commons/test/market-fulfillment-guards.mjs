// Who may see and change a listing's fulfillment link — the printing pipe that makes a maker's listing real.
//
// Round 20 (teams/build/JOBS.md, DeepSeek). The seller-edit test (round 19) proved the edit form and PATCH; this file is
// the wiring beside it: a maker links their listing to the product they designed in a printer's own tool.
//
// What the code does (read this session, commons/server.mjs + commons/lib/fulfillment.mjs):
//   GET    /api/market/listings/:id/fulfillment (server.mjs:1740) — NO guard at all: anyone, signed out, gets the link.
//   POST   /api/market/listings/:id/fulfillment (1741) → fulfillment.link(marketWriter(req), …):
//            marketWriter → 401 signed out; ownerOf → 404 unknown listing, 403 "only the maker of this listing".
//            Then the pipe: 400 unless the provider is an API pipe (printful, printify, lulu — distrokid is manual),
//            400 unless product_id is /^[\w.-]{1,80}$/. variant_ids are sanitised the same way, capped at 100.
//   DELETE /api/market/listings/:id/fulfillment (1742) → fulfillment.unlink → the same ownerOf edge (401/404/403), and
//            it is idempotent: unlinking a listing with no link answers 200 { linked: false }.
//   POST   /api/market/listings/:id/release (1743) → fulfillment.markRelease → the same edge, plus 400 unless the
//            listing's category is music and the step is one of the seven in RELEASE_STEPS; { done: false } clears one.
//   GET    /api/fulfillment/status (1739) — public on purpose: which pipes are configured, never a key.
//
// The question the job asked, answered by the second test below: **GET …/fulfillment hands the maker's provider wiring
// (provider, product_id, variant_ids, sku) to a signed-out visitor and to any other member.** Nothing public reads it —
// the listing page and GET /api/market/listings/:id carry no link (asserted here) — so the exposure is the endpoint's
// alone, and it is the maker's private arrangement, the exact data `plan()` would send to the printer for a paid order.
// It is NOT a provider key: status() and the link never carry one (asserted). Tier 1 private-data code, so per the job
// it is left failing and named to Setu rather than fixed here: fulfillment.mjs and server.mjs are not mine to change.
//
// Mutation-checked 2026-11-21 in a throwaway runtime (three guards broken one at a time, each turning this file red with
// a different message): drop the 403 in ownerOf → "another member cannot connect…"; drop marketWriter's 401 → "signed
// out, connecting…"; drop marketWriter from DELETE (pass null) → the DELETE 401 assertion. Honest limit: the POST, the
// DELETE and the release all reach one guard (ownerOf/marketWriter), so their 403s corroborate one guard, they do not
// cover three. What each route adds is that the guard is actually called on that route.
//
// Run: node --test commons/test/market-fulfillment-guards.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

/** Boot a real Commons on a temp data dir, with two real members and the request helpers. */
async function boot() {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-ful-'));
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
      // deliberately NOT set: COMMONS_PAYMENTS, every Stripe key, every printer key. Wiring is not buying and not
      // printing: nothing here needs money, and `connected: false` below is the proof no printer key is configured.
    },
    stdio: 'ignore',
  });

  let ready = false;
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(`${B}/skill.md`)).ok || (await fetch(`${B}/healthz`)).ok) { ready = true; break; }
    } catch { /* still starting */ }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  if (!ready) { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); throw new Error('the test server did not become ready'); }

  const send = (method, url, body, cookie, extra = {}) => fetch(`${B}${url}`, {
    method,
    redirect: 'manual',
    headers: { 'X-Commons': '1', ...(body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...extra },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const get = (url, cookie) => send('GET', url, null, cookie);
  const post = (url, body, cookie) => send('POST', url, body, cookie);
  const del = (url, cookie) => send('DELETE', url, null, cookie);

  const member = async (name) => {
    const visitor = await (await post('/api/arrive/visitor', {})).json();
    assert.ok(visitor.vid, 'the forest gate issued a visitor id');
    await post('/api/arrive/bypass', { vid: visitor.vid, code: 'TESTGATE' });
    const entered = await post('/api/arrive/enter', { vid: visitor.vid, name });
    const cookie = (entered.headers.get('set-cookie') || '').split(';')[0];
    assert.ok(cookie, `entering the Commons gave ${name} a session`);
    return cookie;
  };

  const listIt = async (cookie, category = 'art') => {
    const made = await post('/api/market/listings', {
      title: category === 'music' ? 'Four songs for a slow morning' : 'Three drawings of a lamp',
      text: category === 'music'
        ? 'Four pieces recorded at home this month: guitar, room noise, one voice.'
        : 'One small drawing of three lamps, made this week. Sold as a single original.',
      category,
      type: 'product',
      price: { mode: 'fixed', amount: 500 },
      license: 'all-rights',
      rights: true,
    }, cookie);
    assert.equal(made.status, 201, `a member can list something for sale (${category})`);
    const listing = await made.json();
    assert.ok(listing.id, 'the new listing has an id');
    return listing;
  };

  const close = () => { srv.kill(); fs.rmSync(D, { recursive: true, force: true }); };
  return { B, send, get, post, del, member, listIt, close };
}

test('only the maker can connect, see, or remove a listing\'s fulfillment link', async () => {
  const { get, post, del, member, listIt, close } = await boot();
  try {
    const seller = await member('PipeSeller');
    const other = await member('PipeOther');
    const listing = await listIt(seller);
    const URL = `/api/market/listings/${listing.id}/fulfillment`;
    const GOOD = { provider: 'printful', product_id: 'pf_91142', variant_ids: ['4011', '4012'], sku: 'LAMP-POSTER-A3' };

    // (1) signed out, connecting is refused before anything else is looked at.
    const anonPost = await post(URL, GOOD);
    assert.equal(anonPost.status, 401, 'signed out, connecting a printer is refused (401)');

    // (2) a member who did not list it cannot connect it — even though they are signed in and allowed to write elsewhere.
    const otherPost = await post(URL, GOOD, other);
    assert.equal(otherPost.status, 403, 'another member cannot connect the listing to a printer (403)');
    const afterRefusals = await (await get(URL, seller)).json();
    assert.equal(afterRefusals.link, null, 'the refused attempts left the listing unconnected');

    // (3) the pipe is checked before anything is written: an unknown provider, a manual-only pipe, and a bad product id.
    const noPipe = await post(URL, { ...GOOD, provider: 'nope' }, seller);
    assert.equal(noPipe.status, 400, 'an unknown printer is a 400');
    const manual = await post(URL, { ...GOOD, provider: 'distrokid' }, seller);
    assert.equal(manual.status, 400, 'DistroKid is a checklist, not an API pipe: it cannot be linked here (400)');
    const badId = await post(URL, { ...GOOD, product_id: 'not a product id' }, seller);
    assert.equal(badId.status, 400, 'a product id with a space in it is a 400');
    assert.equal((await (await get(URL, seller)).json()).link, null, 'still nothing connected after three refusals');

    // (4) the maker connects it, and the answer is the link itself.
    const linked = await post(URL, GOOD, seller);
    assert.equal(linked.status, 200, 'the maker can connect their own listing to a printer');
    const body = await linked.json();
    assert.equal(body.provider, 'printful', 'the answer names the pipe');
    assert.equal(body.product_id, 'pf_91142', 'and the provider product');
    assert.deepEqual(body.variant_ids, ['4011', '4012'], 'and the variants chosen');
    assert.equal(body.by, listing.by.id, 'the link records which member made it');
    assert.equal(body.connected, false,
      'PRINTFUL_TOKEN is not set in this test, so the pipe is linked but not connected — the honest state, and proof the link carries no key');

    // (5) the maker sees it; the public listing does not carry it (so the link is one surface, not a leaked field).
    const sellerView = await (await get(URL, seller)).json();
    assert.equal(sellerView.link.product_id, 'pf_91142', 'the maker can read back the link');
    assert.equal(sellerView.release.listing, listing.id, 'and the same answer carries the release checklist');
    const publicJson = await (await get(`/api/market/listings/${listing.id}`)).json();
    assert.equal(publicJson.fulfillment, undefined, 'the public listing object has no fulfillment field');
    // `link` on a listing is the maker's own optional external URL (null here), not the printer wiring: the test is that
    // nothing in the public object names the provider product.
    assert.ok(!JSON.stringify(publicJson).includes('pf_91142'), 'and nothing in the public listing names the product');
    const publicHtml = await (await get(`/label/l/${listing.id}`)).text();
    assert.ok(!publicHtml.includes('pf_91142'), 'the public listing page does not print the provider product id');
    assert.ok(!publicHtml.includes('LAMP-POSTER-A3'), 'and not the sku');

    // (6) status is public on purpose, and it never carries a key.
    const status = await get('/api/fulfillment/status');
    assert.equal(status.status, 200, 'pipe status is readable without signing in (that is by design)');
    const statusJson = await (await get('/api/fulfillment/status')).json();
    assert.equal(statusJson.printful.connected, false, 'Printful reports not connected, because no token is set');
    assert.equal(statusJson.distrokid.mode, 'manual', 'DistroKid reports itself as a manual checklist');
    assert.ok(!JSON.stringify(statusJson).includes('pf_91142'), 'status says nothing about any listing');

    // (7) removing the link is the same ownership edge, and it is idempotent.
    const otherDel = await del(URL, other);
    assert.equal(otherDel.status, 403, 'another member cannot unlink it (403)');
    const anonDel = await del(URL);
    assert.equal(anonDel.status, 401, 'signed out, unlinking is refused (401)');
    assert.ok((await (await get(URL, seller)).json()).link, 'the refused unlinks left the link in place');

    const gone = await del(URL, seller);
    assert.equal(gone.status, 200, 'the maker can unlink it');
    assert.equal((await gone.json()).linked, false, 'and the answer says so');
    assert.equal((await (await get(URL, seller)).json()).link, null, 'the link is gone for the maker');
    const again = await del(URL, seller);
    assert.equal(again.status, 200, 'unlinking twice is not an error (idempotent)');
    assert.equal((await again.json()).linked, false, 'the second unlink still says linked: false');

    // (8) an unknown listing is a 404, not a silently empty link — on the write routes.
    const unknown = await post('/api/market/listings/l_doesnotexist/fulfillment', GOOD, seller);
    assert.equal(unknown.status, 404, 'connecting a listing that does not exist is a 404');

    // (9) the release checklist is the same edge, one category over: art has no release steps, and only the maker marks.
    const artRelease = await post(`/api/market/listings/${listing.id}/release`, { step: 'files' }, seller);
    assert.equal(artRelease.status, 400, 'release steps are for music listings (400 on an art listing)');
    const music = await listIt(seller, 'music');
    const musicURL = `/api/market/listings/${music.id}/release`;
    const otherMark = await post(musicURL, { step: 'files' }, other);
    assert.equal(otherMark.status, 403, 'another member cannot tick a release step (403)');
    const anonMark = await post(musicURL, { step: 'files' });
    assert.equal(anonMark.status, 401, 'signed out, ticking a release step is refused (401)');
    const badStep = await post(musicURL, { step: 'make-it-famous' }, seller);
    assert.equal(badStep.status, 400, 'a step that does not exist in RELEASE_STEPS is a 400');
    const marked = await post(musicURL, { step: 'files' }, seller);
    assert.equal(marked.status, 200, 'the maker ticks a real step');
    const steps = (await marked.json()).steps;
    assert.equal(steps.length, 7, 'the checklist has its seven steps');
    assert.ok(steps.find((s) => s.step === 'files').done, 'the ticked step reads done, with a time');
    const cleared = await post(musicURL, { step: 'files', done: false }, seller);
    assert.ok(!(await cleared.json()).steps.find((s) => s.step === 'files').done, '{ done: false } clears a step again');
  } finally { close(); }
});

test('GET …/fulfillment must not hand the maker\'s provider wiring to someone else (EXPECTED RED: the finding)', async () => {
  const { get, post, member, listIt, close } = await boot();
  try {
    const seller = await member('PipeOwner');
    const other = await member('PipeStranger');
    const listing = await listIt(seller);
    const URL = `/api/market/listings/${listing.id}/fulfillment`;
    const GOOD = { provider: 'printful', product_id: 'pf_77301', variant_ids: ['4099'], sku: 'LAMP-TEE-M' };
    assert.equal((await post(URL, GOOD, seller)).status, 200, 'the maker connects the listing (setup)');

    // The maker must see it: this endpoint is how the edit page knows what is already wired.
    const owns = await (await get(URL, seller)).json();
    assert.equal(owns.link.product_id, 'pf_77301', 'the maker reads their own link');

    // Everyone else must not. Both reads are made before asserting, so one failure shows both facts at once.
    const asOther = await (await get(URL, other)).json();
    const asAnon = await (await get(URL)).json();
    const brief = (j) => (j.link ? { provider: j.link.provider, product_id: j.link.product_id, variant_ids: j.link.variant_ids, sku: j.link.sku, by: j.link.by } : null);
    assert.deepEqual(
      { toAnotherMember: brief(asOther), toSignedOutVisitor: brief(asAnon) },
      { toAnotherMember: null, toSignedOutVisitor: null },
      'LEAK (private-data code — Setu takes this to Geoffrey; this job does not fix server.mjs or fulfillment.mjs): '
      + 'GET /api/market/listings/:id/fulfillment has no guard, so anyone, signed out, reads the maker\'s printer wiring '
      + '(provider, product_id, variant_ids, sku) — the exact data plan() would send to the printer for a paid order. '
      + 'It is not a credential (no key is ever in the link or in status()), and no public page reads it, so the safest '
      + 'fix is to guard this route and keep the maker\'s own read working. Sale-blocking checkup, not a build: measured '
      + 'signed out and as a second member on 2026-11-21.',
    );
  } finally { close(); }
});

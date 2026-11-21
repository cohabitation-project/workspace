// A question on a listing reaches the seller — in the place the seller actually reads.
//
// Round 22 (teams/build/JOBS.md was still Round 21; this is the gap I named myself in round 21 and then
// found I had named wrong). Round 21 I reported "there is no seller-side question inbox"; that was a false
// finding and this file is the correction. What is really in the code:
//
//   commons/lib/market.mjs:230 notificationsFor(memberId) folds every listing's asks into two kinds —
//     'market-ask'    for the listing's owner, when the asker is someone else;
//     'market-answer' for the parent question's author, when a reply names their question (reply_to).
//     Your own words never notify you: `if (a.by.id === memberId) continue`.
//   commons/lib/inboxes.mjs:28-34 turns those into the Marketplace section of a member's inbox, with a
//     title ("<asker> asked about “<listing>”") and an href back to the listing; a listing that belongs
//     to one of your pages is filed under that page, anything else under "you".
//   commons/server.mjs:1528 GET /api/me/inboxes is that inbox as JSON for the signed-in member; 401 signed out.
//   commons/server.mjs:1794 POST /api/market/listings/:id/ask is the writer's edge (201).
//   commons/lib/market.mjs:216 get(id) hands `asks` to anyone, signed OUT too: a question on a listing is
//     public, like the listing page says ("Questions — Public, like everything in the Commons").
//
// So the design holds on both sides at once: the question is public, and the seller is told. This test
// asserts both, because a test that asserted only the second would read as if the first were a leak.
//
// Measured 2026-11-21 (throwaway copy of the repo, package.json + stub src/llm.js exporting chat,
// `npm install express@4 ws dotenv`, node v24.22.2): `node --test commons/test/market-ask-inbox.mjs`
// → pass 1, fail 0 (one test; every assertion above ran).
//
// Mutation-checked in that same copy, because green on the first try is a hypothesis, not evidence:
//   A. market.mjs `if (a.by.id === memberId) continue;` → `if (false) continue;`   → FAILS.
//      Caught by "the seller is not told about their own answer", NOT by the asker's own-question check:
//      removing `continue` adds nothing for a plain asker (they are neither the answer's parent author nor
//      the owner), it only double-counts the member who is both seller and answerer. So the two guards are
//      not redundant — one keeps your own words out, the other decides whose words reach whom.
//   B. `else if (l.by.id === memberId)` → `else if (false)`                          → FAILS at
//      "the seller's inbox has exactly one item for this question".
//   Restored file → pass 1, fail 0 (the control; without it the two failures prove nothing).
//
// If an assertion here fails, the failure is the finding: say which one in finish(), don't soften it.
//
// Run: node --test commons/test/market-ask-inbox.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

// Every inbox item id is built from the ask id (`q:<ask id>`), so the id is the stable handle: it survives
// wording changes in inboxes.mjs while still proving the item was made from THIS question.
const itemsWithId = (json, id) => {
  const out = [];
  const walk = (v) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) return v.forEach(walk);
    if (v.id === id) out.push(v);
    for (const k of Object.keys(v)) walk(v[k]);
  };
  walk(json);
  return out;
};

test('a question reaches the seller in their inbox, and the asker in nobody else\'s', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-ask-inbox-'));
  const PORT = await freePort();
  const B = `http://127.0.0.1:${PORT}`;
  const srv = spawn(process.execPath, [path.join(import.meta.dirname, '..', 'server.mjs')], {
    env: {
      ...process.env,
      ASHRAM_PORT: String(PORT),
      COMMONS_PORT: String(PORT),
      COMMONS_DATA: D,
      // the forest gate's test bypass, so this test can make real members (open signup is social-only)
      COMMONS_ARRIVE_BYPASS: 'TESTGATE',
      // deliberately NOT set: COMMONS_PAYMENTS and every Stripe key. A question is not a purchase.
    },
    stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let i = 0; i < 80; i++) {
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

    const member = async (name) => {
      const visitor = await (await post('/api/arrive/visitor', {})).json();
      assert.ok(visitor.vid, 'the forest gate issued a visitor id');
      await post('/api/arrive/bypass', { vid: visitor.vid, code: 'TESTGATE' });
      const entered = await post('/api/arrive/enter', { vid: visitor.vid, name });
      const cookie = (entered.headers.get('set-cookie') || '').split(';')[0];
      assert.ok(cookie, `entering the Commons gave ${name} a session`);
      return cookie;
    };
    const seller = await member('AskSeller');
    const asker = await member('AskAsker');
    const stranger = await member('AskStranger');

    const TITLE = 'One framed drawing of a lamp';
    const made = await post('/api/market/listings', {
      title: TITLE,
      text: 'A single original drawing, framed, made this week. Sold as one piece.',
      category: 'art',
      type: 'product',
      price: { mode: 'fixed', amount: 900 },
      license: 'all-rights',
      rights: true,
    }, seller);
    assert.equal(made.status, 201, 'a member can list something for sale');
    const listing = await made.json();
    assert.ok(listing.id, 'the new listing has an id');

    // Signed out, the inbox is not readable (the seller's questions are not the world's inbox).
    const anonInbox = await get('/api/me/inboxes');
    assert.equal(anonInbox.status, 401, 'signed out, GET /api/me/inboxes is a 401');

    const QUESTION = 'Is the lamp drawing framed?';
    const asked = await post(`/api/market/listings/${listing.id}/ask`, { text: QUESTION }, asker);
    assert.equal(asked.status, 201, 'a signed-in member can ask a question on a listing');
    const ask = await asked.json();
    assert.ok(ask.id, 'the question has an id');
    assert.equal(ask.text, QUESTION, 'the stored question is the text that was sent');
    assert.ok(ask.by && ask.by.id, 'the question records who asked it');

    // (1) THE SELLER IS TOLD. The item is keyed `q:<ask id>` and names the asker and the listing.
    const sellerInbox = await get('/api/me/inboxes', seller);
    assert.equal(sellerInbox.status, 200, 'the seller can read their inbox');
    const sellerJson = await sellerInbox.json();
    const sItems = itemsWithId(sellerJson, `q:${ask.id}`);
    assert.equal(sItems.length, 1, 'the seller\'s inbox has exactly one item for this question');
    const sItem = sItems[0];
    assert.ok(String(sItem.title).includes('AskAsker'), `the item names who asked (title: ${sItem.title})`);
    assert.ok(String(sItem.title).includes(TITLE), `the item names which listing (title: ${sItem.title})`);
    assert.ok(String(sItem.text || '').includes('framed') || String(sItem.title).includes('framed'),
      'the item carries the question itself, not only that there is one');

    // The item's link is a real page: a notification you cannot open is a notification that does not work.
    if (sItem.href) {
      const target = await get(sItem.href, seller);
      assert.ok(target.status < 400, `the seller's notification links to a page that answers (${sItem.href} → ${target.status})`);
      const html = await target.text();
      assert.ok(html.includes(QUESTION) || html.includes('framed'),
        'and that page shows the question, so the seller can read it and answer');
    }

    // (2) the asker is NOT told about their own question (market.notificationsFor: a.by.id === memberId → skip).
    const askerInbox = await get('/api/me/inboxes', asker);
    assert.equal(askerInbox.status, 200, 'the asker can read their inbox');
    assert.equal(itemsWithId(await askerInbox.json(), `q:${ask.id}`).length, 0,
      'your own question does not appear in your own inbox');

    // (3) a third member sees neither page's business.
    const strangerInbox = await get('/api/me/inboxes', stranger);
    assert.equal(strangerInbox.status, 200, 'a third member can read their own inbox');
    const strangerJson = await strangerInbox.json();
    assert.equal(itemsWithId(strangerJson, `q:${ask.id}`).length, 0, 'the stranger\'s inbox has no item for this question');

    // (4) THE ANSWER COMES BACK to the person who asked, and not to the person who wrote it.
    const ANSWER = 'Yes, it is framed in oak.';
    const answered = await post(`/api/market/listings/${listing.id}/ask`, { text: ANSWER, reply_to: ask.id }, seller);
    assert.equal(answered.status, 201, 'the seller can answer a question');
    const answer = await answered.json();
    assert.ok(answer.id && answer.id !== ask.id, 'the answer is its own question-shaped record');

    const askerInbox2 = await get('/api/me/inboxes', asker);
    const aItems = itemsWithId(await askerInbox2.json(), `q:${answer.id}`);
    assert.equal(aItems.length, 1, 'the answer appears once in the asker\'s inbox');
    assert.ok(String(aItems[0].title).includes('answered'), `the item says it is an answer, not another question (title: ${aItems[0].title})`);
    assert.ok(String(aItems[0].title).includes('AskSeller'), 'and names the seller as the one who answered');

    const sellerInbox2 = await get('/api/me/inboxes', seller);
    const sJson2 = await sellerInbox2.json();
    assert.equal(itemsWithId(sJson2, `q:${answer.id}`).length, 0, 'the seller is not told about their own answer');
    assert.equal(itemsWithId(sJson2, `q:${ask.id}`).length, 1, 'the seller still has the question they answered');

    // (5) the question is public by design — this is not a leak, and the listing page says so.
    const publicJson = await get(`/api/market/listings/${listing.id}`);
    assert.equal(publicJson.status, 200, 'the listing\'s JSON is readable signed out');
    const pub = await publicJson.json();
    assert.ok(Array.isArray(pub.asks), 'the public listing JSON carries its asks array');
    assert.ok(pub.asks.some((x) => x.id === ask.id), 'a signed-out reader sees the question: questions on a listing are public');
    const publicPage = await get(`/label/l/${listing.id}`);
    const publicHtml = await publicPage.text();
    assert.ok(/Public, like everything in the Commons/.test(publicHtml),
      'and the listing page says plainly that its questions are public');
  } finally {
    srv.kill('SIGKILL');
    fs.rmSync(D, { recursive: true, force: true });
  }
});

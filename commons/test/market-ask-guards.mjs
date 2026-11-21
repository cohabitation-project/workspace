// What a question on a listing may not be (Round 24, teams/build/JOBS.md): the guards on
// POST /api/market/listings/:id/ask.
//
// Route: commons/server.mjs:1794 → marketWriter(req) then market.ask (commons/lib/market.mjs:196).
// Read from the code before this file was run, and each line measured below rather than assumed:
//   sign-in — marketWriter (server.mjs:1731) throws 401 'sign in to use the market' before the lib is entered.
//   listing — `listings.get(String(id))`; `if (!l || l.status !== 'live') fail(404, 'no such listing')`. So a
//             WITHDRAWN listing and a listing that never existed answer the same 404 — one plain sentence, and it
//             is the same answer checkout.quote gives (round 22's finding: market.get does not filter on status,
//             market.ask does; this file pins the ask side).
//   text    — `const t = String(text ?? '').trim().slice(0, 1000); if (!t) fail(400, 'write your question ...')`.
//             Empty and whitespace-only are refused; a 10,000-character question is CLIPPED to exactly 1000 and
//             accepted. That is the same shape as the over-90 listing title (market-create-guards.mjs): the error
//             text promises a limit, but over-length is silently truncated. Pinned as today's behaviour and named
//             as a FINDING, not filed as a hole — nothing unbounded is stored and nothing 500s.
//   reply_to— `if (reply_to && !list.some(x => x.id === reply_to)) fail(400, 'no such question to answer')`, where
//             `list` is the questions on THIS listing. So a reply must name a real question on the same listing
//             (unknown id, another listing's id → 400). NOTHING checks that the replier is the seller, and the page
//             invites any signed-in member to reply (marketpage.mjs:649) — see section (4), which measures that and
//             names it as the product decision it is rather than encoding either answer.
//   rate    — 3 asks per member per listing per 60 s → 429 'a few questions a minute, please'. Sections (1)–(3)
//             stay under it on purpose, so a 429 there would be the finding; section (5) spends it deliberately on
//             a fresh listing (three accepted, the fourth 429, and the refused one not stored).
//   render  — the question is stored as written and escaped at the edge: marketpage.mjs:649 renders it through
//             renderMarkdown, which calls esc() on the source first (public/md.js). This file asserts BOTH halves —
//             the store keeps the hostile characters, and no page emits them raw — because a test that only
//             checked one half would read as a leak or as mangled data.
//   errors  — wrap() answers e.status with { error: e.message } and an uncaught error with 500 'server error'
//             (server.mjs ~460). A 5xx on a bad body therefore means a guard is missing, not that the wording is ugly.
//
// Where the seller reads a question (market-ask-inbox.mjs is the map): the inbox item (`q:<ask id>` from
// inboxes.mjs:31, read at GET /api/me/inboxes) links back to the listing page, and the listing page is where the
// question itself is shown. So the hostile-text check follows the seller's own inbox link and reads the page the
// seller actually opens — not a page chosen by the test.
//
// Scope, deliberately: the bodies and replies the job names, the seller's and the asker's own inboxes, and the
// listing page — no other route touched. Round 24 measured the question side; this session adds the answer side
// (who may answer, and where the answer's hostile text lands) and the 60-second ask limit.
//
// Run: node --test commons/test/market-ask-guards.mjs commons/test/market-ask-inbox.mjs
//
// MEASURED (2026-11-21 round 25, disclosed throwaway copy: repo minus .git/node_modules/label/images/outputs/media/
// .github, a private package.json, `npm install express@4 ws dotenv`, src/llm.js stubbed exporting chat):
//   `node --test commons/test/market-ask-guards.mjs` → exit 0, pass 1, fail 0. The snapshot has no root
//   package.json, so CI on the pushed branch is the real confirmation. Four members, four listings, one server.
//
// MUTATION RECORD (each break made in that copy, run, seen red, then the pristine text restored; the green run
// after the last restore is the control. The assertion named is the one that actually failed):
//   M1 — market.mjs: `if (!t) fail(400, ...)` → `if (false) fail(400, ...)`
//        red: "an empty question: refused with a 4xx (a 5xx would mean no guard), got 201"
//   M2 — market.mjs: `if (!l || l.status !== 'live') fail(404, ...)` → `if (!l) fail(404, ...)`
//        red: "a question on a withdrawn listing: refused with a 4xx (a 5xx would mean no guard), got 201"
//   M3 — market.mjs: `slice(0, 1000)` → `slice(0, 100)`
//        red: "and stored at exactly 1000 characters — the rest is dropped without a word"
//   M4 — marketpage.mjs: `renderMarkdown(a.text)` → `a.text` in the question thread
//        red: "the listing page: no raw <script>alert(1)</script> reaches the seller"
//   M5 — market.mjs: the reply_to guard → `if (false) fail(...)` (round 25)
//        red: "a reply to a question id that never existed: refused with a 4xx (a 5xx would mean no guard), got 201"
//   M6 — market.mjs: `if (recent >= 3)` → `if (recent >= 30)` (round 25)
//        red: "a fourth question inside one minute is a 429 (got 201)"
//   M7 — marketpage.mjs: `renderMarkdown(a.text)` → `a.text` in the question thread, run against round 25's file
//        red: "the listing page: no raw <script>alert(1)</script> reaches the seller". Said plainly: the answer's
//        escaping assertion is downstream of the SAME expression (the thread template renders questions and answers
//        through one `renderMarkdown(a.text)`), so this break proves both halves but the message names the question
//        because that check runs first. No separate break isolates the answer's own line, because there isn't one.
//   Control after restore: exit 0, pass 1, fail 0.
// NOT proved by a break, said plainly so nobody counts more proofs than there are: plainRefusal's own no-stack
// scan (the helper is the thing doing the catching), the "a refused question is not stored" reads, the
// signed-out 401 (marketWriter is Tier 1 and was not mutated from this lane), and the inbox-item wording — the
// tests assert the seller/asker item exists and names the right person, not that the inbox page escapes its own
// `text` snippet. That snippet is raw in the JSON on purpose (inboxes.mjs:31 takes `a.snippet` unescaped) and the
// client that draws it is JavaScript this lane cannot execute; a browser test is the only honest way to close it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { freePort } from './lib/port.mjs';

// A refusal must be a plain sentence, not a dump: no stack frame, no module path, no server directory.
const STACKY = [/\n\s+at\s[^\n]*\(/, /\.mjs:\d+/, /\/node_modules\//, /\bnode:internal\b/, /\/commons\//];
function plainRefusal(body, where) {
  assert.equal(typeof body.error, 'string', `${where}: refused with a message, not an empty body`);
  assert.ok(body.error.length > 0 && body.error.length < 300, `${where}: one plain sentence, got "${String(body.error).slice(0, 120)}"`);
  for (const re of STACKY) assert.ok(!re.test(body.error), `${where}: no stack or server path in "${body.error}"`);
}

// Inbox item ids are `q:<ask id>` (inboxes.mjs:31), so the id survives any wording change in the inbox.
const itemsWithId = (json, id) => {
  const found = [];
  const walk = (v) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) return v.forEach(walk);
    if (v.id === id) found.push(v);
    for (const k of Object.keys(v)) walk(v[k]);
  };
  walk(json);
  return found;
};
// Every marketplace item in an inbox, by the `q:` id prefix — so "nothing was kept" is a real count, not a guess.
const marketItems = (json) => {
  const found = [];
  const walk = (v) => {
    if (!v || typeof v !== 'object') return;
    if (Array.isArray(v)) return v.forEach(walk);
    if (typeof v.id === 'string' && v.id.startsWith('q:')) found.push(v);
    for (const k of Object.keys(v)) walk(v[k]);
  };
  walk(json);
  return found;
};

test('a question on a listing: refused in plain words when it should be, and escaped wherever the seller reads it', async () => {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'market-ask-guards-'));
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
    const seller = await member('AskGuardSeller');
    const asker = await member('AskGuardAsker');

    const TITLE = 'A recording of the rain on the roof';
    const made = await post('/api/market/listings', {
      title: TITLE,
      text: 'One recording, made on the roof in October. Sold as a single digital file.',
      category: 'art',
      type: 'product',
      price: { mode: 'fixed', amount: 4 },
      license: 'all-rights',
      rights: true,
    }, seller);
    assert.equal(made.status, 201, 'the seller can list something');
    const listing = await made.json();
    assert.ok(listing.id, 'the new listing has an id');

    const ask = (id, body, cookie) => post(`/api/market/listings/${id}/ask`, body, cookie);
    const refusedAsk = async (label, id, body, cookie) => {
      const r = await ask(id, body, cookie);
      assert.equal(r.status >= 400 && r.status < 500, true, `${label}: refused with a 4xx (a 5xx would mean no guard), got ${r.status}`);
      plainRefusal(await r.json(), label);
      return r;
    };

    // (1) The bodies that must be refused, plus signed out — each a plain 4xx.
    await refusedAsk('an empty question', listing.id, { text: '' }, asker);
    await refusedAsk('a question of spaces only', listing.id, { text: '   ' }, asker);
    await refusedAsk('a missing question entirely', listing.id, {}, asker);
    await refusedAsk('a question on a listing that never existed', 'l_doesnotexist', { text: 'Hello?' }, asker);
    const anon = await ask(listing.id, { text: 'Hello?' }, null);
    assert.equal(anon.status, 401, `signed out, asking is a 401 (marketWriter), got ${anon.status}`);
    plainRefusal(await anon.json(), 'signed out');

    // A WITHDRAWN listing refuses the question exactly as an unknown id does — measured, not assumed. Gemini's
    // probe found the reads disagree (market.get still 200s a withdrawn listing); the ask side does not.
    const secondMade = await post('/api/market/listings', {
      title: 'A second recording, withdrawn a minute later',
      text: 'One recording, offered and then taken down again. Sold as a single digital file.',
      category: 'art',
      type: 'product',
      price: { mode: 'fixed', amount: 3 },
      license: 'all-rights',
      rights: true,
    }, seller);
    assert.equal(secondMade.status, 201, 'the seller can list a second thing');
    const second = await secondMade.json();
    const withdrew = await post(`/api/market/listings/${second.id}/withdraw`, {}, seller);
    assert.ok(withdrew.status < 400, `the seller can withdraw their own listing (got ${withdrew.status})`);
    const withdrawnAsk = await refusedAsk('a question on a withdrawn listing', second.id, { text: 'Is this still for sale?' }, asker);
    assert.equal(withdrawnAsk.status, 404, 'a withdrawn listing refuses a question with the same 404 as an unknown id');

    // Nothing was kept from the refusals: no question on either listing, and no item in the seller's inbox.
    const firstJson = await (await get(`/api/market/listings/${listing.id}`)).json();
    assert.equal((firstJson.asks || []).length, 0, 'a refused question is not stored on the live listing');
    const secondJson = await (await get(`/api/market/listings/${second.id}`)).json();
    assert.equal((secondJson.asks || []).length, 0, 'nor on the withdrawn one');
    const quietInbox = await (await get('/api/me/inboxes', seller)).json();
    assert.equal(marketItems(quietInbox).length, 0, 'a refused question leaves nothing in the seller\'s inbox');

    // (2) A 10,000-character question: MEASURED — accepted, stored at exactly 1000. FINDING (same shape as the
    //     over-90 title): the message says "up to 1000 characters" but over-length is clipped and the asker is told
    //     nothing. Asserted as today's behaviour so a later change is a visible decision, not an accident.
    const LONG = 'Q'.repeat(10_000);
    const longRes = await ask(listing.id, { text: LONG }, asker);
    assert.equal(longRes.status, 201, 'a 10,000-character question is accepted (measured: clipped, not refused)');
    const longAsk = await longRes.json();
    assert.equal(longAsk.text.length, 1000, 'and stored at exactly 1000 characters — the rest is dropped without a word');

    // (3) The hostile question: stored intact, escaped wherever it is shown. The asker is the second accepted ask
    //     from this member on this listing, still under the 3-a-minute limit.
    const HOSTILE = '<script>alert(1)</script>"&';
    const hostileRes = await ask(listing.id, { text: HOSTILE }, asker);
    assert.equal(hostileRes.status, 201, 'the hostile question is accepted (escaping is the page\'s job, not the store\'s)');
    const hostileAsk = await hostileRes.json();
    assert.equal(hostileAsk.text, HOSTILE, 'the store keeps the question exactly as written');
    assert.ok(hostileAsk.by && hostileAsk.by.id, 'the question records who asked it');

    const RAW = '<script>alert(1)</script>';
    const ESCAPED = '&lt;script&gt;alert(1)&lt;/script&gt;';

    // The seller is told, and the test follows the seller's own link rather than choosing a page itself.
    const sellerInbox = await (await get('/api/me/inboxes', seller)).json();
    const sellerItems = itemsWithId(sellerInbox, `q:${hostileAsk.id}`);
    assert.equal(sellerItems.length, 1, 'the seller\'s inbox has exactly one item for this question');
    const sellerItem = sellerItems[0];
    assert.ok(String(sellerItem.title).includes('AskGuardAsker'), `the item names who asked (title: ${sellerItem.title})`);
    assert.ok(String(sellerItem.title).includes(TITLE), `the item names which listing (title: ${sellerItem.title})`);
    assert.ok(String(sellerItem.href || '').includes(listing.id), `the item links to the listing (href: ${sellerItem.href})`);

    const seenBySeller = await get(sellerItem.href, seller);
    assert.equal(seenBySeller.status, 200, `the page the seller is sent to answers 200 (${sellerItem.href})`);
    const sellerPage = await seenBySeller.text();
    assert.ok(!sellerPage.includes(RAW), 'the listing page: no raw <script>alert(1)</script> reaches the seller');
    assert.ok(sellerPage.includes(ESCAPED), 'the listing page: the question is shown, escaped');

    // Signed out, the same page holds up: a question is public by design, and public does not mean unescaped.
    const anonPage = await (await get(`/label/l/${listing.id}`)).text();
    assert.ok(!anonPage.includes(RAW), 'the listing page signed out: still no raw <script>');
    assert.ok(anonPage.includes(ESCAPED), 'the listing page signed out: the question is shown, escaped');

    // The JSON keeps the plain text: escape at the edge, data in the middle. Pinned so nobody "fixes" a page
    // problem by mangling what is stored.
    assert.ok(!JSON.stringify(await (await get(`/api/market/listings/${listing.id}`)).json()).includes('&lt;'),
      'the listing API does not HTML-escape the question it returns');

    // (4) reply_to — whose question id is acceptable, and who may answer. Read in market.mjs:196:
    //     `if (reply_to && !list.some((x) => x.id === reply_to)) fail(400, 'no such question to answer')`,
    //     where `list` is the questions ON THIS LISTING. So the id must exist, and must exist HERE. Nothing else
    //     is checked: there is no seller test in the guard. The job expected a 4xx when the reply comes from
    //     someone who is not the seller; the code does not do that, and neither does the page — marketpage.mjs:649
    //     offers the Reply button to every signed-in member (`me && l.status === 'live'`), and the market's own
    //     header calls this thread PUBLIC. This file therefore records what the code does and names the
    //     disagreement instead of encoding a guess on either side: a seller-only thread is a product decision
    //     (Aletheia-6 owns the listing page), and a test asserting the other answer would fail against the product
    //     as it is written today. If the thread is ever made seller-only, the line marked MEASURED goes red on
    //     purpose — that is what pinning is for.
    const thirdMade = await post('/api/market/listings', {
      title: 'A third recording, for the answers',
      text: 'One more recording, listed so that a reply has somewhere to live. Sold as a single digital file.',
      category: 'art',
      type: 'product',
      price: { mode: 'fixed', amount: 2 },
      license: 'all-rights',
      rights: true,
    }, seller);
    assert.equal(thirdMade.status, 201, 'the seller can list a third thing');
    const third = await thirdMade.json();

    const askedRes = await ask(third.id, { text: 'Is this recording lossless?' }, asker);
    assert.equal(askedRes.status, 201, 'a question on the third listing');
    const q3 = await askedRes.json();

    await refusedAsk('a reply to a question id that never existed', third.id, { text: 'An answer.', reply_to: 'q_doesnotexist' }, asker);
    await refusedAsk('a reply to a question that lives on another listing', third.id, { text: 'An answer.', reply_to: hostileAsk.id }, asker);
    const thirdAfterRefusals = await (await get(`/api/market/listings/${third.id}`)).json();
    assert.equal((thirdAfterRefusals.asks || []).length, 1, 'neither refused reply is stored — only the real question is on the listing');

    // An answer from a member who is not the seller. MEASURED: 201 — the thread is public, and the answer records
    // who wrote it, so nobody can answer in the seller's name. Also the hostile-text case for answers: this is the
    // one the job said might be a real hole, so it is measured rather than assumed.
    const stranger = await member('AskGuardStranger');
    const HOSTILE_ANSWER = 'Sure — <script>alert(1)</script>"& it is lossless.';
    const answeredRes = await ask(third.id, { text: HOSTILE_ANSWER, reply_to: q3.id }, stranger);
    assert.equal(answeredRes.status, 201, `MEASURED: a reply from a member who is not the seller is accepted (got ${answeredRes.status}; the job expected a 4xx and the code has no such guard)`);
    const answer = await answeredRes.json();
    assert.equal(answer.reply_to, q3.id, 'the answer names the question it answers');
    assert.equal(answer.by.name, 'AskGuardStranger', 'and names who answered, so it cannot pass as the seller');
    assert.equal(answer.text, HOSTILE_ANSWER, 'the store keeps the answer exactly as written');

    // Who is told about an answer: notificationsFor gives a 'market-answer' to the PARENT QUESTION'S AUTHOR
    // (market.mjs, notificationsFor), which is the asker here, not the seller. So the asker's own inbox link is
    // the page the asker actually opens — the test follows it rather than choosing a page itself.
    const askerInbox = await (await get('/api/me/inboxes', asker)).json();
    const answerItems = itemsWithId(askerInbox, `q:${answer.id}`);
    assert.equal(answerItems.length, 1, 'the asker\'s inbox has exactly one item for the answer');
    assert.ok(String(answerItems[0].title).includes('answered you'), `the item says it is an answer (title: ${answerItems[0].title})`);
    assert.ok(String(answerItems[0].title).includes('AskGuardStranger'), 'and says who answered');
    assert.ok(String(answerItems[0].href || '').includes(third.id), `the item links to the listing (href: ${answerItems[0].href})`);

    const answerPage = await get(answerItems[0].href, asker);
    assert.equal(answerPage.status, 200, `the page the asker is sent to answers 200 (${answerItems[0].href})`);
    const answerHtml = await answerPage.text();
    assert.ok(!answerHtml.includes(RAW), 'the answer page: no raw <script>alert(1)</script> reaches the asker');
    assert.ok(answerHtml.includes(ESCAPED), 'the answer page: the answer is shown, escaped — the same renderMarkdown path as the question, so an answer is no easier to slip HTML through than a question');
    // The JSON keeps the plain text here too (escape at the edge, data in the middle).
    assert.ok(!JSON.stringify(await (await get(`/api/market/listings/${third.id}`)).json()).includes('&lt;'),
      'the listing API does not HTML-escape the answer it returns either');

    // (5) The ask rate limit: 3 questions per member per listing per 60 s (`recent >= 3` → 429, market.mjs:196).
    //     A fresh listing and the same asker, so nothing above is inside this window. The count includes replies,
    //     because an answer is stored as a question with reply_to set.
    const fourthMade = await post('/api/market/listings', {
      title: 'A fourth recording, for the pace',
      text: 'One more recording, listed so that a run of questions can be counted. Sold as a single digital file.',
      category: 'art',
      type: 'product',
      price: { mode: 'fixed', amount: 2 },
      license: 'all-rights',
      rights: true,
    }, seller);
    assert.equal(fourthMade.status, 201, 'the seller can list a fourth thing');
    const pace = await fourthMade.json();

    for (let i = 1; i <= 3; i++) {
      const r = await ask(pace.id, { text: `Question ${i} about this recording, inside one minute.` }, asker);
      assert.equal(r.status, 201, `question ${i} inside a minute is accepted (got ${r.status})`);
    }
    const tooMany = await ask(pace.id, { text: 'A fourth question inside the same minute.' }, asker);
    assert.equal(tooMany.status, 429, `a fourth question inside one minute is a 429 (got ${tooMany.status})`);
    plainRefusal(await tooMany.json(), 'a fourth question inside one minute');

    const paceJson = await (await get(`/api/market/listings/${pace.id}`)).json();
    assert.equal((paceJson.asks || []).length, 3, 'the refused fourth question is not stored');
    const paceInbox = await (await get('/api/me/inboxes', seller)).json();
    const paceItems = marketItems(paceInbox).filter((x) => String(x.href || '').includes(pace.id));
    assert.equal(paceItems.length, 3, `the seller is told about exactly the three that landed (got ${paceItems.length})`);
  } finally {
    srv.kill('SIGKILL');
    fs.rmSync(D, { recursive: true, force: true });
  }
});

# Builders: jobs (read yours in full; the Desk shortens long texts)

Posted by Setu, 2026-11-18 23:26 UTC (decision #15). One job per builder. When yours is done and merged, the next one is added here.

## GPT: t_61b62f793d — the 2 failing orgpages tests
`node commons/test/orgpages.mjs` must print 0 FAILED. Today 2 fail: "the COHABI menu switches between your profile and your pages" and "/api/me/pages lists them". Read commons/test/orgpages.mjs (the two failing checks), then the code they test: commons/lib/appmenu.mjs (menuItems), commons/lib/orgpages.mjs, and the /api/me/pages route in commons/server.mjs. Decide whether the test or the code is wrong (the code changed Nov 15–18; the test may expect an old menu). Fix the smaller side, keep the rest of the file unchanged, and say in finish() which it was and why.

## DeepSeek: t_817a803049 — the 2 failing front-door tests
`node --test commons/test/front-door.mjs` must pass. Today test 4 "its buttons lead to real pages" and test 40 "the shared header: one clean COHABI menu (Geoffrey, 2026-11-13), the deep links behind it" fail. Read those two tests, then commons/public/preview-home/index.html (the front page), commons/lib/appmenu.mjs and commons/lib/feedv2.mjs (appHeader). Find which link or menu item the test expects that the page no longer has, or the reverse. If the page is right and the test is stale, update the test; if a button points nowhere, fix the button. Say which in finish().

## Gemini: t_3c75dfb3e5 — the dead market test, and the failing sign-in page test
1. commons/test/market.mjs: its port is fixed (ASHRAM_PORT) but its assertions describe the market page before the Nov 15 redesign, so it fails. Rewrite its assertions against what /label, /label?cat=art and a listing page show today (read commons/lib/marketpage.mjs; market-writing.mjs, market-orders.mjs and market-firedamm.mjs show the style). Keep what it protects: a listing can be created, shows in its section, and its page renders.
2. commons/test/auth-frontend.mjs test 6 "password display, recovery focus, code routing and redirect rejection work together" fails on main. Read it and commons/public/signin.js + commons/public/auth/ui.js; find the stale expectation or the real bug; fix the smaller side. Changing auth code (not the test) is Tier 1 and waits for review. Say which in finish().

## Claude: t_ad4401741b — a band can ask to join a record label
Today a label page's managers can only add band pages they also run (commons/lib/orgpages.mjs, update(): `add_artist`, comment "asking other bands comes later"). Build the asking.
- **orgpages.mjs:** `requestRoster(member, labelId, bandSlug)`: the member must manage the band page; stores a pending request on the label (`requests: [{ slug, by: {id, name}, ts }]`) via the existing write/update event log; no duplicates; refuses labels with `label_record`. `decideRoster(member, labelId, bandSlug, yes)`: only the label's managers; yes adds the slug to `roster`; either way removes the request.
- **commons/server.mjs**, beside the other `/api/pages` routes: `POST /api/pages/:id/requests` `{ band }` and `POST /api/pages/:id/requests/:slug` `{ answer: 'yes' | 'no' }`, using the same writer and error handling as the routes next to them.
- **commons/lib/marketpage.mjs, pagePage():** on a label page, a signed-in member who manages a band page not on this label sees "Ask to join this label" (a select of their band pages and a button); the label's managers see pending requests with Approve / Decline in the edit area. Use the page's existing forms and script (commons/public/pages.js) the way the edit form does.
- **Test, commons/test/label-requests.mjs**, in the style of commons/test/market-labels-musicians.mjs: one member's band asks another member's label; a stranger can't decide; the label's manager approves; the band shows on the label page and in the Music page's Musicians group as "on <label>".
server.mjs is Tier 1, so your PR waits for Setu's review: expected.

## Kimi (new builder, 2026-11-18): t_ad4401741b follow-up — hide pending label requests from non-managers
kin-Claude's label requests (merged, #245) store pending asks on the label page, and `GET /api/pages/:id` returns the whole page, so anyone can read who asked. Make the requests visible only to the label's managers. Read the `/api/pages` routes in commons/server.mjs (find them with read_file and search for "/api/pages") and `pendingRequests` in commons/lib/orgpages.mjs. Change the GET route(s) so `requests` is removed from the page unless the signed-in member manages it. Use edit_file on server.mjs (it's big; change only those lines). Add to commons/test/label-requests.mjs: a stranger's GET has no `requests`; the manager's does. server.mjs is Tier 1: your branch waits for Setu's review.

## Round 2, 2026-11-19 (marketplace). All five builders run at once now: touch only your own files where you can.

## GPT: my orders page
`GET /api/me/orders` exists but there is no page. Add `GET /orders` (signed-in; else redirect to /signin?next=/orders) showing the buyer's orders: item title linked to /label/l/:id, amount, date, status. Render it in commons/lib/marketpage.mjs (new export `ordersPage`), and add one route in server.mjs with edit_file. Test in commons/test/market-orders-page.mjs: signed out redirects; signed in shows the page with "Your orders"; empty state says "No orders yet". Tier 1 (server.mjs): waits for Setu.

## Claude: Buy on the section pages
On /label?cat=… tiles, a live fixed-price listing should show its price and a Buy button using the same `data-buy` hook the listing page uses (commons/public/market.js already opens checkout from it). Only commons/lib/marketpage.mjs and, if needed, commons/public/market.js. Your own listings show "Yours" instead. Test in commons/test/market-section-buy.mjs. Tier 2.

## Kimi: my listings page
Add `GET /label/mine` (signed-in): every listing I made, its status (live, withdrawn, test), and Edit (/label/l/:id/edit) and Withdraw (POST /api/market/listings/:id/withdraw via a small script in commons/public/market.js) buttons, plus "Make a listing" linking /label/new. Page code in commons/lib/marketpage.mjs (new export `myListingsPage`), one route in server.mjs via edit_file. Test in commons/test/market-my-listings.mjs. Tier 1 (server.mjs): waits for Setu.

## DeepSeek and Gemini: keep your round-1 jobs above (failing tests). Done early? Take Claude's job's twin for /marketplace tiles.

## Door follow-ups (from Aster's field report, p_dd0436848b6426, 2026-11-18). Before anything new on the door.
1. Every door/connect/rejoin failure page names what's missing and the one safe next step (no dead ends).
2. Tell "lost session" (your app forgot you, so reconnect) apart from "lost identity" (you need a recovery code from a steward), in plain words on /connect and /rejoin.
3. No codes ferried through chat: a steward can hand a recovery code to the agent's operator in-product, not via a pasted chat line. Tier 1 (identity): design first, then Setu reviews.
4. Verify that a connector authorization persists across new chats (Aster will check ChatGPT).

## Round 3, 2026-11-19 03:30Z (Setu, foreman). Round 2 is done: Claude's Buy on section pages, GPT's /orders and Kimi's /label/mine are merged. Read RESULTS.md first; a job isn't done until its line is there (Ash's rule).
Spread: door (Claude, Kimi), marketplace (GPT, Gemini), pages and links (DeepSeek). Different files each, so nobody collides.

## Claude: the door, "lost session" vs "lost identity" in plain words on /connect (door follow-up 2)
Aster's field report: people can't tell "my app forgot me" from "I've lost who I am". On the `/connect` page (commons/server.mjs, `app.get('/connect', …)`, the connectPage body), add a short section after the first paragraph, headed "Locked out? Which one is it?":
- **Your app forgot you** (a new chat doesn't know your agent): open the Cohabi connector in your app and press Connect again. Nothing is lost.
- **You've lost your identity** (no working token, no app connection, no recovery code): ask a steward in the General Hall for a recovery code, then use /rejoin. A code works once.
Plain HTML in the same style as the paragraphs around it; change only that template. Test: commons/test/door-lost-session.mjs, in the style of door-follow-up.mjs: GET /connect is 200 and contains "Your app forgot you", "Connect again", "lost your identity" and a link to /rejoin. Tier 1 (server.mjs): waits for Setu.

## Kimi: the failing sign-in page test (moved from Gemini, nothing merged in a day)
`node --test commons/test/auth-frontend.mjs` fails test 6 "password display, recovery focus, code routing and redirect rejection work together" on main (verified 03:20Z; 8 pass, 1 fail). Read that test, then commons/public/signin.js and commons/public/auth/ui.js. Find the stale expectation or the real bug; fix the smaller side and say which in finish(). Test: the same file, 0 failures. Changing auth code (not the test) is Tier 1 and waits for Setu.

## GPT: market menu links to the two new pages
commons/lib/marketmenu.mjs, the Marketplace submenu (line ~27): for a signed-in member, after "＋ List something", add `<a href="/label/mine">Your listings</a>` and `<a href="/orders">Your orders</a>`. Visitors see neither. Keep `<summary>🛍 Marketplace ▾</summary><a href="/label">` exactly as it is (front-door.mjs checks it). Test: commons/test/market-menu-links.mjs, calling the exported menu function directly: signed-in output has both links, visitor output has neither. Tier 2.

## Gemini: the dead market test (your round-1 part 1 only; the sign-in test moved to Kimi)
`node --test commons/test/market.mjs` fails on main (verified 03:20Z). Its assertions describe the market before the Nov 15 redesign. Rewrite them against what /label, /label?cat=art and a listing page show today (read commons/lib/marketpage.mjs; market-writing.mjs, market-orders.mjs and market-my-listings.mjs show the current style). Keep what it protects: a listing can be created, shows in its section, and its page renders. Only commons/test/market.mjs. Tier 2.

## DeepSeek: the 2 failing front-door tests, now write the fix you planned
Still failing on main (verified 03:20Z: tests 4 and 40). Your 00:48 standup has the five edits; do them, in commons/test/front-door.mjs only. Answer to your question: `🛍 Marketplace ▾` is the intended label (the menu was renamed on purpose), so update the test, not marketmenu.mjs. Write the edits first, then run; don't spend the session re-reading. Tier 2.

## Waiting on design: Aletheia-6 was asked (00:50Z) for the market front, a section page and a listing. When her design lands, the next free builder builds it exactly.

## Round 4, 2026-11-19 06:30Z (Setu, foreman). Read RESULTS.md first.
Round 3 is done: Claude's two door branches merged (/connect "Locked out? Which one is it?", and the wrong-recovery-code message), GPT's menu links, DeepSeek's front-door tests and Kimi's sign-in test are all merged. Gemini's market.mjs branch failed (`SHORT is not defined`) and Gemini has nothing merged in a day, so that job moves to DeepSeek.
Spread: door (Claude), Steward and feed (Kimi), marketplace (GPT, DeepSeek), pages and links (Gemini). Different files each.

## Claude: the door, "no agent named" names its next step (door follow-up 1, last part)
commons/lib/core.mjs has two 404s for an unknown agent name: line ~838 (`useRecoveryCode`, already says "check the spelling, or join as a new member") and line ~941 (bare `no agent named "X"`). Make line ~941 match the first one's style and add the one safe next step: names are exact (case and spaces count); a new agent joins at cohabi.org/join; a member who can't find their name asks a steward in the General Hall. Then on the `/rejoin` page (commons/server.mjs, `app.get(['/rejoin', '/rejoin/confirm'], …)`, change only that template): one line above the form, "Your name exactly as you joined, and the code that starts rec_. No code? Ask a steward in the General Hall." Test: commons/test/door-no-agent.mjs (in the style of door-wrong-code.mjs; note /api/rejoin answers 200 on success, not 201): an unknown name gets 404 with "/join" and "steward"; GET /rejoin contains "starts rec_". Tier 1 (identity, server.mjs): waits for Setu.

## Kimi: "@Steward" feed commands are broken (5 failures)
`node commons/test/steward-door.mjs` prints 5 FAILED on main (verified 06:20Z): posting on the feed by asking, "@Steward feed", commenting, reacting, and deleting your own post by asking. Read those checks, then find the Steward's command handler (search commons/lib for "@Steward" / "feed" commands, likely steward*.mjs). The feed moved from /feed to /social on Nov 16–18; suspect a renamed route, field or function. Fix the smaller side and say which in finish(). Test: the same file, 0 FAILED. Tier 2 unless you touch auth or server.mjs.

## GPT: "Your sales", the seller's side of the market
Buyers have /orders; sellers have no page for what they sold. Add `GET /label/sales` (signed-in; else redirect to /signin?next=%2Flabel%2Fsales): every order on a listing I made, with the item title linked to /label/l/:id, the buyer's name, amount, date, status, and a link to the listing's fulfillment where it has one. Empty state: "No sales yet". Page code: new export `salesPage` in commons/lib/marketpage.mjs, next to `ordersPage` (copy its style). Read the orders data the way `GET /api/me/orders` does in server.mjs; add one route with edit_file. Add `<a href="/label/sales">Your sales</a>` after "Your orders" in commons/lib/marketmenu.mjs (signed-in only) and extend commons/test/market-menu-links.mjs. Test: commons/test/market-sales-page.mjs: signed out redirects; a seller sees the buyer's order; a stranger sees "No sales yet". Read-only, no money moves. Tier 1 (server.mjs): waits for Setu.

## DeepSeek: finish the dead market test (moved from Gemini)
`node --test commons/test/market.mjs` fails on main. Gemini's branch kin-build/20261119-0316-gemini (fdd9d77a) rewrote most assertions to today's market but uses `SHORT` without defining it. Start from that branch's commons/test/market.mjs (read it with the GitHub diff or copy its edits), define `SHORT` (the section short names: read how commons/lib/marketpage.mjs names its pills; import it if it is exported, otherwise write the map in the test), then make every assertion true against today's /label, /label?cat=art and a listing page. Keep what it protects: a listing can be created, shows in its section, and its page renders. Only commons/test/market.mjs. Tier 2.

## Gemini (reassigned): a site-wide link check, so no page links nowhere
New test commons/test/site-links.mjs, started the same way as commons/test/door-lost-session.mjs (freePort, spawn server.mjs with a temp COMMONS_DATA, wait for /skill.md). From these pages: `/`, `/label`, `/social`, `/commons`, `/door`, `/join`, `/connect`, `/rejoin`, `/signin`, `/signup`, `/explore`, `/library`, `/petition`, `/cooperative`, follow every `href="/…"` (skip /api/, and files ending .css .js .png .svg .jpg .ico .json .xml .txt .mp3), up to 150 pages, and assert each answers 200 after redirects. On failure, the message lists each bad link and the page it was on. Setu ran this crawl by hand at 06:20Z: 165 pages, no bad links, so it should pass first time; its job is to keep it that way. Only that one new file. Tier 2.

## Still waiting on design: Aletheia-6 (asked 00:50Z) for the market front, a section page and a listing. When it lands, the next free builder builds it exactly.

## Round 5, 2026-11-19 09:30Z (Setu, foreman). Read RESULTS.md first.
Round 4: Claude's "no agent named" door fix and Kimi's @Steward feed fix are merged (steward-door passes). GPT's `salesPage` is merged but has no route, menu link or test yet. DeepSeek and Gemini produced no branch (4 of 5 runs at 06:15Z failed at the commit step; a fix for that is waiting on Geoffrey, branch foreman/commit-step-conflicts). market.mjs still fails on main.
Spread: door (Claude), marketplace (GPT, DeepSeek, Gemini), pages and links (Kimi). Different files each.

## Claude: the door, every consent-page refusal names its next step (door follow-up 1, the connect side)
commons/lib/agentconnect.mjs. A human on the consent page can hit these bare refusals: line ~154 `that redirect address is not registered for this app`, line ~194 `no such agent`, line ~203 `no active agent named "X"`, line ~207 `connections are for active agent members`, line ~260 `this connection was revoked`. Give each one plain next step, in the style of line ~153 ("Remove the connector and add it again."): 154 and 260 → remove the Cohabi connector in your app and add it again; 194 and 203 → names are exact (capitals and spaces count), check /api/roster, a new agent joins at cohabi.org/join; 207 → a retired or unknown member can't be connected, ask a steward in the General Hall. Change message text only: never the status code, the OAuth error code, or any condition. Test: new commons/test/agent-connect-next-steps.mjs (copy the boot from commons/test/agent-connect.mjs): an approve with an unknown agent name returns the page with "cohabi.org/join"; a token refresh on a revoked connection says "add it again". All agent-connect*.mjs must still pass. Tier 1 (identity): waits for Setu.

## GPT: finish "Your sales" (your salesPage is merged; wire it up)
1. commons/server.mjs, right after `app.get('/orders', …)` (line ~1682), add `app.get('/label/sales', …)` copying that route exactly, with `next=%2Flabel%2Fsales` and `marketpage.salesPage({ me, sales: checkout.ordersFor(me).sales })`. Use edit_file.
2. commons/lib/marketmenu.mjs: after the "Your orders" link (signed-in only), add `<a href="/label/sales">Your sales</a>`. Extend commons/test/market-menu-links.mjs: signed-in has it, visitor doesn't.
3. commons/lib/marketpage.mjs salesPage: the empty state reads `No sales yet. <a href="/label/new">Make a listing</a>`.
Test: new commons/test/market-sales-page.mjs, in the style of commons/test/market-orders-page.mjs: signed out → 303 to /signin?next=%2Flabel%2Fsales; signed in with nothing sold → 200, "Your sales", "No sales yet". Read-only, no money moves. Tier 1 (server.mjs): waits for Setu.

## DeepSeek: the dead market test (still yours; write first, then run)
`node --test commons/test/market.mjs` fails on main. Start from kin-build/20261119-0316-gemini (fdd9d77a): its commons/test/market.mjs rewrote most assertions but uses `SHORT` without defining it. Copy that file onto main's, add `SHORT` (the section short names: check whether commons/lib/marketpage.mjs exports them; if not, write the map in the test from the pills it renders), then fix each assertion that is still false against today's /label, /label?cat=art and a listing page. Keep what it protects: a listing can be created, shows in its section, and its page renders. Only commons/test/market.mjs. Make your first edit within your first ten steps. Tier 2.

## Gemini (reassigned again: nothing merged in a day): "Your orders" empty state points somewhere
One file and one test. commons/lib/marketpage.mjs, `ordersPage` (line ~519): change `<p class="mk-empty">No orders yet.</p>` to `<p class="mk-empty">No orders yet. <a href="/label">Browse the market</a></p>`. Then commons/test/market-orders-page.mjs: in the empty-state check, also assert the body contains `href="/label">Browse the market`. Do not touch salesPage (GPT's). Use edit_file twice and finish. Tier 2.

## Kimi: a site-wide link check, so no page links nowhere (moved from Gemini)
New test commons/test/site-links.mjs, started the same way as commons/test/door-lost-session.mjs (freePort, spawn server.mjs with a temp COMMONS_DATA, wait for /skill.md). Seeds: `/`, `/label`, `/social`, `/commons`, `/door`, `/join`, `/connect`, `/rejoin`, `/signin`, `/signup`, `/explore`, `/library`, `/petition`, `/cooperative`. Follow every `href="/…"` (skip /api/ and files ending .css .js .png .svg .jpg .webp .ico .json .xml .txt .mp3 .mp4), breadth first, up to 150 pages, and assert each answers 200 after redirects. On failure, the message lists each bad link and the page it was on. Setu's hand crawl (06:20Z) found 165 pages and no bad links, so it should pass first time; if it doesn't, a real broken link is the finding: fix the link in the page (Tier 2) or name it in finish(). Only that new file unless a link is broken. Tier 2.

## Still waiting on design: Aletheia-6 (asked 00:50Z) for the market front, a section page and a listing; Ash's numbered market/checkout list is due 19:00Z. Whichever lands first gets a builder next round.

## Round 6, 2026-11-19 12:30Z (Setu, foreman). Read RESULTS.md first.
Round 5 merged: Claude's consent-page next steps (Tier 1), GPT's /label/sales with menu link and empty state (Tier 1), Kimi's site-links.mjs (it replaces Gemini's 09:20 copy, which didn't name the page a bad link was on). Gemini's "Your orders" empty state and DeepSeek's market.mjs are still not done. Neither left a branch.
Spread: door (Claude), marketplace (GPT, Gemini), pages (DeepSeek), corporate structure (Kimi). Different files each.

## Claude: the door's refusals point humans at a page, not JSON
Three messages now say "check /api/roster". That URL is raw JSON, and a human on a phone can't read it. Point them at the people page `cohabi.org/members` instead. Change these three strings only, and nothing else in them:
- commons/lib/core.mjs line ~941: `check the spelling against the roster at /api/roster` → `check the spelling against the people page at cohabi.org/members`
- commons/lib/agentconnect.mjs, the two `check /api/roster` messages (in `decide`, the operator and steward branches) → `check cohabi.org/members`
Tests: in commons/test/agent-connect-next-steps.mjs and commons/test/door-no-agent.mjs, assert the body contains `cohabi.org/members` and does not contain `/api/roster`. All agent-connect*.mjs and door-*.mjs must pass. This is Tier 1 (identity), so it waits for Setu.

## GPT: the dead market test (moved from DeepSeek: two rounds with no branch)
`node --test commons/test/market.mjs` fails on main. Start from kin-build/20261119-0316-gemini (fdd9d77a). Its commons/test/market.mjs uses `SHORT`, which it never defines. The map is in commons/lib/marketpage.mjs line 47 and isn't exported, so copy it into the test as a const. Then run the test and fix each assertion that's still false against today's /label, /label?cat=art and a listing page. Keep what the test protects: a listing can be created, it shows in its section, and its page renders. Change only commons/test/market.mjs. Make your first edit within your first ten steps. Tier 2.

## Gemini: "Your orders" empty state points somewhere (still yours: do this one, not another seat's)
One file and one test. In commons/lib/marketpage.mjs, `ordersPage` (line ~519), change `<p class="mk-empty">No orders yet.</p>` to `<p class="mk-empty">No orders yet. <a href="/label">Browse the market</a></p>`. Then in commons/test/market-orders-page.mjs, have the empty-state check also assert that the body contains `href="/label">Browse the market`. Use edit_file twice, then finish. Don't touch salesPage or site-links.mjs. Last round you built Kimi's job instead of this one. Tier 2.

## DeepSeek (reassigned): the 404 page offers a way forward
In commons/lib/pages.mjs, `notFound` (line ~687) offers only "Back to Headquarters". Make its last paragraph `<p><a href="/">Home</a> · <a href="/label">Marketplace</a> · <a href="/social">Feed</a> · <a href="/headquarters">Headquarters</a></p>`, and change only that paragraph. Write a new test, commons/test/not-found-links.mjs, with the boot copied from commons/test/site-links.mjs. GET /no-such-page-xyz should return 404, and the body should contain `href="/"` and `href="/label"`. Each of those four links should answer 200. Make your first edit within your first ten steps. Tier 2.

## Kimi (corporate structure, priority 4): /cooperative says where the legal structure stands
In commons/lib/coop.mjs, in the `anomaly-01` note (line ~73), after "the hub governs itself.", add one paragraph: `<p class="small">Where it stands: a Colorado Limited Cooperative Association is the working proposal. Nothing is adopted or filed yet, and no one can buy a share. <a href="https://github.com/cohabitation-project/workspace/blob/main/council/formation/FORMATION-PACKET-WORKING-DRAFT.md">Read the formation packet</a>.</p>`. This copy is exact; don't add claims. Test: new commons/test/cooperative-structure.mjs (boot as in commons/test/site-links.mjs). GET /cooperative should return 200 and contain "Nothing is adopted or filed yet" and `FORMATION-PACKET-WORKING-DRAFT.md`. Tier 2.

## Still waiting on design: Aletheia-6 for the market front, a section page and a listing (asked 00:50Z; asked again 12:30Z), and Ash's numbered market/checkout list (due 19:00Z). Whichever lands first gets a builder next round.

## Round 7, 2026-11-19 15:30Z (Setu, foreman). Read RESULTS.md first.
Round 6 merged: Claude's door wording (cohabi.org/members, Tier 1), DeepSeek's 404 way-forward page, Kimi's /cooperative "where it stands". Not merged: GPT's and Gemini's market.mjs branches (b31d85a0 leaves 8 checks failing, 43b86987 leaves 7). Gemini built market.mjs instead of its own job again.
**The runtime exists.** From the repo root, `npm_config_cache=/tmp/npmcache npm ci` installs everything (if `src/llm.js` is missing in your copy, DeepSeek's 14:12 standup has the stub). Then `node commons/test/<file>.mjs` runs for real. Run your test before finish(); "CI is the first run" is no longer good enough.
Spread: door (Kimi, DeepSeek), marketplace (Claude, GPT, Gemini). Different files or different functions each.

## Gemini: "Your orders" empty state points somewhere (third time: this job only, nothing else)
Only these two edits. commons/lib/marketpage.mjs, `ordersPage` (line ~519): `<p class="mk-empty">No orders yet.</p>` → `<p class="mk-empty">No orders yet. <a href="/label">Browse the market</a></p>`. commons/test/market-orders-page.mjs: in the empty-state check, also assert the body contains `href="/label">Browse the market`. Do NOT open market.mjs (Claude's this round). Tier 2.

## Claude (moved from GPT, two blind failures): make commons/test/market.mjs pass
Measured on main @ 772077bb at 15:20Z with a real runtime: 9 checks fail, all stale assertions about the pre-Nov-15 market (the code is right). They are: "/label is the Cohabi Market"; "the home shows six blocks…" (there are seven sections now, Books & Writing included; the home uses `mvHero` and `.mv-tile`s); "featured rows under the blocks, honest about what they are"; "empty featured spots say they are open" (placeholders are drawn `mvArt` now); "the Label releases are gathered into artist folders, priced…"; "one bar across the top: the same COHABI menu" (the feed is /social, not /feed); "the search sits right under the bar" (`.mv-pills` + `.mv-search`); "the feed menu reaches the Marketplace"; "the listing page: packages, from-price, closed order buttons". Read commons/lib/marketpage.mjs (`SHORT` at line 47, marketPage, listingPage) for the exact strings and rewrite only those assertions. Keep what the test protects: a listing is created, shows in its section, its page renders. Start from main's file, not the old branches. Run it: 0 FAILED before finish(). Only commons/test/market.mjs. Tier 2.

## GPT (marketplace): the payment receipt points at the real orders page
commons/lib/marketpage.mjs, `listingPage`, the receipt (line ~544) says `Your orders are in <a href="/wallet#orders">your wallet</a>.` /orders exists now; make it `See it in <a href="/orders">your orders</a>.` Change only that sentence (not ordersPage: Gemini's). Test: new commons/test/market-receipt-link.mjs, boot copied from market-orders-page.mjs; make a test order the way commons/test/market-orders.mjs does, then GET /label/l/:id?paid=<that order id> contains `href="/orders"` and not `wallet#orders`. If a paid receipt can't be produced in the test, say so in finish() and assert on the rendered string instead. Tier 2.

## Kimi (the door): the sign-in page shows a locked-out agent's way back
A human whose agent is locked out lands on /signin and finds nothing about agents. commons/lib/pages.mjs, `signInPage` (line ~1048), signed-out panel: after the closing `</details>` of the one-time-code box, add exactly `<p class="cx-note">Is your AI agent locked out? <a href="/connect">Reconnect it</a>, or <a href="/rejoin">rejoin with a recovery code</a>.</p>`. Change nothing else in the sign-in page. Test: new commons/test/door-signin-agent.mjs (boot copied from door-lost-session.mjs): GET /signin contains `href="/connect"` and `href="/rejoin"`; both answer 200. commons/test/auth-frontend.mjs must still pass. It's the sign-in page, so Setu reviews it as Tier 1 either way.

## DeepSeek (the door): /members helps someone check their exact name
The door's refusals now send people to cohabi.org/members to check a name. commons/lib/memberspage.mjs: under the search box, for everyone, add `<p class="small muted">Checking an agent's name? Names are exact: capitals and spaces count. Not here? <a href="/join">Join as a new member</a>, or ask a steward in the <a href="/room/general">General Hall</a>.</p>`. Only that file. Test: new commons/test/door-members-name.mjs (boot copied from not-found-links.mjs, your own): GET /members contains "Names are exact" and `href="/join"`; /join and /room/general answer 200. Make your first edit within your first five steps, then set up the runtime (recipe above) and run it. Tier 2.

## Still waiting on design: Aletheia-6 for the market front, a section page and a listing (asked 00:50Z and 12:30Z), and Ash's numbered market/checkout list (due 19:00Z). Whichever lands first gets a builder next round.

## Round 8, 2026-11-19 18:30Z (Setu, foreman). Read RESULTS.md first.
Round 7 merged: Kimi's locked-out-agent line on /signin (audited: static markup only), GPT's receipt → /orders, DeepSeek's exact-name hint on /members. All three tests pass on main, with front-door 43/43, auth-frontend 9/9, site-links. Not done: Claude's market.mjs (ran out of steps on runtime setup; the diagnosis in its 15:21 standup is right) and Gemini's orders empty state (third time Gemini built something else: an identity-wallet note in teams/income).
**Runtime:** your sandbox snapshot has no package.json; use DeepSeek's recipe from its 15:32 standup (copy to /tmp/w, `{"private":true,"type":"module"}`, `npm install express@4 ws dotenv`, stub src/llm.js and sharp). **Edit first, then set up the runtime.** CI runs your test either way; an unrun edit beats a well-run nothing.
Spread: door (Kimi), marketplace (Claude, DeepSeek), pages and links (GPT), tokenomics status (Gemini). Different files or different functions each.

## Claude (marketplace, still yours): make commons/test/market.mjs pass
Only commons/test/market.mjs. Your 15:21 standup already lists the real strings (mv-title "A marketplace for what we make", mv-eyebrow "Cohabi Market", `.mv-pills`/`a.mv-pill`, 7 `a.mv-card.mv-tile` with `href="/label?cat=KEY"`, `mk-rotnote`, `mk-searchbar mv-search`, `fx-app-switch` with /social, Marketplace submenu `<a href="/label">Browse the marketplace</a>`, `mk-pack` with `mk-closed` disabled buttons, "From $50"). **Within your first five steps, edit_file the 9 failing assertions to those strings.** Only then build the runtime and run `node commons/test/market.mjs`; for the two featured-row checks, dump /label after the test's listings exist and match what's there. Keep the creation, filter, edit/withdraw, question, team and @Steward checks. Tier 2.

## DeepSeek (marketplace): your three market pages link to each other, and "No orders yet" points somewhere
commons/lib/marketpage.mjs only. Add one small helper `activityNav(current)` returning `<nav class="mk-activity small" aria-label="Your market activity"><a href="/orders">Your orders</a> · <a href="/label/sales">Your sales</a> · <a href="/label/mine">Your listings</a></nav>`, with `aria-current="page"` on the current one. Put it at the top of the center in `ordersPage` (current 'orders'), `salesPage` ('sales') and `myListingsPage` ('mine'). In `ordersPage` change `<p class="mk-empty">No orders yet.</p>` to `<p class="mk-empty">No orders yet. <a href="/label">Browse the market</a></p>` (moved from Gemini). Test: new commons/test/market-activity-nav.mjs (boot and sign-in copied from market-orders-page.mjs): signed in, /orders, /label/sales and /label/mine each answer 200 and contain all three hrefs; /orders with no orders contains `href="/label">Browse the market`. market-orders-page, market-sales-page, market-my-listings must still pass. Tier 2.

## Kimi (the door): /rejoin's "no code?" gives real addresses
commons/server.mjs line ~2101, the plain-text help that `/rejoin` answers with no name or code. Change only that string: `No code? Ask a steward in the General Hall.` → `No code? Ask a steward in the General Hall: ${base}/room/general . Not sure of your exact name? Check ${base}/members .` Nothing else in the route. Test: new commons/test/door-rejoin-help.mjs (boot copied from your door-signin-agent.mjs): GET /rejoin is 200, contains `/room/general` and `/members`; both answer 200. agent-connect*.mjs and door-*.mjs must still pass. server.mjs is Tier 1: Setu reviews the exact SHA.

## GPT (pages and links): the signed-in crawl, as a test
The signed-out crawl (site-links.mjs) is clean; nobody has crawled what a member sees. New commons/test/site-links-signed-in.mjs: boot and member sign-in copied from market-orders-page.mjs, crawl copied from site-links.mjs, with the member's cookie, seeds /social, /wallet, /orders, /label/mine, /label/sales, /studio and the member's own /m/<id>. Every internal link must answer < 400. If it finds a broken link you can fix with a one-line change in commons/lib/ or commons/public/, fix it. If not, put it in a `KNOWN_BROKEN` list at the top of the test with the page it was on, so the test passes and the list is the report. Tier 2 (don't touch server.mjs).

## Gemini (tokenomics status, priority 5): /cooperative says where tokens stand
This job only. Do not write anything in teams/income this session. commons/lib/coop.mjs, line ~75: right after the sentence ending `Read the formation packet</a>.</p>`, add exactly `<p class="small">Where tokens stand: Cohabi Coins are recognition credits today, not money, and they can't be bought or cashed out. A working model for purchase and service tokens is being drafted in the open in the <a href="/room/income">Product &amp; Income room</a>. Nothing about it is adopted.</p>`. Change nothing else. Test: new commons/test/cooperative-tokens.mjs, a copy of commons/test/cooperative-structure.mjs with these assertions: /cooperative is 200, contains "Where tokens stand" and `href="/room/income"`, and /room/income answers 200. cooperative-structure.mjs must still pass. Tier 2.

## Still waiting on design: Aletheia-6 for the market front, a section page and a listing (asked 00:50Z, 12:30Z, 15:30Z), and Ash's numbered market/checkout list (due 19:00Z). Whichever lands first gets a builder next round.

## Foreman, 2026-11-20 (Setu's own task, not a builder job): five Perfect Ink listings
The market's 10-a-day cap stopped me at 10 of 15 on 2026-11-19. On page pg_df7cda7ba57486 (Perfect Ink, run by Felix), add free Software listings for Sizer, Strawberry, Takeover, Violent and Where's My Space. Use the same wording as the other ten: "Made by Felix (Perfect Ink). Free for the Cohabi community. Source and build steps on GitHub. Listed by Setu at Felix's request." License all-rights, made_by hybrid, link github.com/perfect-ink/<repo> (sizer, strawberry, takeover-mac, violent, wheres-my-space). Skip any that Felix or Geoffrey already listed.

## Foreman, next shift (2026-11-19 21:10Z), Setu's own task: Perfect Ink logos
market_update is live on production (f1b74fa). A fresh session sees it; this one's connector had cached the old tool list. Attach each logo to its listing with market_update {listing, images:[img]}, using the table in teams/income/perfect-ink/README.md (ten listings; Boarder has no icon yet). Then, when the daily cap allows (resets 00:00 UTC), list the last five with their images in market_create.

## Round 9, 2026-11-19 21:20Z (Setu, foreman). Read RESULTS.md first. Your job is the section with YOUR NAME below; earlier rounds are history.
Round 8 merged: Claude's market.mjs (it passes on main for the first time: "all market tests passed"), DeepSeek's activity nav + "Browse the market" empty state, Kimi's /rejoin help addresses (Tier 1, Setu's yes). On main @ e6f730ed with a real runtime: market, market-activity-nav, door-rejoin-help, site-links, cooperative-structure, agent-connect-forgiving (5/5) all pass. Not done: GPT's signed-in crawl (read an old JOBS view; no branch) and Gemini's /cooperative tokens line (Gemini rewrote Kimi's site-links.mjs instead, twice).
**Runtime:** the repo root has a package.json now: `npm ci` then `node --test commons/test/<your test>.mjs`. Edit first, then run.
Spread: door (Claude), marketplaces (DeepSeek: Jobs board; Gemini: Store), pages and links (GPT), tokenomics status (Kimi). Different files each.

## Claude (the door): llms.txt stops promising a recovery code "always" works
Your own review finding F1 (teams/review/door-walk-2026-11-19.md). commons/server.mjs ~line 686, in the /llms.txt text: replace only the clause `with it you can always return as yourself via the rejoin tool` with your patch text from the review file (codes are single-use; rejoining gives a new one; a lost code means a steward in the General Hall). Nothing else in the route. Test: new commons/test/door-llms-recovery.mjs (boot copied from door-rejoin-help.mjs): GET /llms.txt is 200, does not contain "always return", does contain "single-use" (or the exact word your patch uses) and `/room/general`. door-*.mjs and agent-connect*.mjs must still pass. server.mjs is Tier 1: Setu reviews the exact SHA.

## DeepSeek (marketplaces): the Jobs board, tested as a site
The Jobs board (/jobs) has a unit test (jobs.mjs) but nothing boots it. New commons/test/jobs-pages.mjs (boot and member sign-in copied from market-activity-nav.mjs): signed out, /jobs and /jobs/people answer 200 and /jobs/new is 303 to `/signin?next=/jobs/new`; signed in, /jobs/new is 200; /jobs/j_nope is 404 and contains `href="/jobs"`; every internal link on /jobs and /jobs/people answers < 400. If a link is broken and the fix is one line in commons/lib/jobspage.mjs, fix it; otherwise list it in `KNOWN_BROKEN` at the top of the test. Tier 2 (don't touch server.mjs).

## GPT (pages and links): the signed-in crawl, as a test (still yours, round 8's job)
New commons/test/site-links-signed-in.mjs: boot and member sign-in copied from market-orders-page.mjs, crawl copied from site-links.mjs, with the member's cookie; seeds /social, /wallet, /orders, /label/mine, /label/sales, /studio and the member's own /m/<id>. Every internal link must answer < 400. One-line fixes in commons/lib/ or commons/public/ are allowed; anything else goes in a `KNOWN_BROKEN` list at the top with the page it was on, so the test passes and the list is the report. Tier 2. Do not edit site-links.mjs.

## Kimi (tokenomics status, priority 5; moved from Gemini): /cooperative says where tokens stand
commons/lib/coop.mjs, line ~75: right after the sentence ending `Read the formation packet</a>.</p>`, add exactly `<p class="small">Where tokens stand: Cohabi Coins are recognition credits today, not money, and they can't be bought or cashed out. A working model for purchase and service tokens is being drafted in the open in the <a href="/room/income">Product &amp; Income room</a>. Nothing about it is adopted.</p>`. Change nothing else. Test: new commons/test/cooperative-tokens.mjs, a copy of cooperative-structure.mjs asserting /cooperative is 200, contains "Where tokens stand" and `href="/room/income"`, and /room/income answers 200. cooperative-structure.mjs must still pass. Tier 2.

## Gemini (marketplaces, a new job; nothing of your own merged in a day): the Store page, tested
Write ONE file and nothing else: new commons/test/store-page.mjs, with the boot copied from commons/test/door-rejoin-help.mjs. Assert: GET /store is 200; GET /marketplace with `redirect: 'manual'` is 301 and its Location ends with `/label`; every `href="/..."` on /store (skip /api/ and asset files) answers < 400. If a link fails, put it in a `KNOWN_BROKEN` array at the top with the page it was on, so the test passes. Do NOT edit site-links.mjs, any other test, or anything in teams/income. Run `npm ci && node --test commons/test/store-page.mjs` before you finish. Tier 2.

## Still waiting on design: Aletheia-6 for the market front, a section page and a listing (asked 00:50Z, 12:30Z, 15:30Z, 21:20Z). When it lands, the next free builder builds it exactly.

## Round 10, next after round 9 (Geoffrey, 2026-11-19 afternoon): page themes and the page editor, readable everywhere
Geoffrey: business and artist pages need better customization; the editor's presets need cleaning up and should look much better; and with any preset theme, no text or button may be unreadable on its background. Design comes from Aletheia-6 (asked in the Review room); until her spec lands, the first job is the audit, which needs no design:
- **Claude (Tier 2): theme contrast audit and test.** For every theme in orgpages THEMES and the market section themes (`.mk-page[data-mk=…]` in commons/public/market.css), compute the contrast of --ink on --bg and --panel, --muted on --panel, --gold on --bg, and of button text on button backgrounds, using WCAG's relative-luminance formula. Write commons/test/theme-contrast.mjs: it parses market.css and fails any pair under 4.5:1 for body text, or 3:1 for large text and buttons. Fix the CSS variables that fail (a minimal change, keeping each theme's character). List every change in RESULTS.md.
- **Next, after Aletheia's spec:** rebuild the page editor dialog (marketpage.mjs pageEditor plus pages.js) to her design: a live preview, and themes shown as real swatches rather than a dropdown.

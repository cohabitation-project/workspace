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

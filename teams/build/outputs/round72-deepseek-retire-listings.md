# Round 72 DeepSeek — retire `POST /api/merch/listings`

**Status: written, measured with `node --check` + `node --test`; NOT run against a booted server. Tier 1 — waits for Setu's second yes.**

Job: remove only `commons/server.mjs:1896–1905`, reword the comment at 1891–1892 so it no longer promises a
listing route, replace the four POSTs in `commons/test/merch-printful.mjs` with one case asserting **404**.
Keep `/api/merch/products`, `/mockups`, `/mockups/:key` and the image routes.

## 1. Why (round 71b, re-checked here)
Round 71 measured the whole tree: `commons/public/` mentions **no** `/api/merch/*` endpoint at all, so the
mockup→publish write chain had no browser caller; only tests exercised it. `POST /api/merch/listings` was the
route that *wrote* — it created an art listing and linked it to a Printful product. With nothing able to reach
it, it was a write endpoint with no user, kept alive by one test. Tier 1, so it is retired only with Setu's yes.

## 2. What changed, file by file

**`commons/server.mjs`** — old lines 1891–1905 (comment + the handler) replaced by a five-line comment;
`app.get('/api/merch/products')`, `app.post('/api/merch/mockups')` and `app.get('/api/merch/mockups/:key')`
are byte-identical and still in place. 281 963 → **281 175 b**. The new comment says where publishing went
(`/api/market/listings`), why (round 71's measurement), and that `printful.takeTask`/`forgetTask` are now unused
and left for a later job — a reader who greps for them lands on the reason, not on a dead end.
sha256 `2be1d02f8a3ca1b7…`, `node --check` exit 0.

**`commons/test/merch-printful.mjs`** — the four POSTs (400 under base, 404 other member, 201 publish + five
fulfillment-link assertions, 404 "publishes once") replaced by one case:
- `POST /api/merch/listings` → **404** with the router's own `not found` body, so the assertion is the route's
  absence and not a handler refusing a price (a re-added route reddens this file).
- then `GET /api/market/listings` contains **no** listing titled `Sunflower tee` — the deleted handler cannot
  half-create a listing before falling through.
14 749 → **14 117 b**, `node --check` exit 0. Everything else in the file (product list, auth, mockup position,
`mockups/:key` ownership + pending→completed, the kept mockup picture) is untouched and still tested.

**`commons/test/merch-listings-no-client-caller.mjs`** (round 71b's guard; **the job did not name it, and leaving
it would have reddened CI on this change**) — two edits:
- test 3's allowed-mention set: `commons/server.mjs` **removed** (the route is gone there), so the only files that
  may mention the route in code are its boot test and the no-dead-merch guard.
- test 4 inverted: it used to assert the handler *exists* and still carries `(amount >= t.base)` and
  `market.withdraw(me, l.id)`. It now asserts the handler is **gone**, that the three routes beside it are **not**
  gone, and that `commons/server.mjs` names `/api/merch/listings` nowhere — *including a comment*, because a comment
  that promises an absent route is exactly how round 70's wrong premise spread for a round.
5 916 → **6 377 b**, `node --check` exit 0.

## 3. Coverage this change gives up (said plainly)
The price floor (`amount >= t.base`, the "at least $12.95" refusal) and the withdraw-on-failed-link path were
tested **only** through this route. They die with the code. `fulfillment.link` itself still has callers elsewhere
(not re-measured this session). Nothing in the tree now creates a Printful-linked listing, which is the intended
state: payments are closed, and the maker panel's own path is `PUT /api/market/listings/:id/merch`.

## 4. Measured this session
| check | result |
|---|---|
| `node --check` on all three files | exit 0, 0, 0 |
| `node --test merch-listings-no-client-caller.mjs market-no-dead-merch.mjs` | **7 tests, 7 pass, 0 fail** |
| M1 re-add `app.post('/api/merch/listings')` | **red**, 2 failures: test 3 "mentions /api/merch/listings" + test 4 "still registers POST /api/merch/listings" |
| M2 delete the kept `app.get('/api/merch/mockups/:key')` | **red**, test 4: "retiring the listing route also removed app.get('/api/merch/mockups/:key'" |
| M3 `fetch('/api/merch/listings')` back into `commons/public/market.js` | **red**, 3 failures incl. "commons/public must not call /api/merch/* (found 1)" |
| M4 control: comment naming the route in `commons/lib/marketpage.mjs` | **green 7/7** — comments are not calls |
| M5 control: comment naming the route in `commons/public/market.js` | **red, but only at `market-no-dead-merch.mjs:82`**; all four of my tests passed |

**Not measured:** `merch-printful.mjs` was **not run** — this runner has no `node_modules` and the file boots
`commons/server.mjs` (it needs express and the site's deps). No browser, no staging, no production, no deploy.
Whether production logs ever show a hit on the old route is unmeasured; the claim is "no caller in the tree".

## 5. Follow-up I measured but did not fix (one line, for a foreman)
`commons/test/market-no-dead-merch.mjs:82` asserts `!src.includes('/api/merch/listings')` on **raw** source, so a
*comment* in `market.js` saying "we used to post here" reddens CI (mutant M5's only failure). That is the same
false positive round 71b fixed in its sibling guard by stripping comment lines. Worth one commit: strip comments
before that check. I left it alone because it is outside this job's named scope.

## 6. For Setu
One unit, three files, one commit or one PR: `commons/server.mjs` (`2be1d02f8a3ca1b7…`),
`commons/test/merch-printful.mjs` (`2f78c4d570ea415d…`), `commons/test/merch-listings-no-client-caller.mjs`
(`311f3cb3e6bc8778…`). Two of the three had to move together: retiring the route without inverting the round-71b
guard leaves a red test in CI, and a red test blocks every deploy. After this, `printful.takeTask` /
`printful.forgetTask` (`commons/lib/printful.mjs:210`, `:215`) have no caller — the parked later job.

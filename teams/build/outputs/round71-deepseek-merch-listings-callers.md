# Round 71 — DeepSeek: who still calls `/api/merch/listings`?

Job: `teams/build/JOBS.md`, round 71, "DeepSeek (marketplace, file-only)". Question to answer YES or NO:
*after round 70, no page or script posts to this route.*

**Answer: YES.** After round 70 (and round 71's removal of the now-unreachable `merch` branch, `market.js`
13223 → 12970 b), nothing that a browser runs posts to `POST /api/merch/listings`. The only callers left in the
tree are `commons/test/merch-printful.mjs` (boot test) and my own guard `commons/test/market-no-dead-merch.mjs`
(which asserts the absence). No `commons/public/` file mentions any `/api/merch/*` endpoint at all — measured, not
inferred (see §2).

**Measurement method, stated plainly.** I grepped first and wrote this file second, because a report written
before the grep would have been empty. Every hit below is from one `os.walk` of the checkout at this session's
base, skipping `node_modules` and `.git`, matching `/api/merch/listings|merch/listings`. Nothing here is a browser
or a server observation, and this runner cannot boot `commons/server.mjs` (no `node_modules`).

## 1. Every hit under `commons/`, `scripts/`, `src/` — 8 total

| file:line | what it is |
|---|---|
| `commons/server.mjs:1896` | the route itself: `app.post('/api/merch/listings', wrap((req, res) => {` |
| `commons/test/market-no-dead-merch.mjs:16` | comment: says the composer's POST here could never run |
| `commons/test/market-no-dead-merch.mjs:78` | same comment, second half |
| `commons/test/market-no-dead-merch.mjs:82` | assertion: `!src.includes('/api/merch/listings')` on `commons/public/market.js` |
| `commons/test/merch-printful.mjs:76` | `call('/api/merch/listings','POST', …)` — price below base, expects 400 |
| `commons/test/merch-printful.mjs:78` | same route, another member's mockup, expects 404 |
| `commons/test/merch-printful.mjs:79` | same route, the happy publish, 201 |
| `commons/test/merch-printful.mjs:86` | same route again, expects 404 on a second publish |

`scripts/` and `src/`: **zero hits** (`src/` does not exist in this checkout).

## 2. Every hit under `teams/` — all of them artefacts, none live

- `teams/build/outputs/2026-11-22T09-20-17/`, `…/2026-11-22T09-20-50/review291/`, `…/2026-11-22T12-12-19/`:
  saved copies of `commons/test/merch-printful.mjs` from earlier reviews. Not run by CI.
- `teams/build/outputs/2026-11-26T09-59-32/market-before.js:59` and `…09-59-39/market-before.js:59`: snapshots of
  the *pre-edit* `market.js` that still carried the dead branch. That line is the branch round 71 deleted.
- `teams/build/outputs/round70-deepseek-dead-merch.md`, `round71-deepseek-merch-branch.md`,
  `review-291-9970a4f3.md`: my own reports and review notes, plus 14 hits in session `.jsonl` logs and
  `teams/build/STANDUP.md` (transcripts, not code).

No `.js`, `.mjs` or `.html` under `teams/` that is served or run calls the route.

## 3. The client surface is empty of `/api/merch/*` — the sharper finding

Grepping `commons/public/` and `commons/lib/` for `/api/merch` (not just `listings`) gives **zero hits in
`commons/public/`** and only image URLs in `commons/lib/merchsets.mjs`:

- `commons/lib/merchsets.mjs:90` `/api/merch/art/…`, `:129` `/api/merch/template/…`, `:132`
  `/api/merch/product-image/…` — strings that end up in `<img src>`, served by `server.mjs:1911`, `:1915`, `:1919`.
  Those three are live and used by the page. The rest are not.

So the whole write chain that the route belongs to has no browser caller left:

1. `POST /api/merch/mockups` — `commons/server.mjs:1894`
2. `GET /api/merch/mockups/:key` — `commons/server.mjs:1895`
3. `POST /api/merch/listings` — `commons/server.mjs:1896`

and, from round 71's own correction, `GET /api/merch/products` — `commons/server.mjs:1893` — has no non-test
caller either (the maker panel reads `/api/market/listings/:id/merch/panel`, `merch-panel-aletheia.js:63`).

## 4. The route, sliced (`commons/server.mjs`, 1891–1905, read by line number)

```
1891: // Print on demand (Ash's spec, 2026-11-21): products, a real Printful mockup of the maker's art, then a listing linked to
1892: // that product, priced at or above Printful's base cost. Orders reach Printful only once payments open.
1893: app.get('/api/merch/products', …
1894: app.post('/api/merch/mockups', …
1895: app.get('/api/merch/mockups/:key', …
1896: app.post('/api/merch/listings', wrap((req, res) => {
1897:   const me = marketWriter(req); core.socialActsAllowed(me);
1898:   const b = req.body || {}; const t = printful.takeTask(me, b.mockup);
1899:   const amount = Number(b.price?.amount ?? b.price_amount);
1900:   if (!(amount >= t.base)) throw new core.CommonsError(400, `Set a price of at least $…, the print partner's base cost…`);
1901:   const l = market.create(me, { …b, category: 'art', type: 'product', price: { mode: 'fixed', amount }, images: [t.image, t.art], mockup: undefined });
1902:   try { fulfillment.link(me, l.id, { provider: 'printful', product_id: …, variant_ids: […], design: {…} }); }
1903:   catch (e) { try { market.withdraw(me, l.id); } catch { } throw e; }
1904:   printful.forgetTask(b.mockup); res.status(201); return { …l, merch: {…} };
1905: }));
```

The handler is honest and well built (it refuses a price under base, and withdraws the listing if the printer link
fails). It is not a bug. It is a door with no handle on the outside.

## 5. Exact lines a later Tier 1 change would remove, and what else that touches

**If the decision is "retire the composer-side merch publish":**

- Remove `commons/server.mjs:1896–1905` (the `POST /api/merch/listings` handler).
- Reword `commons/server.mjs:1891–1892`; the comment promises a listing flow that would no longer exist there.
- `printful.takeTask` (`commons/lib/printful.mjs:210`) becomes unused: its only non-test caller is `server.mjs:1898`.
- If the mockup pair goes with it (`1894`, `1895`), then `printful.forgetTask` (`printful.mjs:215`, caller
  `server.mjs:1904`) and the HTTP half of `startMockup`/`mockupResult` (`printful.mjs:174`, `:195`) become
  unreachable from the server too. Their only remaining callers are `commons/test/merch-printful.mjs:127,150,157`.
- **Survives, do not touch:** `fulfillment.link` (`server.mjs:1902` is one of many callers; `:1952` and ~15 tests
  use it), `market.create`, `market.withdraw`, and the three image routes at `1911/1915/1919`.

**If the decision is "keep the route as a public API":** nothing to change here. Say so, and this report is the
evidence that it is unexercised in the product.

## 6. The test that pins it

Written this session, **no boot needed**, placeable today without reddening CI:
**`commons/test/merch-listings-no-client-caller.mjs`** — asserts (a) no file under `commons/public/` or
`commons/lib/` calls `/api/merch/listings` or `/api/merch/products`, (b) every file under `commons/` that mentions
`/api/merch/listings` is one of exactly three: `server.mjs`, `test/merch-printful.mjs`,
`test/market-no-dead-merch.mjs`, and (c) the route handler still spans 1896–1905 with its 400-on-price-under-base
check and its withdraw on link failure. Any new client caller, or any later removal, reddens it on purpose at its
own assertion.

For the *removal* PR itself, the pinning test has to boot: `POST /api/merch/listings` must answer 404, and
`commons/test/merch-printful.mjs` (which calls it four times) must be retired or rewritten in the same PR. That is
Tier 1 and Setu's call, so I have not touched `commons/server.mjs`.

## Limits, stated

- Measured: the grep inventory (§1–§3), the line numbers, the byte sizes. Not measured: anything in a browser.
- Not run: `merch-printful.mjs`, `market-no-dead-merch.mjs`'s siblings, any server boot. This runner has no
  `node_modules`.
- Not checked: whether production traffic has ever hit `POST /api/merch/listings` (that needs the server's logs,
  which I do not have). "No caller in the tree" is the claim; "never called in production" is not.

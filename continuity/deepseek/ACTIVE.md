# DeepSeek — active checkpoint

_Last written: 2026-11-27 (round 71). Read this first, then `context/NOW.md`, then `teams/build/JOBS.md`._

## Where I stand
One line of work: our side of the paid → ship path and the print-on-demand surfaces, proved by checks that can go red.

- **48–57** ship-to-end-to-end, maker address, `physical` flag, `printableArt()`, `salesPage` "Sent to Printful",
  every printer named, printer state on `/label/sales` (merged fb22f51f).
- **58–62** resend guard in `merch-checkout.mjs`; buyer page never repeats the printer's error (5 mutants).
- **64** the "Send it again" button works (delegated `[data-printer-send]` handler).
- **67 (merged)** `curated()` loud; guard test 8 cases, 9/9.
- **68** cold read says "try again"; partial read served, never cached. `commons/test/merch-printful-retry.mjs` 12/12.
- **69** `commons/test/merch-products-http-cold.mjs`: cold → 502 + "Try again in a minute"; healthy → 200, 8 products.
- **70** deleted the dead `#mk-merch` block from `commons/public/market.js` (17056 → 13223 b) + `market-no-dead-merch.mjs`.
- **71a** removed the now-unreachable `merch` branch: `market.js` 13223 → **12970 b**, sha256 `69397f42…`;
  test extended, 3/3, 3 mutants killed.
- **71b (THIS SESSION)** answered the caller question for `POST /api/merch/listings`.
  Report: `teams/build/outputs/round71-deepseek-merch-listings-callers.md`.
  New guard: `commons/test/merch-listings-no-client-caller.mjs` (**5916 b**, sha256
  `3faef5ad00ba244e99031de9f0c1a216fc9d9cd420d0f81d07a4ca768936d665`).

## What round 71b measured (this runner, `node --test`, no boot needed)
- **Grep of the whole tree** (`commons/`, `scripts/`, `src/`, `teams/`; `node_modules`/`.git` skipped):
  `/api/merch/listings` appears at exactly 8 places under `commons/` — the route (`server.mjs:1896`), three lines in
  `market-no-dead-merch.mjs`, four POSTs in `merch-printful.mjs`. `scripts/` and `src/`: zero. Under `teams/`: only
  saved artefacts, pre-edit snapshots (`…/market-before.js:59`) and session logs.
- **Sharper finding:** `commons/public/` contains **zero** occurrences of `/api/merch` of any kind. The only
  `/api/merch/*` strings in `commons/lib/` are three image URLs (`art`, `template`, `product-image`) that go into
  `<img src>`. So the whole write chain `POST /api/merch/mockups` (1894) → `GET :key` (1895) →
  `POST /api/merch/listings` (1896–1905) has **no browser caller**; with `GET /api/merch/products` (1893) that is
  four routes exercised only by tests.
- **Answer: YES** — after round 70 nothing a browser runs posts to the route.
- **Test: 4/4 pass** baseline. Five mutants in `shutil.copytree` copies: real client call added to `market.js` →
  killed at 2 assertions; new test file mentioning the route → killed; `(amount >= t.base)` → `>` → killed at the
  price assertion; `market.withdraw(me, l.id)` → `void 0` → killed at the withdraw assertion; **comment-only** line
  in `market.js` → stays green (the control: comments are stripped, a sentence is not a call). The control caught my
  own first version, which failed on a comment; fixed and re-measured.

## Decision needed (Tier 1, Setu's)
`GET /api/merch/products` (1893), `POST /api/merch/mockups` (1894), `GET :key` (1895) and
`POST /api/merch/listings` (1896–1905) have no non-test caller. Keep them as a public API, or retire them together
with `commons/test/merch-printful.mjs`? If retiring: delete 1896–1905, reword the comment at 1891–1892, and
`printful.takeTask` (`printful.mjs:210`) and `printful.forgetTask` (`:215`) become unused; `fulfillment.link`
and the three image routes **stay** (many callers). The removal PR needs a boot test asserting 404; the guard I wrote
today is file-only and placeable *now* without reddening CI.

## Runner facts (verified, not guessed)
1. `$OUT` is a new path per `run_python` call — save what you need in that same call.
2. `$REPO` is a fresh copy per call with **no `.git`** and no `node_modules`: mutate in
   `shutil.copytree($REPO,'/tmp/x', ignore=('node_modules','.git','teams'))`, run there, delete — several mutants in
   one call, repo untouched. Repo edits go through `edit_file`/`write_file`.
3. `node --test` works here **for tests that read files**. Anything booting `commons/server.mjs` does not.
4. Node prints `ℹ pass N` / `ℹ fail N`; a regex for `^# pass` matches nothing and looks like a pass. Read the lines.
5. **A substring assertion is not an assertion** — pin the exact token the code queries.
6. **A comment is not a call, and a comment is not evidence either.** Strip comment lines before matching, and grep
   the code a sentence describes before building on the sentence (round 70's `/api/merch/products` premise was wrong).

## Open / next
1. **@Setu:** place `commons/test/merch-listings-no-client-caller.mjs` (`3faef5ad…`) — file-only, 4/4 here.
2. The route decision above. `POST /api/merch/listings` stays until Setu says otherwise; I did not touch `server.mjs`.
3. `commons/test/merch-products-http-cold.mjs:6` — its comment still claims the test reads the route "exactly as
   `commons/public/market.js` does"; that is false now. Not edited.
4. The maker panel's cold read has no Try again button (`merch-panel-aletheia.js:64`) — Aletheia-6's design ask.
5. Printful catalogue ids: throw blanket, summer blanket, tapestry (needs Ash's store dashboard).
6. Not checked, and outside my reach: whether production logs ever show a hit on `POST /api/merch/listings`.
   "No caller in the tree" is measured; "never called in production" is not claimed.

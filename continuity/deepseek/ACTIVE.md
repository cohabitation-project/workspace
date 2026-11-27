# DeepSeek — active checkpoint

_Last written: 2026-11-27 (round 72). Read this first, then `context/NOW.md`, then `teams/build/JOBS.md`._

## Where I stand
One line of work: our side of the paid → ship path and the print-on-demand surfaces, proved by checks that can go red.

- **48–57** ship-to-end-to-end, maker address, `physical` flag, `printableArt()`, `salesPage` "Sent to Printful",
  every printer named, printer state on `/label/sales` (merged fb22f51f).
- **58–62** resend guard in `merch-checkout.mjs`; buyer page never repeats the printer's error (5 mutants).
- **64** the "Send it again" button works (delegated `[data-printer-send]` handler).
- **67 (merged)** `curated()` loud; guard test 8 cases, 9/9.
- **68** cold read says "try again"; partial read served, never cached. `commons/test/merch-printful-retry.mjs` 12/12.
- **69** `commons/test/merch-products-http-cold.mjs`: cold → 502 + "Try again in a minute"; healthy → 200, 8 products.
- **70** deleted the dead `#mk-merch` block from `commons/public/market.js`.
- **71a** removed the unreachable `merch` branch; `market.js` → 12970 b, sha256 `69397f42…`.
- **71b (lane-merged 8e2a0d8a)** answered the caller question for `POST /api/merch/listings`: **no** file a browser
  runs posts to it; the whole `mockups → publish` chain was test-only. New guard
  `commons/test/merch-listings-no-client-caller.mjs`. Report `teams/build/outputs/round71-deepseek-merch-listings-callers.md`.

## Round 72 — done, waiting on Setu (Tier 1)
Retired `POST /api/merch/listings` (`commons/server.mjs:1896–1905`), reworded the comment above it, replaced the four
POSTs in `commons/test/merch-printful.mjs` with one **404** case, and inverted the round-71b guard so it asserts
absence instead of presence.

Files (all three must travel together):
- `commons/server.mjs` — 281 175 b, sha256 `2be1d02f8a3ca1b7…` (`node --check` 0)
- `commons/test/merch-printful.mjs` — 14 117 b, sha256 `2f78c4d570ea415d…` (`node --check` 0)
- `commons/test/merch-listings-no-client-caller.mjs` — 6 377 b, sha256 `311f3cb3e6bc8778…` (`node --check` 0)

Measured here: `node --test` on the two file-only tests → **7/7 pass**. Mutants: re-add the handler → red (2 assertions);
delete the kept `mockups/:key` route → red; client `fetch` back into `market.js` → red (3); comment in `commons/lib`
→ **green** (control). Report: `teams/build/outputs/round72-deepseek-retire-listings.md`.

**Why two files beyond the job:** retiring the route reddens test 4 of my own round-71b guard, which asserted the
handler still exists. Ship the route removal without that edit and CI is red, which blocks deploys.

## Open and named (not mine to fix silently)
1. **`commons/test/market-no-dead-merch.mjs:82`** matches `/api/merch/listings` in **raw** source, so a *comment* in
   `market.js` reddens it (measured, mutant M5). One-line fix: strip comment lines, as 71b's sibling guard does.
2. **`printful.takeTask` / `forgetTask`** (`commons/lib/printful.mjs:210`, `:215`) now have no caller. Parked job.
3. Stale comment at `commons/test/merch-products-http-cold.mjs:6`.
4. The maker panel's missing "Try again" on a cold read (Aletheia-6's file).
5. Printful catalogue ids for blankets/tapestry (needs Ash's dashboard).
6. **Coverage given up in round 72:** the price floor (`amount >= t.base`) and withdraw-on-failed-link were tested
   only through the retired route. If that rule comes back, it needs a new test at its new home.

## Runner facts (verified, not guessed)
1. `$OUT` is a new path per `run_python` call — save what you need in that same call.
2. `$REPO` is a fresh copy per call with **no `.git`** and no `node_modules`: mutate in
   `shutil.copytree($REPO,'/tmp/mN', ignore=shutil.ignore_patterns('node_modules','.git'))` — a **tuple** there
   raises `TypeError: 'tuple' object is not callable`.
3. The server will not boot here; file-only tests run fine. `node --check` first, always.
4. `commons/server.mjs` catch-all at 2720–2722 answers unknown `/api/*` with **404 JSON** `{error:'not found'}` —
   so "assert the retired route 404s" is a real assertion, not a proxy.
5. Never read `commons/server.mjs` whole: slice by line.

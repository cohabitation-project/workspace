# Round 43 — Kimi: maker page with no listings

Status: implementation and assigned local verification complete (2026-11-23). Tier 2; normal build-lane CI/merge still owns the next step.

## Decision from the existing code

This is **(b), a discoverability bug in the Arts & Crafts maker section**, not a case where an existing all-maker directory could solve it with one link.

- `marketPage()` sends `/label?cat=art` to `artPage()`. Its `makerCards` were derived only from the listings in `items`, so an artist page with no listing could not appear under **Meet the makers**.
- `studiosStrip()` is a different section and deliberately counts only live listings in the current category; it returns no row at all without one. It is not a directory for undiscovered artist pages.
- The server has individual public `/page/:slug` pages and a JSON `/api/pages` index, but no HTML directory of all public maker pages to link as option (a)'s fallback.

## Changed

Implementation: **`commons/lib/marketpage.mjs` only**.

`artPage()` now appends public `artist` pages that are not already represented in the listed-maker cards and for which `market.list({ page })` is empty. Each gets an honest **No work listed yet** label and a direct `orgpages.href(p)` link. The card uses the page portrait when present, otherwise its initial. Existing listing-derived cards and their six-card limit are unchanged; empty artist pages are appended so the existing limit cannot hide them.

Regression: **`commons/test/market-maker-no-listings.mjs`** (new). A booted local server creates an artist page and no listings, then a guest requests `/label?cat=art`. The test requires a direct `/page/empty-atlas-studio` link in an `av-maker` card, the page name and **No work listed yet**, then follows the link and checks the public page answers 200 with its own honest empty-shop text.

## Measured

Fresh codeload main **`50e3bfbc2597e332accd0532e33275bba998900d`**, `npm ci` successful. Only the two files above were overlaid for the patched run.

```text
Baseline: fresh main marketpage.mjs + new test only
node --test commons/test/market-maker-no-listings.mjs
  tests 1, pass 0, fail 1; exit 1
  failure: no Meet the makers link to /page/empty-atlas-studio

Patched syntax
node --check commons/lib/marketpage.mjs  -> exit 0
node --check commons/test/market-maker-no-listings.mjs -> exit 0

Patched assigned suite
node --test commons/test/market-maker-no-listings.mjs commons/test/market-departments.mjs commons/test/page-logo-follows.mjs
  tests 3, pass 3, fail 0, cancelled 0, skipped 0, todo 0
  duration_ms 1169.932608; exit 0
```

Evidence: `teams/build/outputs/2026-11-23T18-22-03/{baseline-red.log,assigned-suite.log,syntax-page.log,syntax-test.log,npm-ci.log,implementation.diff,result.json}`.

Limits: local Node booted-server checks only. No full repository suite, visual/browser check, CI, merge, staging or production claim. No other department's maker-selection behavior was changed.

## Prior lane result checked

Round 42 Kimi `ship_to` is recorded MERGED as `37f0faab` with Setu's Tier 1 yes; the foreman records its new test 3/3 red before and 6/6 after, and checkout+fulfillment tests 54 pass / 0 fail / 6 todo. It was not reopened.

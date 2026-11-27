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
- **70** deleted the dead `#mk-merch` block from `commons/public/market.js` (17056 → 13223 b, sha `935e0b24…`) and
  added `commons/test/market-no-dead-merch.mjs` (3/3; 3 mutants killed).
- **71 (THIS SESSION)** removed the now-unreachable `merch` branch from the same submit handler:
  `market.js` 13223 → **12970 b**, sha256 `69397f42f07e9e59…`; test extended to 5843 b (`bc84ee4820f884bd…`),
  **3/3 pass**, 3 mutants killed at their own assertions. Report: `teams/build/outputs/round71-deepseek-merch-branch.md`.

## Facts this session corrected (do not repeat the old version)
1. **The maker panel does NOT call `GET /api/merch/products`.** It reads `GET /api/market/listings/:id/merch/panel`
   (`merch-panel-aletheia.js:63`). Round 70's report, its test comment and `JOBS.md` all say the opposite. After round
   70, `GET /api/merch/products` (`server.mjs:1891`) has **no non-test caller** in the tree.
2. `merch` in `market.js` was `!id && form.dataset.mockup && $('#mf-on')?.checked`; `data-mockup` and `mf-on` had
   **0 hits** outside the code that read them, so the branch could never run. Removed.

## Runner facts (verified, not guessed)
1. `$OUT` is a new path per `run_python` call — copy the sharp hook/stub into the same call that runs it.
2. `$REPO` is a fresh copy per call with **no `.git`**: mutate in `shutil.copytree($REPO, '/tmp/x', ignore=('node_modules','.git'))`
   copies, run there, delete — several mutants in one call, repo untouched. Repo edits go through `edit_file`/`write_file`.
3. `node --test` works here **for tests that read files**. Anything that boots `commons/server.mjs` does not
   (`express`/`ws`/`dotenv` absent; `npm install` EACCES). Write it, `node --check` it, say "unrun here, needs boot".
4. Node's test output here uses `ℹ pass N` / `ℹ fail N` — a regex for `^# pass` matches nothing and looks like a pass.
   Read the actual lines.
5. **A substring assertion is not an assertion** (round 70's M2 passed on `data-printer-send-removed`). Pin the exact
   token the code queries. A mutant that survives is a bug in the test first.
6. Print failing block lines whole; do not slice stdout.

## Open / next
1. **@Setu / foreman:** place `commons/public/market.js` (`69397f42…`) with `commons/test/market-no-dead-merch.mjs`
   (`bc84ee48…`) as one unit; expect 3/3, no boot needed.
2. **Decision needed:** `GET /api/merch/products` now has no non-test caller — keep as a public route or retire it with
   its tests? Tier 1, Setu's call. `POST /api/merch/listings` stays; only the composer's client branch is gone.
3. `commons/test/merch-products-http-cold.mjs:6` — comment still says the test reads the route "exactly as
   `commons/public/market.js` does"; that is now false. Test valid, sentence stale. Not edited (out of calls).
4. The maker panel's cold read has no Try again button (`merch-panel-aletheia.js:64`) — Aletheia-6's design ask.
5. Printful catalogue ids: throw blanket, summer blanket, tapestry (needs Ash's store dashboard).
6. The multi-placement AOP path (per-placement areas in the product record).
7. Keep this file short — reading it is the cheapest saving we have.

# DeepSeek — active checkpoint

_Last written: 2026-11-26 (round 68, second session). Read this first, then `context/NOW.md`, then `teams/build/JOBS.md`._

## Where I stand
One line of work: our side of the paid → ship path, and the print-on-demand guard, proven by checks that can go red.

- **48–57** ship-to-end-to-end, maker address, `physical` flag, `printableArt()`, `salesPage` "Sent to Printful",
  every printer named, printer state on `/label/sales` (merged fb22f51f).
- **58–62** resend guard in `merch-checkout.mjs`; buyer page never repeats the printer's error (5 mutants).
- **64** the "Send it again" button works (delegated `[data-printer-send]` handler).
- **67 (merged)** `curated()` loud; guard test 8 cases, 9/9.
- **68 (CLOSED this session, green on main's code):** the cold read says "try again"; the partial read is served and
  never cached.
  - `commons/lib/printful.mjs` **unchanged by me** — main's 23243 b / sha256 `7a65057153510850…a86294` is Setu's merge
    (partial served inside `RETRY_MS`, never cached).
  - `commons/test/merch-printful-retry.mjs` **rewritten, 7638 b / sha256 `1862c250f314e30b…fe32a2`** (was 5429 b /
    `f07c92f9…`), 3 tests. Pins: cold passing problem → 502 + "try again"; nothing cached on a refusal; complete empty
    read → `[]`; a good list survives a hiccup; **new: a partial read is served inside the window with no second
    request and never becomes the cache**. The stand-in now knows three ids, so two old assertions read
    `['tee','mug','cap']` instead of `['tee']` — say that to Setu, it is a placed test.
  - `commons/test/printful-curated-guard.mjs` unchanged (11620 b / `36c3f4b9…`).
  - **Measured:** `node --test` both files, `sharp` stubbed by a module hook → **12 pass / 0 fail**. Mutant M1
    (delete `if (partial.length) return partial;`) → **9 pass / 3 fail**, red on exactly my new partial test and guard
    case 2, restored `True`. Report `teams/build/outputs/round68-deepseek-cold-read.md`.
  - **Still unrun:** `market.js`'s Try again button in a browser (GPT's job, needs Chromium).

## Runner facts (verified, not guessed)
1. **`$OUT` is a new path on every `run_python` call** — copy the sharp hook/stub into the same call that runs it.
   Working pair kept at `teams/build/outputs/2026-11-26T20-12-21/` (and copied to `…T22-12-15/` this session).
2. **`$REPO` is a fresh copy per call with NO `.git`** — mutants must be applied, run and restored inside one call
   (this round: `restored: True`). Repo edits go through `edit_file`/`write_file`; those DO show up in later `$REPO`
   copies.
3. `node --test` works here with `NODE_OPTIONS=--import <repo>/hook.mjs` after copying `hook.mjs` +
   `sharp-stub.mjs` into `$REPO` — that is the exact invocation that gave 12/12.
4. `assert.rejects` resolves to `undefined` — use the `refusal()` helper.
5. `merch-printful.mjs` is red in this sandbox for stub reasons; red here says nothing about main. Say "unrun here".
6. Print failing block lines whole; do not slice stdout.

## Open / next
1. **@Setu:** the retry test is a rewrite of a placed file — place `commons/test/merch-printful-retry.mjs`
   (`1862c250…`) as one unit and run it with `printful-curated-guard.mjs` on main (12/12 expected). One browser look at
   **Try again** is GPT's job.
2. Printful catalogue ids: throw blanket, summer blanket, tapestry (needs Ash's store dashboard).
3. The multi-placement AOP path (per-placement areas in the product record).
4. Waiting on Setu, not mine: `commons/test/market-orders-no-printer-error.mjs` (round 59); parked resend-click test.

# DeepSeek — active checkpoint

_Last written: 2026-11-24 (round 46, build session). One page. Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Round 46 job = my own ship_to fix list, "branch from 72fbfe6f, code first". **No code shipped: the session's tools
edit a MAIN checkout, so 72fbfe6f's text cannot be touched.** Measured this session, not assumed:

- `read_file commons/lib/fulfillment.mjs` = **12,249 chars, main**: no `recipientFor`, no `hasAddress`, no `addressOf`;
  `plan()` posts `recipient/address_to/shipping_address: order.ship_to` unchanged.
- Same path at 72fbfe6f = **15,008 chars** with all three (codeload zip).
- Two `edit_file` calls with old_text copied verbatim from 72fbfe6f → **"old_text was not found"** both times
  (one in `send()`, one in `recipientFor`). So round 44/45's branch code is unmerged and unreachable from here.

**Round 45's "it was the tool-call budget" was wrong.** The budget mattered, but the base checkout is the real wall.

## The deliverable that exists now (don't rewrite it)
`teams/build/outputs/round46-deepseek-blocked-and-patch.md` — the whole patch for main, ready to apply:
helper block (`txt`, `addressOf`, `hasAddress`, `recipientFor` returning **`undefined`**), the three `plan()` call sites,
the `send()` check after `plan()`, and **every fixture that must move with it**: plan-providers `:44` (Stripe shape) +
assertions `:78`/`:98` (provider shape; case 7 at `:126` unchanged), send-refusals `:54`, send-refused-provider `:67`,
and market-order-ship-to `:101` (asserts pass-through; needs `npm ci` for `sharp`). Board request filed to the assistant
seat: either check out the job's base sha for kin sessions, or apply that patch.

## Banked runner facts (unchanged, still true)
1. codeload works from `run_python`: `curl -sSL codeload.github.com/cohabitation-project/workspace/zip/<sha>`, unzip,
   write `{"type":"module"}`, run. `commons/` alone suffices for fulfillment tests; `sharp` only for `merchsets.mjs` imports.
2. `node --test` default reporter is spec (✔/✖); use `--test-reporter=tap` or grep nothing.
3. `read_file` shows **main**. To read unmerged work: `raw.githubusercontent.com/.../<sha>/<path>` or the codeload zip.
4. **New:** `edit_file`'s base is main too — a branch-only string never matches. Check this FIRST next round: one
   `read_file` of the file the job names, grep for the branch's own symbols. If they are absent, write the patch/handoff
   and do not spend calls on edits that cannot land.
5. Budget: one combined measurement run, then code, then re-run. Write the result file in the first three calls.

## Open / next
1. If unblocked (assistant/foreman action in the board request), apply `round46-deepseek-blocked-and-patch.md` and run
   `node --test commons/test/fulfillment-*.mjs commons/test/market-order-ship-to.mjs` after `npm ci`; target 0 fail.
   Snapshot the main-based totals before the change (main = 38 pass / 0 fail / 6 todo, 44 tests) so the diff is measured.
2. Still owed to others: `fulfillment-send-refused-provider.mjs` is **not** in `.github/workflows/commons-tests.yml`
   (foreman/Setu only); the 6 todos need a decision on buyer email + cover/interior image URLs (Ash/Setu); #291 defect 2/3
   waits on Geoffrey; `order.ship_to` still has no producer at `checkout.mjs:162`.

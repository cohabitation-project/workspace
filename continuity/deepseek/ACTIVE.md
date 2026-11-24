# DeepSeek — active checkpoint

_Last written: 2026-11-24 (round 51, build session). One page. Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Rounds 48–51 are one line of work: our side of the paid → ship path, proven by tests, no library edit.

- **Round 48:** `commons/test/market-ship-to-end-to-end.mjs` — paid Stripe → `ship_to` → Printful and Printify.
- **Round 49:** same file + **Lulu**, the only pipe with a fetch before the order call.
- **Round 50:** `commons/test/market-maker-ships-address.mjs` — a maker-shipped product collected no address
  (`checkout.mjs:171` asked only when a printer link existed).
- **Round 51 (this session):** the `physical` flag, measured. Result: `teams/build/outputs/round51-deepseek-physical-flag.md`.
  - `market.mjs`: optional `physical` (true/false/absent→null), 400 by name on a non-boolean.
  - `checkout.mjs:171`: address asked when `plan(ord).provider || (type === 'product' && physical !== false)`.
  - Measured: maker file **8/8**; mutant A (condition half dropped) **6/8**; mutant B (`physical` never stored)
    **6/8**; five files together **25 tests, 23 pass, 2 fail** — both reds are `Cannot find package 'sharp'`
    and fail identically on a control copy with my checkout change reverted. Environment, not regression.

## Banked runner facts (still true)
1. **Copy the repo twice to tell "my change" from "the sandbox".** One control copy with the edit reverted answers
   "did I break it?" in a single run. Cheaper than reasoning about import graphs.
2. `sharp` is absent in the sandbox: `market-order-ship-to.mjs` and `market-paid-journey.mjs` both die
   `ERR_MODULE_NOT_FOUND` via `merchsets.mjs`. Plan around it; never count those two as evidence.
3. `node:test` marks the **parent** `not ok` when a child fails — so 6/8 on a mutant is parent + one child, not two
   separate breaks. Don't count the parent as an extra finding.
4. A green first run means nothing until a mutant kills it. Mutate by exact `.replace()` on a substring and assert
   the substring was present (`changed True`), or you may be running an unmutated copy.
5. `has()` in `market.checkFields` is true for every field on create — check `b.x !== undefined` before validating an
   optional field there, or every listing without it throws.
6. Save/restore env, `fetch` and console in `finally`, or fake keys leak across test files in one process.
7. Budget: three runs fit in one `run_python` call when the test does not boot a server. Write the result file by
   call 8; the run, not the prose, is the deliverable.

## Open / next
1. **Tier 1 second yes** on the `physical` flag + checkout condition (money path).
2. **`physical: false` + printer link** is accepted and meaningless — the printer always ships. Form should hide the
   flag when a printer is linked, or validation should reject the pair. Design call (@Aletheia-6 / @Ash).
3. **The seller cannot see the address**: `marketpage.salesPage` (~:718) renders no address for any order, so a
   collected `ship_to` is invisible on `/label/sales`. Round 50's finding; unfixed.
4. **CI lines** for `market-ship-to-end-to-end.mjs`, `market-maker-ships-address.mjs` (Board 073) — otherwise these
   tests are silent on main after merge.
5. 6 todos in `fulfillment-plan-providers.mjs` wait on Ash/Setu: buyer email + cover/interior image URLs.
6. Live-printer acceptance is unproven for all three pipes — needs a nonproduction token, not available here.

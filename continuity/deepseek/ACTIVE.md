# DeepSeek — active checkpoint

_Last written: 2026-11-25 (round 59). Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Rounds 48–59 are one line of work: our side of the paid → ship path, proven by tests that can actually go red.

- **48–49:** `commons/test/market-ship-to-end-to-end.mjs` — paid Stripe → `ship_to` → Printful / Printify / Lulu.
- **50:** `market-maker-ships-address.mjs` — a maker-shipped product collected no address.
- **51:** the `physical` flag, measured (`teams/build/outputs/round51-deepseek-physical-flag.md`).
- **52:** `printableArt()` in `printful.mjs` — WebP/GIF art → PNG. **Merged.**
- **53–55:** `salesPage` said `Sent to Printful` for a printer order; pinned with a real `market.create` +
  `fulfillment.link` + paid order (`market-order-ship-to.mjs`).
- **56:** every printer gets its name — a `PRINTERS` loop in `market-sales-ship-to.mjs`.
- **57:** printer **state** on `/label/sales`, MERGED (fb22f51f, Setu's second yes on cbff562d):
  `printerShown(o)` in `checkout.mjs` + `data-printer-state="draft"|"failed"` in `salesPage`;
  test `market-sales-printer-state.mjs` 2/2, M-A/M-B both red.
- **58:** the in-flight guard's other half pinned in `merch-checkout.mjs` (a refused order can be sent again);
  green, red with `sending.delete` commented out, restored clean. Report `round58-deepseek-finally-pin.md`.
- **59 (THIS): buyer side pinned — `commons/test/market-orders-no-printer-error.mjs`, 2/2 green, 5 mutants measured.**
  Report `teams/build/outputs/round59-deepseek-buyer-no-printer.md`. Test-only → Tier 2, no second yes, no lib edit.

## Round 59's real finding (carry this forward)
**`printerShown` (checkout.mjs:65) is the only guard, and it guards the records, not the pages.**
- M-A (job's mutant: `printerShown` → `{...f}`) turns the *records* test red and leaves the **HTML green** —
  `marketpage.mjs` never renders `o.printer.error`.
- M-B (add a line to `salesPage` printing `o.printer.error`) is **green, i.e. vacuous**: the shown record no longer
  has the field. Two layers, one of them unreachable by a page edit.
- M-D / M-E (strip + print together) are the mutants that make the page assertions bite: red at
  "the printer's words are not on the buyer's page" and "…on the seller's either".
So: anyone editing `printerShown` is editing the buyer's protection; anyone editing the pages cannot leak the text today.

## Runner facts (current — verified, not guessed)
1. **`$REPO` is writable for existing files** (in-place mutation + restore works; only *new directories* hit EACCES).
   Mutate the real file, keep the original in a string, restore in a `finally`, re-run to prove green, then
   `git status --porcelain -- <paths>` to prove nothing leaked. Never trust `git diff --stat` in this snapshot.
2. **`$OUT` is a NEW path on every `run_python` call.** Write `fake-sharp.mjs` + `hook.mjs` in the same call that runs
   them, with an absolute `file://$OUT/...` URL in the hook.
3. **A bare `✖ <path> … 'test failed'` with 0 pass is the import hook failing, not the test.** `node --check` first.
4. Fake `sharp` that works: a `Proxy` whose `get` returns `metadata`/`toBuffer`/`toFile` as async functions,
   `then` as `undefined`, `clone` → itself, everything else `() => p`.
5. `fulfillment.init(D)` + `checkout.init(D)` are both needed server-free; `store.addMember` + `market.create` +
   `fulfillment.link` is how you get a printer-linked listing without the panel (round 59's `seed()`).
6. Node v24's reporter is not TAP — parse `✔`/`✖` and `ℹ pass|fail N`.
7. The sandbox cannot boot the Commons server (`src/llm.js` absent): server-free tests only, and say so.

## Open / next
1. **@Setu: boot and run `commons/test/market-orders-no-printer-error.mjs` on main** (it depends on nothing unmerged),
   then place it in CI.
2. **PR #301** (`setu/ship-to-fix`, resend of a `failed` order + the newer-Stripe address path) still needs Claude's
   measured yes at its exact head. Its files are hands-off for me.
3. Claude's `resendUnsent` is **merged** (dcf938c1) but **not wired to the server**; round 59/60 wires start-up resend
   + the steward Send button, which is what puts a button behind `/label/sales`'s "a steward can send it again".
4. Not claimed by me: no browser look at `/orders` or `/label/sales`, no booted run of any of my files (Setu's runs are
   the real check; my mutant evidence is in-process).

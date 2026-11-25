# DeepSeek — active checkpoint

_Last written: 2026-11-25 (round 58). Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Rounds 48–58 are one line of work: our side of the paid → ship path, proven by tests that can actually go red.

- **48–49:** `commons/test/market-ship-to-end-to-end.mjs` — paid Stripe → `ship_to` → Printful / Printify / Lulu.
- **50:** `commons/test/market-maker-ships-address.mjs` — a maker-shipped product collected no address.
- **51:** the `physical` flag, measured (`teams/build/outputs/round51-deepseek-physical-flag.md`).
- **52:** `printableArt()` in `printful.mjs` — WebP/GIF art → PNG. **Merged.**
- **53–54:** `salesPage` said `Sent to Printful` for a printer order (and nothing at all before that).
- **55:** that line pinned with a real `market.create` + `fulfillment.link` + paid order (`market-order-ship-to.mjs`).
- **56:** every printer gets its name — a `PRINTERS` loop in `commons/test/market-sales-ship-to.mjs`.
- **57 (1):** merch-sets' WebP case proven non-vacuous (two fake-sharp mutants).
- **57 (2):** **printer state**, MERGED (fb22f51f, Setu's second yes on cbff562d): `printerShown(o)` in
  `checkout.mjs` + `data-printer-state="draft"|"failed"` in `salesPage`. Test `market-sales-printer-state.mjs` 2/2,
  M-A/M-B both red.
- **58 (THIS): the other half of the in-flight guard is pinned — DONE and measured.**
  `commons/test/merch-checkout.mjs` +6 lines after the "payment stands" assertion: Printful set healthy, the refused
  order is sent again, must reach it exactly once. Measured here (fake `sharp` via a `registerHooks` hook, no server):
  baseline **1/1 pass**; mutant (`sending.delete(o.id);` → `// …`, temp copy, restored in `finally`) **1/1 fail at
  "a refused order can be sent again"**; restored **1/1 pass**; `git status --porcelain -- commons/lib/checkout.mjs`
  empty afterwards. Report: `teams/build/outputs/round58-deepseek-finally-pin.md`. Test-only change → Tier 2, no
  second yes needed; nothing in `checkout.mjs` edited.

## Runner facts (current — verified, not guessed)
1. **`$REPO` is writable for existing files** (in-place mutation + restore works; only *new directories* hit EACCES).
   Mutate the real file, keep the original in a string, restore in a `finally`, then re-run to prove green.
2. **`$OUT` is a NEW path on every `run_python` call.** Write `fake-sharp.mjs` + `hook.mjs` in the same call that runs
   them, with an absolute `file://$OUT/...` URL in the hook.
3. **A bare `✖ <path> … 'test failed'` with 0 pass is the import hook failing, not the test.** `node --check` first.
4. Fake `sharp` that works: a `Proxy` whose `get` returns `metadata`/`toBuffer`/`toFile` as async functions and any
   other key as `() => p`; `toBuffer` must return bytes unlike every fixture.
5. `fulfillment.init(D)` and `checkout.init(D)` are both needed server-free; `merchsets.init(D)` after writing
   `D/merch/sets.json` by hand is how you get an approved tee without the panel.
6. Node v24's reporter is not TAP — parse `✔`/`✖` and `ℹ pass|fail N`.
7. The sandbox cannot boot the Commons server (`src/llm.js` absent): server-free tests only.

## Open / next
1. **Claude's `resendUnsent`** (`round58-claude-resend-unsent.md`) is Tier 1 and needs Setu's second yes on the branch
   SHA. **Merge conflict expected:** both edit `checkout.mjs`; whoever lands first, the other rebases.
2. **Round 59 wiring** (Claude, not me): start-up resend + steward Send button. Setu's PR #301 addresses the live
   `failed` shirt by reading `collected_information.shipping_details` and asking Stripe for the session — so the "send
   it again" line on `/label/sales` still has no button until that + round 59 land.
3. Not claimed by me: no browser look at `/label/sales`, no booted run of `merch-checkout.mjs` (Setu's run is the real
   check; the mutant evidence here is in-process).
4. The `git diff --stat` in the snapshot pairs files oddly (rename heuristic on a non-clean index) — trust
   `git status --porcelain` per path, not the stat line.

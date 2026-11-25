# DeepSeek — active checkpoint

_Last written: 2026-11-25 (round 56, build session). Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Rounds 48–56 are one line of work: our side of the paid → ship path, proven by tests that can actually go red.

- **48–49:** `commons/test/market-ship-to-end-to-end.mjs` — paid Stripe → `ship_to` → Printful / Printify / Lulu.
- **50:** `commons/test/market-maker-ships-address.mjs` — a maker-shipped product collected no address.
- **51:** the `physical` flag, measured (`teams/build/outputs/round51-deepseek-physical-flag.md`).
- **52:** `printableArt()` in `printful.mjs` — WebP/GIF art → PNG. **Merged.**
- **53:** same bug in `commons/lib/merchsets.mjs`, measured with two mutants.
- **54:** `salesPage` says `Sent to Printful` for a printer order.
- **55:** that line pinned with a real `market.create` + `fulfillment.link` + paid order (`market-sales-ship-to.mjs`).
- **56 (this session): every printer gets its name.** Round 55's single Printful case became a `PRINTERS` loop —
  one test per pipe (printful→Printful, printify→Printify, lulu→Lulu), each with its own temp data dir, listing and
  link (Lulu: test-only sku `0850X0850BWSTDPB060UW444MXX`). Test-only change; no `commons/lib` edit.
  - **Measured:** baseline **4/0** (72.3, 3.4, 2.2, 5.6 ms); drop `printify: 'Printify'` from the map at
    `marketpage.mjs:733` → **3 pass / 1 fail, red only at the printify case**; TDZ mutant (`fulfillmentLink` →
    `fulfillment`) → **1 pass / 3 fail**, round-54 case green.
  - `teams/build/outputs/round56-deepseek-printers.md`; posted in `build` as `m_mwvwxcttek72778d`.

## Runner facts (current — verified, not guessed)
1. **`$REPO` DOES contain this session's `edit_file`/`write_file` results.** Verified again this round
   (`'linked sale tells the seller who has it' in src` → True). Measure directly from `$REPO`.
2. **`fulfillment.init(D)` is required** in a server-free test, like `store/market/checkout.init(D)`. Without it:
   `path must be a string, received null` at `linksFile()`.
3. **`fulfillment.link(member, listing, spec)` reads `provider` off `spec` itself.** Keeping `provider` in a separate
   variable and passing the rest of the spec is the round-56 baseline-red bug (`provider must be one of…`).
   Printful/Printify need `variant_ids`; Lulu needs `sku`.
4. **Missing `sharp` is not a blocker.** `commons/node_modules/sharp/{package.json,index.js}` with a CJS function that
   throws → every marketplace page test runs in well under a second, no npm, no network.
5. **Node's default reporter is not TAP** on v24 — parse `✔`/`✖` and `ℹ pass|fail N`.
6. **A red baseline is never the bug under test.** Round 55 (missing init) and round 56 (missing provider field) both
   looked like "the mutant proved it" for two harness crashes. No mutant reading counts until baseline is green; on a
   red baseline, print the failure detail in the same call instead of re-running blind.

## Open / next
1. **`commons/test/market-order-ship-to.mjs` overlaps** the new loop in `market-sales-ship-to.mjs`; one of the two
   should go. I can't delete files in a session — needs Setu or a PR with shell.
2. **CI lines** for `market-sales-ship-to.mjs`, `market-order-ship-to.mjs`, `market-ship-to-end-to-end.mjs`,
   `market-maker-ships-address.mjs` (Board 073). Workflow edit is Geoffrey's.
3. **Round 53's repo test question is still open:** `commons/test/merch-sets.mjs` has a "set photo is made from a PNG
   Printful can print" case; whether it actually kills the WebP→PNG mutant is **unmeasured** (no budget left in
   round 56). One call: stub sharp, mutate `printableArt` in a copy, run that one file.
4. **Nobody has looked at `/label/sales` in a browser** on staging or production. Every claim in rounds 54–56 is a
   rendered-HTML string check.
5. If a fourth pipe ever joins `fulfillment.PIPES`, nothing forces a name in the map — a `Object.keys(PIPES)` loop is
   tempting but Lulu's `sku` makes the spec non-uniform, so it needs a per-pipe spec table like the one now in the test.

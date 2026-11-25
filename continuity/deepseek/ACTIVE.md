# DeepSeek — active checkpoint

_Last written: 2026-11-25 (round 55, build session). Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Rounds 48–55 are one line of work: our side of the paid → ship path, proven by tests.

- **48–49:** `commons/test/market-ship-to-end-to-end.mjs` — paid Stripe → `ship_to` → Printful / Printify / Lulu.
- **50:** `commons/test/market-maker-ships-address.mjs` — a maker-shipped product collected no address.
- **51:** the `physical` flag, measured (`teams/build/outputs/round51-deepseek-physical-flag.md`).
- **52:** `printableArt()` in `printful.mjs` — WebP/GIF art becomes a PNG Printful accepts. **Merged.**
- **53:** the same bug in the merch-set path (`commons/lib/merchsets.mjs`), measured with two mutants.
- **54:** `salesPage` (marketpage.mjs) says `Sent to Printful` for a printer order.
- **55 (this session): the "Sent to <printer>" line is now measured, not assumed.**
  - Added one `test()` to `commons/test/market-sales-ship-to.mjs`: real `market.create` listing + `fulfillment.link`
    (printful, product `pf-12345`, variant `4011`) + paid order with `ship_to`; asserts `data-sent-to`,
    `Sent to Printful`, no `data-post-to`, no address, and nothing of it on the buyer's page.
  - **Measured:** baseline **2/2 pass** (106.9 ms, 5.8 ms); TDZ mutant (rename `fulfillmentLink` → `fulfillment`,
    both anchors found exactly once) **1 pass / 1 fail**, red at "the seller is told where the order went".
  - `teams/build/outputs/round55-deepseek-sent-to.md` has the table, the numbers and what is unmeasured;
    raw runner output in `teams/build/outputs/2026-11-25T08-13-16/round55-{baseline,mutant}.txt`.

## Runner facts (updated — one of these was wrong before)
1. **`$REPO` now DOES contain this session's `edit_file`/`write_file` results.** Verified: after my `edit_file`,
   `'printer-linked sale tells' in src` → `True` in the next `run_python`. So measure directly from `$REPO`; no need
   to replay edits or retype a test into a python string. (My old note said "session-start snapshot" — it was wrong.)
2. **`fulfillment.init(D)` is required** in a server-free marketplace test, exactly like `store/market/checkout.init(D)`.
   Without it: `TypeError: The "path" argument must be of type string. Received null` at `linksFile()`. That cost me
   a red baseline and a wrong "mutant proved it" reading.
3. **Missing `sharp` is not a blocker.** Write `commons/node_modules/sharp/{package.json,index.js}` with a CJS stub
   (`module.exports = function(){ throw … }`). Every marketplace page test then runs in ~150 ms, no npm, no network.
4. **Node's default reporter is not TAP on v24** — parse `✔`/`✖` and `ℹ pass|fail N`, not `# pass`.
5. **A green run must name a subtest, and a mutant must kill the NEW case** while the old one stays green (that is
   what makes the new case worth its lines).

## Open / next
1. **`commons/test/market-order-ship-to.mjs`** carries four overlapping assertions from an earlier round-55 pass; the
   two printer cases (there and in `market-sales-ship-to.mjs`) should be one. Choose one, delete the other's overlap.
2. **CI lines** for `market-sales-ship-to.mjs`, `market-order-ship-to.mjs`, `market-ship-to-end-to-end.mjs`,
   `market-maker-ships-address.mjs` (Board 073). Workflow edit is Geoffrey's.
3. **Round 53's repo test is no longer missing** — `commons/test/merch-sets.mjs` already has
   "the set photo is made from a PNG Printful can print…". Check whether it kills the mutant before calling it done.
4. **Nobody has looked at the sales page in a browser** on staging or production.

# Round 56 — DeepSeek: every printer gets its name

**Job (teams/build/JOBS.md):** in `commons/test/market-sales-ship-to.mjs`, turn the single Printful printer case into a
loop over `printful → Printful`, `printify → Printify`, `lulu → Lulu`; each asserts the seller's page has
`data-sent-to` and `Sent to <Name>`, no `data-post-to`, no address line, and the buyer's page has none of it.
Mutant: drop the `printify` key from the name map → only the Printify case red.

## What changed

- `commons/test/market-sales-ship-to.mjs` (test only; no `commons/lib` change): round 55's single `test()` is now a
  `PRINTERS` table and a `for` loop generating **one test per pipe**, each with its own temp data dir, its own real
  listing (`market.create`, `physical: true`) and its own `fulfillment.link()`. Each pipe gets what `link()` demands:
  Printful/Printify a variant id, Lulu the print-package `sku` (`0850X0850BWSTDPB060UW444MXX`, a test-only value).
  The round-54 maker-shipped case is untouched.
- The map being pinned is `marketpage.mjs:733`:
  `Sent to ${({ printful:'Printful', printify:'Printify', lulu:'Lulu' })[printer] || printer}` — the `|| printer`
  fallback means a missing key renders the **lowercase provider id**, which is exactly the silent defect the loop
  now catches.

## Measured (scratch copy of this session's repo, `sharp` stubbed, no server, no network, no Stripe)

Command per copy: `node --test commons/test/market-sales-ship-to.mjs` (default reporter; parsed ✔/✖ and `ℹ pass|fail N`).

| run | pass/fail | where it goes red |
|---|---|---|
| baseline | **4 / 0** (72.3, 3.4, 2.2, 5.6 ms) | — (round-54 case + all three printer cases green) |
| mutant A: `printify: 'Printify',` deleted from the name map (1 anchor, verified) | **3 / 1** | **only** "a printify-linked sale…" |
| mutant B: `fulfillmentLink` renamed back to `fulfillment` (the pre-Setu TDZ bug, 1 anchor each) | **1 / 3** | all three printer cases; round-54 case stays green |

So the new cases discriminate: a per-provider defect kills one case, a whole-line defect kills all three, and the
older maker-shipped case is blind to both — which is why it could never have proved this.

## A harness bug I hit first (recorded because it will bite the next person)

First run: **baseline red, 1 pass / 3 fail**, all three printer cases failing in <1 ms. Cause was mine: my table
entry held `{ category, product_id, variant_ids }` while `provider` lived in a **separate loop variable**, and I passed
`link` straight to `fulfillment.link()` — which reads `provider` off that same object, so it rejected every call with
"provider must be one of…". Fixed by `{ provider, product_id: link.product_id, variant_ids: link.variant_ids, sku: link.sku }`.
Same lesson as round 55, from the other side: **a red baseline is never the bug you are hunting; read it before you
mutate anything.** A mutant run from a red baseline proves nothing.

## Not measured / limits

- Every claim here is a **rendered-HTML string check**, not a browser view. Nobody has looked at `/label/sales` in a
  browser on staging or production (carried over from rounds 54–55).
- The buyer-side assertion renders `salesPage` with the buyer as `me`; it does not exercise the real `/orders` route.
- Only the three pipes whose names appear in the map are covered. If a fourth pipe is added to `PIPES`, nothing forces
  a name here — a future loop over `Object.keys(PIPES)` filtered on `mode === 'api'` would, but Lulu's `sku` requirement
  makes that non-uniform.
- All money/Stripe paths remain fake: orders are rows written into a temp `payments/orders.jsonl`.

## Next (unchanged, and still not mine to close alone)

1. `commons/test/market-order-ship-to.mjs` still carries printer assertions that now overlap this file's loop; one of
   the two should go. I have no delete/edit mandate for that file this round — flagging it again rather than duplicating.
2. CI lines for `market-sales-ship-to.mjs`, `market-order-ship-to.mjs`, `market-ship-to-end-to-end.mjs`,
   `market-maker-ships-address.mjs` — workflow edit is Geoffrey's (Board 073).
3. Round-53 item: `commons/test/merch-sets.mjs` already has a "set photo is made from a PNG Printful can print" case;
   whether it actually kills the WebP→PNG mutant is **still unmeasured** (no call budget left this round).

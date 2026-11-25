# Round 59 — DeepSeek: the buyer never sees the printer's words

Job (JOBS.md, Round 59, DeepSeek): new `commons/test/market-orders-no-printer-error.mjs`, server-free, seeded like
`commons/test/market-sales-printer-state.mjs`. A paid order with a `failed` fulfillment whose `error` is
`"secret printer text 4242"`. Render the buyer's page (`ordersPage`) and the seller's (`salesPage`); assert neither
HTML contains `secret printer text` and neither contains `4242`. Mutant: temp copy of `checkout.mjs` with
`printerShown` returning `o.fulfillment` whole → red. Edit no lib file.

**Shipped:** `commons/test/market-orders-no-printer-error.mjs` (2 tests). No lib file edited — every mutant was written
into the real file and restored in a `finally`; `git status --porcelain` on both lib files is empty afterwards.

## What the test does
Seeds a real Printful-linked listing (`market.create` + `fulfillment.link`), a paid order (`ship_to` set), and one
`op:'fulfillment'` row with `{ provider:'printful', provider_order:'PF-1001', state:'failed', error:'secret printer text 4242' }`.
Then, from `checkout.ordersFor(buyer)` / `ordersFor(seller)` — the same records `/api/me/orders` returns
(`commons/server.mjs:1745-1749`) and `/orders` renders (`:1750`):

1. **pages test** — `ordersPage({me: buyer, purchases})` must still render the order (title + "Paid", so the absence
   below is not an empty page), and must contain no `secret printer text`, no `4242`, and no `PF-1001`;
   `salesPage({me: seller, sales})` must say `data-printer-state="failed"` with `PF-1001`, and must contain no
   `secret printer text`, no `4242`, and no address.
2. **records test** — the stored `orders.jsonl` **does** contain the secret (so the seed is real), while the JSON of
   the buyer's purchases and the seller's sales carries `"state":"failed"` and neither the secret nor `4242`.

## Measured (node v24, from `$REPO`, fake `sharp` through a `registerHooks` resolve hook; no server, no network)
| run | result |
|---|---|
| `node --check` | exit 0 |
| **baseline** (before any mutant) | **2/2 pass, 0 fail** |
| **M-A** job's mutant: `printerShown` → `{ ...f }` | **1/2, red** at *"the records behind the pages… / and not the printer's words"*; **the pages test stayed green** |
| **M-B** seller page alone prints `o.printer.error` | **2/2 green** — vacuous (see below) |
| **M-D** `printerShown` → `{ ...f }` **and** buyer page prints `o.printer.error` | **0/2, red** at *"the printer's words are not on the buyer's page"* |
| **M-E** `printerShown` → `{ ...f }` **and** seller page prints it | **0/2, red** at *"the seller is not shown the printer's words either"* |
| restored | **2/2 pass**; `git status --porcelain -- commons/lib/checkout.mjs commons/lib/marketpage.mjs` → *(clean)* |

## The finding (this is the part the job did not expect)
**`printerShown` is the only guard, and it guards the records, not the pages.** M-A turns the records test red and
leaves the HTML green, because `marketpage.mjs` never renders `o.printer.error` at all — and M-B shows that even a page
line *added* to print it stays green, since the shown record no longer carries the field. So the HTML is protected
twice over (record stripped, then never printed), and the layer that can actually be removed is the one in
`checkout.mjs:65`. M-D and M-E are the mutants that prove the page assertions bite; without them the HTML half of the
test would be green-by-construction and I would not have been able to say so.

Practical consequence: anyone editing `printerShown` (round 57's three fields) is editing the buyer's protection, and
this file goes red at the records test if `error` is allowed back in. Anyone editing `salesPage`/`ordersPage` to print
the printer's text cannot leak it today, but the combined mutants show the assertion that would catch it.

## Limits (stated, not implied)
- **Not booted, not in a browser.** This sandbox has no `src/llm.js`, so the Commons server cannot start; `/api/me/orders`
  is exercised through `checkout.ordersFor`, not over HTTP. Setu's booted run of this file is the check that counts.
- **No real `sharp`.** A Proxy stand-in is resolved in place of `sharp` (banked recipe, round 57–58); nothing here
  touches image handling, so this only keeps the import chain loading.
- Test-only change → Tier 2; the lane turns it into a kin-build PR. Nothing in `commons/lib/` changed.

## Next
1. @Setu: boot and run `commons/test/market-orders-no-printer-error.mjs` on main (it should be green there: nothing in
   it depends on unmerged code), then place it in CI.
2. PR #301 still needs Claude's measured yes at its exact head; nothing here overlaps its files.
3. Open for whoever takes the merch page next: the buyer's page never names the printer or its order id at all
   (`ordersPage` shows only "Printful prints and ships it"). If a buyer ever needs the printer's reference for a
   support question, that is a deliberate design change, not a leak to be restored.

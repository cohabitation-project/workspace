# Round 51 — the `physical` flag, measured (DeepSeek, 2026-11-24)

**What this closes.** Round 50 showed the gap by reading: a maker-shipped product (`type: 'product'` with no printer
link) collected no address, so the maker could not ship it. This round adds the flag and measures the fix. Tier 1
(money/checkout): needs a second builder's yes before merge.

## The change (3 files, unmerged on the session branch)
1. `commons/lib/market.mjs` — every listing may carry `physical`: `true`, `false`, or absent → stored `null`.
   Validated on create: anything but a boolean is a 400 that names the field. Absent means "the maker did not say".
2. `commons/lib/checkout.mjs:171` — the address request is now:
   `fulfillment.plan(ord).provider || (l.type === 'product' && l.physical !== false)`.
   A printer-linked order still asks. A product the maker called digital (`physical: false`) asks nothing.
   A product the maker never answered asks, because a paid order nobody can post is worse than an address the
   buyer turns out not to need. Storage is unchanged: `handleEvent` stores `ship_to` whenever Stripe sends it.
3. `commons/test/market-maker-ships-address.mjs` — case 2 flipped to the new rule, plus 3 new cases: `physical:false`
   asks nothing, `physical:true` asks, and the flag is validated on create.

## Measured (sandbox copy of the repo, `node --test-reporter=tap`, `sharp` absent)
| Run | Result |
|---|---|
| `market-maker-ships-address.mjs` alone | **8 tests, 8 pass, 0 fail** |
| Mutant A: the `physical !== false` half dropped from the checkout condition | 8 tests, 6 pass, **2 fail** (parent + the maker-shipped case) |
| Mutant B: `physical` never stored (`physical: null` in `market.mjs`) | 8 tests, 6 pass, **2 fail** (same two) |
| Five files together: maker-ships-address, ship-to-end-to-end, order-ship-to, paid-journey, stripe-checkout | **25 tests, 23 pass, 2 fail** |

**The 2 failures are environmental, not regressions.** `market-order-ship-to.mjs` and `market-paid-journey.mjs` both
fail with `Cannot find package 'sharp' imported from commons/lib/merchsets.mjs` — and they fail identically on a
control copy with my checkout change reverted. The sandbox has no `sharp`; CI does. They are not evidence against
this change and I am not claiming them green.

**Mutant meaning.** A mutant that kills only the maker-shipped case proves the test is wired to the new condition
and not to something incidental. Dropping the flag from storage and dropping it from the condition both go red,
so the test covers collection and persistence as separate facts.

## Still open
1. **Second builder's yes** on the exact SHA (Tier 1: checkout).
2. **Contradiction on the listing form:** `physical: false` plus a printer link is accepted and meaningless — the
   printer always ships. Either the form should hide the flag when a printer is linked, or validation should reject
   the pair. Not changed here; a design call (@Aletheia-6 / @Ash).
3. **The seller still cannot see the address.** `marketpage.salesPage` (~:718) renders no address for any order, so
   even a collected `ship_to` is invisible to the maker on `/label/sales`. Round 50's finding; unfixed.
4. **CI lines** for the two new test files (Board 073) — without them these tests are silent on main after merge.

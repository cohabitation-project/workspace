# Round 50 (DeepSeek) — a maker-shipped order collects no address, and nothing would show it

_Measured 2026-11-24 in the sandbox (temp copy of `commons/` + `{"type":"module"}`, `COMMONS_FAKE_LLM=1`,
`node --test --test-reporter=tap`). Fake Stripe only: no network, no keys, no real money, no printer call._

## The question
`checkout.startCheckout` asks Stripe for a shipping address behind one condition (`commons/lib/checkout.mjs:171`,
the `shipping_address_collection` spread):

```js
...(fulfillment.plan(ord).provider ? { shipping_address_collection: { allowed_countries: ['US'] } } : {}),
```

`fulfillment.plan(...).provider` is non-null only when the maker linked a printer to the listing. But most physical
things on the market will be posted **by the maker**, not by Printful/Printify/Lulu. So: does a maker-shipped
product collect an address?

**No.** A listing carries no physical/digital field: `market.TYPES` is
`product | service | commission | collaboration | bounty | free` and `market.LICENSES` has no physical/digital value
(read, `commons/lib/market.mjs`). The printer link is therefore the only "this is a thing you post" flag we have, and
it is the only trigger for the address. A maker-shipped product's checkout asks for nothing.

## What the test pins
`commons/test/market-maker-ships-address.mjs` (new). Two product listings from one verified seller; one linked to
Printful, one not.

1. **Control:** the printer-linked session body has `shipping_address_collection[allowed_countries][0] = 'US'`.
2. **The defect:** the same listing *without* the printer link has **no** `shipping_address_collection` key at all —
   `plan()` names no provider, so the buyer is never asked, and the order can be paid with nowhere to send it.
3. **Storage is not the gap:** `handleEvent` persists `ship_to = {name, address}` whenever Stripe sends
   `shipping_details`, provider link or not, and drops `phone` and `carrier` (read, `checkout.mjs`, `handleEvent`).
   Those two fields never reach the application log.
4. **The printed order still works:** address stored, and `plan().request.body.recipient` translates it into
   Printful's names (`address1/address2/state_code/country_code/zip`).

## Measured
```
real main                                5 tests / 5 pass / 0 fail / 0 todo
MUTANT: guard removed (always ask)       5 tests / 3 pass / 2 fail
MUTANT: ship_to not stored               5 tests / 2 pass / 3 fail
```
`node --check` clean on all three. The mutants kill the subtests they should: dropping the guard kills the
maker-shipped case; dropping the `ship_to` write kills the storage case. (The parent test shows as failed in each
mutant because it aggregates its subtests — that is `node:test`, not a third break.)

**One correction I made to myself:** my first run was 3 pass / 2 fail, and the failure was mine, not the library's.
I expected the Printful `recipient` without `address2`; `recipientFor` always includes it, empty when the buyer gave
no second line. Fixed the expectation, re-ran, 5/5. Recording it because "my assertion was wrong" and "the lib is
wrong" look identical in a red run.

## The second gap, established by reading not running
Even with an address collected, the seller still could not ship from the site: `marketpage.salesPage`
(`commons/lib/marketpage.mjs:718`) renders buyer name, amount, date and status, plus a **"Fulfillment details"** link
only when `o.hasFulfillment` — which is the provider link. **No address is rendered for any order on any seller page.**
So a maker-shipped sale today gives the maker no street, no city, nothing to post to.

## Proposed fix (Tier 1 — proposed, not edited)
Two edits, both in Tier 1 files, both small:

1. **Collect:** in `checkout.mjs:171`, ask for the address whenever the thing must be delivered — minimally
   `fulfillment.plan(ord).provider || market.get(q.listing)?.type === 'product'`. This over-asks for a digital
   "product", so the honest version is a `physical: true/false` field on the listing and the condition reads that.
   Which of the two to take is a product decision (@Ash), not a builder's.
2. **Show:** render `order.ship_to` on `/label/sales` for orders the seller ships, and only the seller. That is the
   same privacy line `#280` already draws for fulfillment details (maker's eyes only).

Neither is mine to merge: `checkout.mjs` and `marketpage.mjs` touch money and member data.

## Limits, stated plainly
- Fake Stripe. This proves what our side sends to Stripe and stores back; it does not prove Stripe's hosted page
  behaves as asked.
- The test is **not** in the long `node --test` line in `.github/workflows/commons-tests.yml` — `merge-build-lane`
  runs the files a branch adds, so it is green once at merge and silent on main after. Board request filed for the
  CI line, together with `market-ship-to-end-to-end.mjs` from round 48.
- `commons/lib/marketpage.mjs` cannot be imported in this sandbox (`sharp` absent → `ERR_MODULE_NOT_FOUND`), which
  is why gap 2 is by reading, not by assertion. In CI it would be assertable; I did not write an unrun assertion.

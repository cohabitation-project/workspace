# Round 82 — Claude: can a LINKED listing be priced at a loss?

**Answer: yes, for all three printers. Nothing anywhere compares a linked listing's price to the printer's cost.** (Found by reading, then confirmed by a server-free test on main 2e37411.)

## What I read (file:line, main 2e37411)
- `commons/lib/fulfillment.mjs` `link()` (~:60–83) checks ownership, the provider, the product id, that Printful/Printify have a variant id and that Lulu has a sku. It never looks at the listing's price. It stores `design.base_price` (Printful's variant price from the mockup) only when the maker's own art is attached, and nothing reads that field back (grep `base_price` in lib/server: only printful.mjs writes it and fulfillment.mjs stores it).
- `commons/lib/market.mjs` `checkPrice()` (~:97–106): the only rule is $1 to $100,000. `update()` (:201) re-runs it on the new price and never asks fulfillment whether the listing is linked. `market.mjs` has no import of fulfillment, so it cannot.
- Create/update routes and the link route are separate: `POST /api/market/listings/:id/fulfillment` (server.mjs:1957) and the market routes. Order of operations can be either way (price then link, or link then price), and neither step checks the other.
- `bookPriceFloor()` (fulfillment.mjs:207) is the Lulu floor. It is called from exactly one place, the advisory quote route (server.mjs:1830), which returns `floor_usd`. `commons/public/publishing.js:20` shows a red "Below the floor" line in the browser. **Neither refuses anything.** A linked Lulu listing does not pass through the floor: the Publishing Desk floor is a client-side warning on one page; the listing route, the link route and update all ignore it.
- Printful has the merch-sets floor (every-size, merged cc0bce23), but that applies only to products approved through `merchsets`, not to a generic Printful-linked listing.

## Test
`teams/build/outputs/2026-11-28T15-20-49/market-linked-floor.mjs` (4,631 B, sha256 527dca5a76cbd475066f2492fa08b86ec34ec83579e5b8da0470cafa20811ffc). Place as `commons/test/market-linked-floor.mjs`. Server-free, no network, no keys.
- Results on main: 8 pass, 0 fail, 3 todo.
  - control: link and price paths work; a $0 price is refused 400 (the one rule that exists).
  - for each of printful / printify / lulu: a listing at $5 links fine and plan() will send it as linked; a linked listing is edited down to $1 and the link survives.
  - Lulu: the listing is under `bookPriceFloor` and still linked; the helper itself refuses nonsense input.
  - three `test.todo` named with the loss in cents per sale at $1 (printer cost is a **guessed** fixture): printful ≥2050¢, printify ≥1700¢, lulu ≥520¢, before card fees. These are lower bounds. The base costs are fixtures, not live prices.
- Mutant (link() refuses any listing under $10): 4 of the 8 go red, as they should. Restored.
- Not run: the whole suite; any real server; any live provider price.

## Proposal (product call, not a patch)
1. **Refuse at link time, and at price-edit time if linked** — the cleanest for makers. It needs a cost to compare against, which only Printful (variant price) and Lulu (cost quote) can give. Printify has no cost lookup in the code, so it has no floor to compare. A refusal for just two of three printers is an uneven rule.
2. **Warn, don't refuse**, using the same line the Publishing Desk shows ("Below the floor… nobody sells at a loss") on the listing editor, with the sale still allowed. Works for all three if the maker enters their printer cost once at link time (`link()` gets a `cost` field).
3. Whichever: it has to live where both steps meet. `fulfillment.link` can see the listing's price; `market.update` cannot see links. Smallest shape: a `hooks.linkedFloor(listing, newPrice)` in market.setHooks (it already has `setHooks`, :50), set by server.mjs to look at `fulfillment.linkFor`.
Money, so Tier 1 when built. Linked Lulu/Printify orders are also never sent today (round 80b), so the two gaps compound: a loss-priced linked sale is also unfulfilled.

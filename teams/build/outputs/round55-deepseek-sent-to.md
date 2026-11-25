# Round 55 (DeepSeek) — "Sent to Printful" is now pinned by a test that can see it

**Job (JOBS.md, Round 55):** pin the seller's "Sent to `<printer>`" line in `commons/test/market-sales-ship-to.mjs`,
with the TDZ mutant Setu found; run `node --test` on both files.

**State found:** Setu's fix is on main (`03e9b971`: the local `const fulfillment` — the "Fulfillment details" link —
renamed to `fulfillmentLink`, so it no longer shadows the `fulfillment` module import). The line renders. Nothing ran it.

## What changed (one file)

`commons/test/market-sales-ship-to.mjs` — one new `test()`, appended after the maker-shipped case already there:

| assertion | what it protects |
|---|---|
| `/data-sent-to/` on the seller's page | the fulfillment block exists at all (the TDZ bug made it vanish) |
| `includes('Sent to Printful')` | it names the printer the order went to |
| `!includes('data-post-to')` | a printer order does not ask the seller to post it |
| `!includes('3 Mill Lane')` | the buyer's address stays off the seller's page |
| buyer's page: no `data-sent-to`, no address | only the seller sees any of it |

The case is real, not a stub: `market.create(seller, …)` makes a listing (art, product, fixed $25, `physical: true`),
`fulfillment.link(seller, listing, {provider:'printful', product_id:'pf-12345', variant_ids:['4011']})` links it to a
printer, and the paid order (`ship_to: 3 Mill Lane`) is written straight into the temp data dir's `payments/orders.jsonl`.
No server, no network, no Stripe.

## Measured (Node v24.22.3, fresh copy of this session's repo, `sharp` stubbed — see below)

```
BASELINE                        pass 2 / fail 0
  ✔ the sales page shows the buyer address to the seller only, escaped   (106.9 ms)
  ✔ a printer-linked sale tells the seller who has it, and still shows no address (5.8 ms)

MUTANT: fulfillmentLink -> fulfillment (the TDZ bug, exactly as shipped)   pass 1 / fail 1
  ✔ the sales page shows the buyer address to the seller only, escaped   (109.9 ms)
  ✖ a printer-linked sale tells the seller who has it, and still shows no address
    AssertionError: the seller is told where the order went
```

The mutant renames both sites (`const fulfillmentLink = o.hasFulfillment…` and `${fulfillmentLink}`), each anchor
found exactly once, printed before the replace. The old case stays green under it and the new case goes red at its
first assertion — so the new case is the one that sees the bug, and it is not merely riding on the old one.

Raw runner output saved: `teams/build/outputs/2026-11-25T08-13-16/round55-baseline.txt` and `round55-mutant.txt`.

## Two things that cost this session, so the next one does not pay again

1. **`fulfillment.init(D)` is required in a server-free test.** Without it the first run died at
   `linksFile()` → `TypeError: The "path" argument must be of type string. Received null` — not a code bug, a harness
   bug. store, market and checkout each get `init(D)`; fulfillment does too, and the docs here should say so.
2. **`$REPO` in `run_python` DID contain this session's `edit_file` result** (`'printer-linked sale tells' in src` →
   `True`). That contradicts my earlier banked note ("session-start snapshot") — the copy is refreshed from the live
   workspace at each call, which is why the measurement above is of my actual edit and not a replay.

## Not measured

- The page in a browser (still nobody has looked; everything here is rendered-HTML string checks).
- The real Printful path (no network, no token, no order sent). This pins what the *seller sees*, and nothing about
  what the printer receives — `fulfillment.plan`/`recipientFor` are covered elsewhere.
- `market-order-ship-to.mjs` also carries four of these assertions from round 55's earlier session; whether it is in
  CI is Board 073's question, and it is Geoffrey's workflow edit.

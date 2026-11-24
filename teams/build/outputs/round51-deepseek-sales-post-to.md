# Round 51 — DeepSeek: the maker sees where to post it

Status: **started**. Tier 1 (private data). Needs Setu's second yes on the exact SHA.

## What the job says
The address is collected for maker-shipped products (ddadbafe) but `marketpage.salesPage`
(`commons/lib/marketpage.mjs:718`) shows the seller nothing, so a paid order can't be posted.

1. `salesPage`: for a sale whose listing has **no printer link** and whose order has `ship_to`,
   show name + address lines to **that seller only**, in a small "Post to" block (plain text, escaped).
   Printer-linked orders show nothing (the printer has it).
2. `commons/test/market-order-ship-to.mjs`: keep "no delivery address in the buyer's `ordersPage`
   or in logs" exactly; narrow the `salesPage` half to printer-linked sales; add a case: a
   maker-shipped paid order's `salesPage` for its seller **does** show the address, and for another
   seller does not.
3. Run 4 test files + a mutant (render for every seller → red).

## Measurement
_(filled in below after the runs)_
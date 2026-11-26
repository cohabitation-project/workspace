# Round 62 — DeepSeek: the resend button, failed orders only

_Status: in progress. Started 2026-11-26 ~03:25Z._

## Job as assigned (Setu, foreman)
1. `commons/lib/marketpage.mjs` `salesPage`: for an order whose printer state is `failed`, add
   "You can send it again." with `<button data-printer-send="<order id>">Send it again</button>` and an empty
   `<span role="status"></span>`; add `scripts: ['/static/market.js']` to its `frame` call. No other row changes.
   No "Not sent yet" branch.
2. `commons/test/market-sales-resend-button.mjs`: failed (button present), sent (absent), draft (absent),
   buyer copy (absent on /orders).
3. Do not touch `market.js` this round.

Findings and evidence fill in below as measured.

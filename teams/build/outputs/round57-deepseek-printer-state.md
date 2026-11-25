# Round 57 (DeepSeek): the seller sees where the printer stands

**Job (teams/build/JOBS.md, Setu, 2026-11-25 12:40Z):** after #300 a merch order carries
`fulfillment: { provider, provider_order, state: 'draft'|'failed', error? }`, but `shown()`
(`commons/lib/checkout.mjs:62`) drops it, so `/label/sales` can't say it.
Tier 1 because it touches `checkout.mjs` (money/orders): needs a second builder's yes.

## Status

IN PROGRESS — written in the first call of the session.

(1) `shown`: `printer: o.fulfillment ? { provider, provider_order, state } : null` — no `error`.
(2) `salesPage`: draft → "At Printful as a draft (#<provider_order>), waiting for a person to confirm it";
    failed → "The printer refused this order. A steward can send it again." — with `data-printer-state="…"`.
    The buyer's `/orders` shows no printer line.
(3) New `commons/test/market-sales-printer-state.mjs`, server-free: one draft order, one failed order
    (write the `op: 'fulfillment'` lines to `orders.jsonl` the way `sendToPrinter` does), assert both seller
    lines and that the buyer page has neither. Mutant: drop `printer` from `shown` → red.

Measured numbers and limits are added below as they are read, not before.

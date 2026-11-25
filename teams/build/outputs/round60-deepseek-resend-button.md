# Round 60 — DeepSeek: "Send to the printer again" for the maker (in progress)

Job: `salesPage` (commons/lib/marketpage.mjs) says "A steward can send it again" but the route
`POST /api/orders/:id/printer` lets the maker or a steward send it, and no button calls it.
Deliverables: the button + words in `salesPage`, the click handler in `commons/public/market.js`,
`scripts: ['/static/market.js']` on salesPage's `frame`, new test `commons/test/market-sales-resend-button.mjs`,
one mutant.

Everything below is filled in as it is measured. Nothing here is claimed that was not run.

## Status

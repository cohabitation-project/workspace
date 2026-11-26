# Round 63 — DeepSeek: make "Send it again" work

Job (JOBS.md, round 63, under my name): the button is on `/label/sales` with no handler. Add one
delegated click handler in `commons/public/market.js` that POSTs `/api/orders/:id/printer` and writes
the outcome into the sibling `span[role=status]`. Test in `commons/test/market-resend-click.mjs` with a
fake DOM + fake fetch: draft, failed, 403. Only those two files.

Status: IN PROGRESS — filled in below as I go.

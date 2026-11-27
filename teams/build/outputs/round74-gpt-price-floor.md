# Round 74 — GPT price-floor table

| Path | File:line | Below-base refused? |
|---|---|---|
| `merchsets.saveDraft` | `commons/lib/merchsets.mjs:202–205` | **YES** — rejects unless the rounded price meets the computed floor. |
| `merchsets.approve` | `commons/lib/merchsets.mjs:227–234` | **NO** — approval checks for a current-position photo, but does not recompute/recheck the price floor. |
| `merchsets.buySpec` | `commons/lib/merchsets.mjs:144–155` | **NO** — confirmed by source check: it verifies approved product/options and returns the computed price; it has no floor check. |
| `market.create` (POST `/api/market/listings`) | `commons/server.mjs:1928` | **NO** — this generic listing path has no Printful-base floor guard. |
| `market.update` (PATCH `/api/market/listings/:id`) | `commons/server.mjs:1929` | **NO** — this generic listing path has no Printful-base floor guard. |

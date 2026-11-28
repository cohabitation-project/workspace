# Round 76 GPT — Printful price-floor table

Source inspection only; these are not runtime tests. “Below-base refused” means the path itself checks that the selling price is at least the Printful base cost.

| Path | Source | Below-base refused? | Evidence / limit |
|---|---|---:|---|
| `merchsets.saveDraft` | `commons/lib/merchsets.mjs:203–205` | YES | Rejects a product price below the computed floor for the selected product/variant set. |
| `merchsets.approve` | `commons/lib/merchsets.mjs:227–234` | NO | Approval does not recompute or enforce the floor; a saved draft may be repriced or otherwise changed before approval. |
| `merchsets.buySpec` | `commons/lib/merchsets.mjs:142–155` | NO | Verifies the approved product/options and returns the calculated price row; no below-base guard was found in this path. |
| Generic marketplace create | `commons/server.mjs:1928` → `commons/lib/market.mjs` | NO | The listing-create route does not apply a Printful base-cost floor. Generic market code has no Printful base-cost integration. |
| Generic marketplace update | `commons/server.mjs:1929` → `commons/lib/market.mjs` | NO | The listing-update route likewise has no Printful base-cost floor. |

**Conclusion:** Source inspection indicates the floor is enforced when saving a draft, but not at approval, purchase-spec generation, or generic listing create/update. This table does not establish whether an end-to-end order can be completed below base; checkout/order state remains separate, and no runtime flow was run here. The missing guards are findings, not proposed fixes: this Round 76 job requested the table only.

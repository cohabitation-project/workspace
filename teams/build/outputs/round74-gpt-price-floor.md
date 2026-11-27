# Round 74 GPT — Printful price-floor audit

**Status: source audit in progress; no behavior fix claimed.** This report distinguishes the current Printful draft path from ordinary listing repricing and legacy mockup endpoints.

| Path that can affect a Printful item | Source location | Below-base price refused? | Evidence / scope |
|---|---|---:|---|
| Save selected Printful product as draft | `commons/lib/merchsets.mjs:203–205` | **YES (save-time)** | Computes `floor(p, vs)` and refuses a requested price below that selected-variant floor. This is only a save-time check; it does not establish that later approval/repricing rechecks provider cost. |
| Generic marketplace listing create/update | `commons/lib/market.mjs` create/update (previous inspection: around lines 172–207); routes `commons/server.mjs:1928–1929` | **NO (not checked against provider base)** | Generic field validation is present, but no Printful base-cost comparison was found in the previous source inspection. Need final line-precise tracing of calls and any type/association guards. |
| Legacy `/api/merch/listings` publish path | `commons/test/merch-printful.mjs` (retired-route assertion); route absent from current `commons/server.mjs` | **N/A — path retired** | Current test documents the retired route as 404. Do not treat former floor/withdraw tests as protection for current routes. |
| Printful mockup request/result | `commons/lib/printful.mjs:190–206`; routes `commons/server.mjs:1897–1898` | **NO — does not itself list/reprice** | Returns `base_price`; previous scan found `takeTask()` has no caller in Commons source. Verify current callers and whether a surviving approval/publish path consumes this value. |

**Current conclusion (provisional):** a price floor exists at Printful draft-save time, but coverage may not survive subsequent generic listing edits or fulfillment linking. If a live path can put a Printful product on sale without repeating the floor check, the answer to “is there still a price floor?” is **only partially**: save-time floor, not end-to-end protection.

**Not yet done:** final repricing-path audit, runnable candidate test, smallest-fix text, syntax/test attempt, and build-room hand-in. No server/browser/staging/production behavior was tested.

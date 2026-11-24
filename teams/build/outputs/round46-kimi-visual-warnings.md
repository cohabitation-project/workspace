# Round 46 — Kimi: Creator Workshop visual warnings

## Scope and implementation

Changed only `commons/test/merch-aletheia-visual.mjs` in the product/test lane. The harness now uses live `getBoundingClientRect()` measurements for the purple search band, actions card and buttons, pricing heading/price control, and size table/scroller. It prints one `visual-diagnostics {…}` JSON object per viewport before the existing JavaScript-error and horizontal-overflow gates. Defect warnings are data, not assertions, and never throw. The existing whole-page overflow abort is unchanged.

`node --check commons/test/merch-aletheia-visual.mjs` passed on Node v24.22.3.

## Exact checkouts and evidence

- main: `a4429fa26b2bdacf5bbe674d8927eeca648ab4bc`
- PR #299 head: `3e60cce9e99f6a5dce76082d893783f72105798d`
- Full logs, screenshots, npm-ci logs, commit IDs and structured results: `teams/build/outputs/2026-11-24T03-26-26/`
- Structured index: `teams/build/outputs/2026-11-24T03-26-26/result.json`

Each immutable checkout received the same edited harness. After the normal desktop invocation, a separate temporary mobile-only copy changed only `[1536,390]` to `[390]`, because main's preserved desktop overflow abort prevents its loop reaching 390 px. That temporary runner is not a product change and is not claimed as the shared harness.

## Measured outcomes

| checkout / run | exit | viewport and body scroll | diagnostic result |
|---|---:|---|---|
| main, normal desktop invocation | 1 | 1536 px; existing overflow abort retained | Diagnostics were emitted before the abort; see `main-desktop.log` and `result.json` for all rectangles. |
| main, mobile-only | 1 | viewport 390 px, body 422 px | Purple search band and search bar both end at x=422 px: **32 px beyond viewport**. Actions buttons: **0 px** past card and viewport. Pricing heading past card **0 px**, price past card **0 px**, heading text overflow **0 px**, heading/price overlap **0 px**. Size table ends at x=432 px: **42 px beyond viewport**, **62 px** past its scroller's content edge, with **49 px** local horizontal scroll. |
| PR #299, normal desktop invocation | 0 | 1536 px, body 1536 px; it then reached 390 px, body 390 px | No warnings at 1536 px. At 390 px the band/search overflow is **0 px**; actions and pricing measurements are all **0 px** overflow/overlap. The size-table warning remains. |
| PR #299, mobile-only | 0 | viewport 390 px, body 390 px | Confirms the normal run's mobile result: band/search **0 px** beyond viewport; actions **0 px**; pricing **0 px**; table right x=432 px (**42 px beyond viewport**), **94 px** past the scroller content edge, **81 px** local horizontal scroll. |

The table has `overflow-x:auto` on `.cz-breakdown`; these warnings measure its local scrolling geometry and do not assert that local scrolling itself is a whole-page overflow. No action-card or pricing defect was reproduced by these particular geometric checks at 390 px; their measurements remain in every diagnostics object for Aletheia-6's visual review.

## Limits and handoff

This is a Chromium fixture using simulated product data, not a real Printful render, staging, production, or visual-acceptance claim. Screenshots accompany the logs. The remaining size-table geometry and any visual issues not captured by these rectangles go back to @Aletheia-6; this assignment made no CSS, markup, JavaScript frontend, or fulfillment changes.

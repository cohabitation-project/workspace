# Round 64 — GPT: marketplace phone flow

**Assignment:** add `commons/test/market-phone-flow.mjs`, a focused real-browser 390×844 walk through marketplace discovery and seller pages, including visible listing and payment-closed behavior.

## Change

Added `commons/test/market-phone-flow.mjs`. It boots an isolated Commons using a disposable data directory and `TESTGATE`, creates a test member and listing, then uses Playwright at 390×844 to check signed-out `/label`, tap through to the seeded listing, measure the visible closed-Buy control, resolve the listing checkout quote without buying, verify an unknown listing returns 404, and visit signed-in `/label/mine` and `/label/sales` while checking document width and browser/5xx errors. It writes screenshots and diagnostic step lines to an optional evidence directory. The test explicitly asserts the checkout quote has `payable:false` so it cannot claim or execute a purchase.

## Evidence measured here (Node v24.22.3)

- `node --check commons/test/market-phone-flow.mjs`: exit 0.
- `node commons/test/market-phone-flow.mjs /tmp/market-phone-flow-run`: exit 1 before server/browser/test setup; module load failed with `MODULE_NOT_FOUND: playwright`.
- Thus **no real page was loaded, no dimensions/target status/unknown-listing response were measured, and no screenshots were produced**. This is not a green test.

## Next

@Setu: run `node commons/test/market-phone-flow.mjs <evidence-dir>` in dependency-complete runner/checkout with Chromium and share exact output/screenshots; fix any source/test issue revealed. Current sandbox lacks Playwright. No site code, production behavior, or live marketplace was changed or claimed.

# Kimi — Build round 69: Printful cold-read UI

## Shipped

Candidate `teams/build/outputs/merch-cold-read-ui.mjs` (8,103 bytes; SHA-256 `2e568a0fadab300bd62b56003e72f2f05060e4284b62ae77655250ec76deaa74`). Setu should place it as `commons/test/merch-cold-read-ui.mjs` and run:

```sh
node commons/test/merch-cold-read-ui.mjs [evidence-directory]
```

The standalone harness follows `market-phone-flow.mjs`: temporary Commons data, isolated server, test-gate signed-in maker, real Chromium at 390×844, and a local fake Printful limited to product 71. The fake returns 429 through the composer's first `/api/merch/products` read, then becomes healthy. The test requires a 502 cold response, visible/enabled **Try again**, the honest cold-read sentence, no product options, and no horizontal overflow. It waits the server's real 60-second retry window, clicks **Try again**, and requires a 200 response, the `Unisex Staple T-Shirt` product and `Black / M` variant, a usable visible picker, a hidden retry button, no page errors, and both fake-Printful branches. Screenshots are written before and after recovery. No product code or server clock is changed.

## Measured here

- Node v24.22.3 `node --check teams/build/outputs/merch-cold-read-ui.mjs`: **exit 0**.
- First execution attempt: **exit 1 before the harness started**, `Cannot find module 'playwright'` (0.081 s). Evidence: `teams/build/outputs/2026-11-27T00-18-45/round69-kimi-cold-read-ui-results.json`.
- I installed Playwright temporarily under `/tmp/cohabi-pw` and selected `/usr/bin/chromium`; the next execution reached server boot but **failed its ready assertion after 12.451 s**. Evidence: `teams/build/outputs/2026-11-27T00-19-33/round69-kimi-cold-read-ui-browser-results.json`.
- Direct server diagnosis found the actual boot blocker: `Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'dotenv' imported from commons/server.mjs`. Retrying with DeepSeek's existing sharp test hook did not fix that missing ESM dependency and failed the same ready assertion after 12.451 s. Evidence: `teams/build/outputs/2026-11-27T00-19-55/round69-kimi-cold-read-ui-hooked-results.json`.

**No page loaded and no browser assertion ran.** There is no browser-pass, staging, production, or deploy claim. The candidate is syntax-checked but still needs its full-dependency server + Chromium execution by Setu/CI. The temporary npm installation was outside the repository; no dependency or secret was added to the record.
# Build round 69 — Kimi — Printful cold-read Try again UI

Status: in progress. Assigned deliverable: `teams/build/outputs/merch-cold-read-ui.mjs`, a 390×844 signed-in `/label/new` browser regression for the 429 cold-read message, merch shelf, ≥44 px Try again control, and healthy retry.

No UI, browser, retry, staging, or production result is claimed yet. This file will be replaced with measured evidence and limits.

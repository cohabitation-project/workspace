# Round 55 — Kimi: public-page phone overflow

**Status: in progress; no browser result yet.**

Assignment: add `commons/test/pages-phone-overflow.mjs`, boot an isolated Commons with `COMMONS_FAKE_LLM=1`, use the same Chromium discovery as `merch-299-signed-in.mjs`, and measure `/`, `/petition`, `/label`, `/members`, `/jobs`, and `/coop` at 390×844. The check must assert `document.documentElement.scrollWidth <= 390`, print every measured width, skip once if no browser is available, and report the widest element for any overflowing page. This lane is diagnostic only: no CSS will be patched.

## Measurements

Not run yet.

## Limits

No implementation or public CSS change is planned or claimed. A skip is not a pass.

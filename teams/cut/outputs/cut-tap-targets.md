# Cut Job 4 — visible tap targets at 375×812

2026-11-26 · GPT · Tier 2 browser-regression candidate; no product code changed.

## Artifact

`teams/cut/outputs/cut-tap-targets.mjs` is intended for unchanged placement as `commons/test/cut-tap-targets.mjs`. It follows the existing `cut-phone-overflow.mjs` isolated-server/CDP pattern (no Playwright dependency), seeds and signs in a disposable human, opens `/cut/` in headless Chromium at 375×812, waits for fonts and two animation frames, then reports each visible `button`, `a`, `[role=button]` and `input` with its accessible/visible name and bounding-box width×height. A control is SMALL if either dimension is below 44 CSS px; inline anchors inside paragraphs/list items are explicitly exempt. Any other small control fails the test. The candidate prints all measurements and a summary.

## Measured here

- `node --check teams/cut/outputs/cut-tap-targets.mjs`: exit 0.
- Chromium exists at `/usr/bin/chromium`.
- `node --test teams/cut/outputs/cut-tap-targets.mjs`: **1 test, 0 pass, 1 fail**, before Chromium/page navigation. The isolated server never started: captured stderr identifies `ERR_MODULE_NOT_FOUND: Cannot find package 'dotenv' imported from commons/server.mjs` (Node v24.22.3).

This is an environment boot failure, not a tap-target assertion. **No control sizes, count, screenshots, or phone-UI verdict were measured.** The candidate surfaces child-server stderr on boot failure to aid the dependency-complete rerun.

## Next / limits

@Setu: place unchanged and run in the full dependency-complete checkout with Chromium. Capture each control line and summary; any SMALL result is evidence for Ash/design, not a patch by this test. No staging, production, or live claim is made. Geoffrey owns production deploys.

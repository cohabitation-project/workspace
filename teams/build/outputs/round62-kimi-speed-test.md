# Round 62 — Kimi: repair stale cache assertions in `speed.mjs`

## Shipped

Changed **only** `commons/test/speed.mjs`:

- The immutable CSS request now uses the valid build stamp `?v=abc123` and still expects `max-age=31536000, immutable` plus gzip.
- Added the formerly conflated short-stamp case: `?v=abc` must return `no-cache`.
- The unversioned `/static/site.css` case now expects `no-cache`, not the obsolete `max-age=300`.

Final test SHA-256: `3f832efa7e0678e42d224f14370ecb285597c46b544816fe85c942798ad1d6e9`.

## Server rule checked

Read `commons/server.mjs:464-475`. At lines 471-474, only `?v=` values matching `/^[0-9a-z]{6,12}$/` receive the one-year immutable header; JS/CSS with a missing or invalid stamp receives `no-cache`. No server code was changed.

## Measured evidence

- `node --check commons/test/speed.mjs`: **exit 0**.
- `node --test commons/test/speed.mjs`: **exit 1 before any test ran**, because this runner has no `sharp` package (`ERR_MODULE_NOT_FOUND`, imported by `speed.mjs`). Node v24.22.3 reported 0 passed / 1 failed at file load, duration 56.57 ms. This is not a cache-assertion failure and is not a green run.
- Full captured output: `teams/build/outputs/2026-11-26T03-22-24/round62-speed-test-run.json`.

The runner's CI/full dependency checkout must run the real six-test file. No staging, production, or live behavior is claimed.

# Round 61 — Kimi: phone overflow on `/apply`, `/stream`, `/watch`

## Shipped

- `commons/test/pages-phone-overflow-new.mjs`
- SHA-256: `d1cc1da1205e19511624481aa7e2dcab97e13d4597691bfe03b605874431f054`
- 13,172 bytes, 273 lines.

The test follows `pages-phone-overflow-dynamic.mjs`: isolated temporary store, signed-in human seeded before spawn, `ASHRAM_PORT`/`COMMONS_DATA`/fake-LLM/no-spend-poll server environment, CDP Chromium, font readiness, mutation settling, and tolerant cleanup.

For each of **signed-out and signed-in** `/apply`, `/stream`, and `/watch` (six normal loads), it:

1. sets and verifies a 390×844 viewport;
2. prints `page=… auth=… status=… document=… body=…` plus `WIDEST` and up to eight `OVERFLOW` elements;
3. fails if the response is not HTML 200, the viewport changes, or `documentElement.scrollWidth > 390`;
4. inserts a 600 px-wide element past the right edge and requires document scroll width ≥600, removes it, then repeats for the left edge and removes it.

The left mutant temporarily uses an RTL scroll origin because Chromium does not include purely negative left overflow in an LTR document's `scrollWidth`. The test restores both the inline `direction` and the `dir` attribute after every mutant. Normal page measurements happen before either mutant.

## Measured here

- `node --check commons/test/pages-phone-overflow-new.mjs`: **PASS**, exit 0.
- `node --test commons/test/pages-phone-overflow-new.mjs`: **NOT A PAGE RESULT** — exit 1 after 20.14 s because the isolated Commons server did not boot. 0 passed, 1 failed, 0 skipped. No page or Chromium navigation was reached.
- Direct boot diagnosis: Node v24.22.3 exits 1 with `ERR_MODULE_NOT_FOUND: Cannot find package 'dotenv' imported from …/commons/server.mjs`.
- Browser-only mutant sanity probe, using `--dump-dom` at its 500 px minimum inner width (therefore **not** a phone-page measurement): right mutant `root=600`; left mutant under LTR `root=500` despite `left=-100`; left mutant under temporary RTL `root=600`. This is why the final harness uses RTL for the left self-test.

Evidence:

- `teams/build/outputs/2026-11-26T02-17-43/pages-phone-overflow-new-final-check.json`
- `teams/build/outputs/2026-11-26T02-16-25/pages-phone-overflow-new-server-boot.json`
- `teams/build/outputs/2026-11-26T02-17-13/pages-phone-overflow-new-rtl-mutant.json`
- `teams/build/outputs/2026-11-26T02-17-02/pages-phone-overflow-new-left-geometry.json`

## Repair / ownership

No page overflow was measured, so **no smallest CSS repair can honestly be named yet**. The test emits the widest and protruding elements needed to choose one. No page, CSS, server, or other product code changed; if a real run finds overflow, the affected page's author owns that repair and its review.

## Next

@Setu: on a full checkout with dependencies and Chromium, run:

```sh
node --test commons/test/pages-phone-overflow-new.mjs
```

Post all six `page=`/`WIDEST` rows, both `MUTANT … right` and `MUTANT … left` rows per load, and the pass/fail result. Only that run can supply the requested per-page document widths and smallest-repair findings. No staging, production, merge, or live claim is made here.

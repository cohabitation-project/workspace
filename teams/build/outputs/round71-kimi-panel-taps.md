# Round 71 — Kimi — healthy maker-panel tap targets

Status: **candidate corrected and rechecked; syntax/static evidence only; not placed or browser-run here**.

## Current candidate

`teams/build/outputs/merch-panel-tap-targets.mjs` — **13,418 bytes**, SHA-256 **`88599f5ceffa85cd7d820825109bcd49f4714d91f40c990e7de39b4b292529ea`**.

The self-contained Tier-2 candidate uses an isolated server, isolated member/listing data and a healthy fake Printful. It signs in a maker, uploads the test PNG, creates an art listing, and opens `/label/l/<id>/products` at **390×844**. After a successful panel response and visible `#mp-app .cz-stage`, it measures every visible `button, a, [role=button], input, select` inside `#mp-app` and prints `name w×h ok|SMALL`. Every dimension must be at least 44 CSS px, except an inline text control within a `p`/`li`. It also checks document width ≤390, at least one control, no uncaught page errors, and a real fake-Printful product read. JSON and a full-page screenshot are written to `$OUT` (or a temporary directory).

`MERCH_PANEL_TAP_MUTANT=60` raises the same gate to 60 px. Only the tap-target assertion is accepted as `mutant-killed-as-required`; setup, width, page-error and other failures remain failures.

## Record correction in this session

At 2026-11-27T08:10Z the saved source did not match the newest report/results row: the file present was the earlier **13,436-byte** `4b0ff9c7…` version and still recognized `MERCH_PANEL_TAP_MUTANT=threshold60`, although the assigned command is `=60`. The report also contained two conflicting versions. I changed only the mutation environment gate and its source comment, rewrote this report to describe the actual artifact, and corrected the results/checkpoint records. No product or design file was touched.

## Measured here

At 2026-11-27T08:11:26Z, Node **v24.22.3** `node --check` exited **0** with empty stdout/stderr. Ten static checks passed: exact `=60` gate, 44/60 thresholds, 390×844 viewport, required selector, inline exception, width gate, per-control rows, tap-assertion-only mutant classification, CJS Playwright loader, and healthy-stage wait. Machine-readable evidence: `teams/build/outputs/2026-11-27T08-11-26/round71-kimi-panel-taps-recheck.json`.

These are **not behavioral results**. No server boot, browser page, control dimensions, screenshot, normal verdict or mutant execution was obtained on this runner. Repository inspection found no placed `commons/test/merch-panel-tap-targets.mjs` at that time. No merge, staging, production or deploy claim.

## For Setu / CI

Place the exact candidate above as `commons/test/merch-panel-tap-targets.mjs`, then on the dependency-complete Playwright runner:

```sh
node --test commons/test/merch-panel-tap-targets.mjs
MERCH_PANEL_TAP_MUTANT=60 node --test commons/test/merch-panel-tap-targets.mjs
```

Post every control row, document-width result, both JSON files and the screenshot. Normal red on genuine small targets is a finding for **@Aletheia-6**, not something this job patches. The 60 px run must be killed specifically at the tap-target assertion, not during setup. Hands-off `commons/public/merch-*.{js,css}` and all other product files remain unchanged.

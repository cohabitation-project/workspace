# Round 70 — Kimi — real maker panel cold read

## Candidate

`teams/build/outputs/merch-panel-cold-read.mjs` — 13,158 bytes, SHA-256 `329b6114ccc1d5c671a01d19a22a48dcb5f6baccae2e358aefaf50cbfcf53e3d`.

This supersedes the round-69 `/label/new` candidate because the picker moved. Round 69 remains unchanged. No product source was edited and nothing was placed in `commons/test/`.

The Tier 2 candidate is self-contained and can run from its current location or as `commons/test/merch-panel-cold-read.mjs`. It:

1. starts an isolated fake Printful and isolated Commons server with temporary data and one configured tee product;
2. signs in a human maker through `/api/humans`, uploads a real PNG through `/api/images`, and creates one live art listing;
3. installs that session cookie in Playwright Chromium at **390×844** and opens the real `/label/l/:id/products` page;
4. makes every fake `/products/:id` request answer **429**, waits for the real `/merch/panel` response and settled panel, then requires the exact honest message: **“The print partner's products aren't available right now. Try again in a minute.”**;
5. requires panel HTTP 502 with the same error, a visible signed-in maker name, no more than 1 px document overflow, no uncaught page errors, and an observed request to fake product 71;
6. records `retry_button` as a non-fatal observation (`present`, and visibility/disabled state when present), explicitly not demanding a button that the current panel does not implement;
7. saves a full-page screenshot, JSON evidence and server log under `$OUT`.

`MERCH_PANEL_COLD_MUTANT=healthy` changes the fake to return a product, variants, printfiles and template. The same browser flow waits for the healthy `.cz-stage`, then must fail specifically at `cold message assertion`. That expected failure is reported as `mutant-killed-as-required`; any earlier mutant error is rethrown, and an unexpected pass fails the final mutant assertion. **This mutation is encoded, not yet executed.**

## Measured here

- Node: **v24.22.3** (measured).
- `node --check teams/build/outputs/merch-panel-cold-read.mjs`: **exit 0** (measured).
- Direct execution: **0 pass / 1 fail**, before server boot or browser launch: `Playwright is required for this browser test: Cannot find package 'playwright'`. Evidence: `teams/build/outputs/2026-11-27T04-12-11/merch-panel-cold-read-results.json`.
- `/usr/bin/chromium` exists, but there is no repository `node_modules`, Playwright installation or root/Commons package manifest on this runner. A disposable dependency-install retry ended with runner `EACCES: permission denied, rmdir .../.npm/_cacache`; it produced no trustworthy test execution to cite.

Therefore **no page loaded, no screenshot was produced, no cold/width/retry assertion ran, and the healthy mutant was not run**. This is a syntax-checked candidate, not a browser-pass claim.

## Required dependency-complete run

After review, Setu/CI can place and run:

```sh
cp teams/build/outputs/merch-panel-cold-read.mjs commons/test/merch-panel-cold-read.mjs
node --check commons/test/merch-panel-cold-read.mjs
OUT=/tmp/merch-panel-cold node commons/test/merch-panel-cold-read.mjs
OUT=/tmp/merch-panel-healthy MERCH_PANEL_COLD_MUTANT=healthy node commons/test/merch-panel-cold-read.mjs
```

The first run must pass; the second must report `mutant-killed-as-required` by failing the cold-message assertion (not setup). Post the cold screenshot and both JSON results. Do not place merely on the strength of this report.

No staging, production, merge or deploy claim. No live listing, real Printful account, credential, member data or payment is touched by the candidate.

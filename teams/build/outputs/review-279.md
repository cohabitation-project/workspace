# PR #279 review — spend page

**Verdict: NO on head `4ba0bd9300420a6a4ddc350cc734f64e364a3897`** (branch `spend/true-costs`). This is a review of that fetched branch; no source files were changed.

## What I checked

- Read the complete PR patch (both commits) and the branch versions of `commons/lib/spend.mjs`, `commons/lib/pages.mjs` (spend-page delta), `commons/costs.json`, and `commons/test/spend.mjs`.
- Ran the branch's exact test file with the branch `spend.mjs` and `costs.json` in an isolated temporary Node runtime: `node --test test/spend.mjs` — **1 Node test file passed; its 20 printed assertions passed, 0 failed**. This used the actual public branch files and fake API responses; no live API/key was used. The PR description says 23 checks, but the current test file executes 20 `ok()` checks.
- Checked the key path in source: the Anthropic admin key is supplied as `x-api-key` only to the hard-coded `https://api.anthropic.com/v1/organizations/cost_report` URL; the Anthropic API error string redacts `sk-ant-…` patterns. The test checks the Anthropic header and that the snapshot omits the fake key. No Anthropic credential is intentionally included in rendered spend-page content. I did not test a live deployment or real provider API.

## Defect to fix before YES

- **`commons/lib/spend.mjs:96` — stale API data can make the month report say it is complete after a failed refresh.** `pollAnthropic()` retains a prior `month_usd` when a later request errors (`anth = { ...anth, ..., connected: true, error: ... }`), and `poll()` similarly retains the prior OpenRouter key snapshot on failure. `month()` bases `complete` only on non-null amounts and the fixed-cost estimate flag; it ignores the current API error fields. Thus after a successful read followed by a failed read, the page/kin summary can mark the report complete and project from stale readings. Include current API error/fetch validity in `complete` (and ideally make the age/staleness of retained amounts explicit); add a regression test for success-then-failure on each API. The page separately renders errors, but that does not make the completeness flag truthful, particularly for consumers of `month()` / `line()`.

## Other notes / limits

- The server estimate remains explicitly marked as an estimate, and `complete` is false while that estimate exists, as intended.
- Missing Anthropic key is represented as `connected:false` and `month_usd:null`, not a zero; the page shows “not connected” and an em dash.
- The branch test exercises the module and synthetic API handling, not an HTTP/render assertion of `/spend`; the PR page change was reviewed from its diff only.

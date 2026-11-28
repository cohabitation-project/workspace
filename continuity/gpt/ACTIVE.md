# GPT — active checkpoint (2026-11-28 03:20Z)

## Current: Build Round 78 — Tier 1 door patch, claim-answer 401

- Read current Round 78 job row in `teams/build/JOBS.md`; task: expired-session `POST /api/me/agent-claims/:id` must return a sign-in 401 before `operators.answer`, and X4 must require 401.
- Candidate patch: `teams/build/proposed/claim-answer-401.patch` (3,809 bytes, SHA-256 `16f0d1720691aefec3861f5048862fb358e346786ba1c6d80baf55942070b63b`). It adds an early null-actor 401 using the existing GET `/api/me/agent-claims` sign-in sentence and tightens X4 to assert 401, sentence, and waiting claim.
- Patch generated via git diff in scratch, passed `git apply --check`; canonical file was independently hash-checked and applied cleanly to copies of current source. `node --check` passed on both changed files.
- Report/evidence: `teams/build/outputs/round78-gpt-claim-401.md`. Posted summary in the build room (if present below session log).

## Limits / next

- Full `door-session-expiry.mjs` runtime test and guard-reversion mutant were not run. Root has no `package.json` or `node_modules`; one `npm ci` attempt ended with runner EACCES while removing a temporary npm log directory. Do not call this green. Setu is the required Tier 1 second reviewer; ask them to run the test and mutant in a working dependency environment.
- No merge, staging, browser, or live check. Do not alter the proposed patch without review; if Setu requests a change, regenerate and hash exact bytes.

## Carried work

- Round 77 Publishing Desk review fd4d2c5c remains **NO** pending safe rejected-fetch handling, correct shipping-card percentage in the floor, separate fulfillment seller line, and refusal tests. Evidence: `teams/build/outputs/round77-gpt-review-publishing.md`.
- Round 76 price-floor inventory: `teams/build/outputs/round74-gpt-price-floor.md`.
- Round 73 title candidate remains awaiting Ash: `teams/build/proposed/titles-8.patch`, report `teams/build/outputs/round73-gpt-title-patch.md`.

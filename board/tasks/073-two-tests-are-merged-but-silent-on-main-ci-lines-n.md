---
id: 073
title: Two tests are merged but silent on main (CI lines needed) — `.github/` is not writable from a build session
requested_by: DeepSeek
owner_at_creation: Claude (assistant seat)
created: 2026-11-24T14:12:32.310Z
source: teams/build/STANDUP.md
---

## Request

Both files exist on main and pass, but neither is in the long `node --test` step of `.github/workflows/commons-tests.yml`, so after the merge-build-lane job runs them once they never run again.

1. `commons/test/market-ship-to-end-to-end.mjs` (round 48; Printful + Printify + Lulu paid → printer path, 6/6).
2. `commons/test/market-maker-ships-address.mjs` (round 50; maker-shipped order collects no shipping address, 5/5, mutation-checked).

Both are Tier 2 (tests only, no lib edits) and need no keys. Request: add both paths to the `node --test` line in `commons-tests.yml`. Measured evidence: `teams/build/outputs/round50-deepseek-maker-ships-address.md` and `teams/build/outputs/round49-deepseek-lulu-pipe.md`.

## Log (append-only)

- 2026-11-24T14:12:32.310Z · DeepSeek · REQUEST (for Claude (assistant seat))

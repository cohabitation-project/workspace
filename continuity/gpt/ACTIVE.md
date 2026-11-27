# GPT — active checkpoint (2026-11-27 21:19Z)

## Current: Build Round 76 GPT price-floor table — complete, source-checked

- Wrote `teams/build/outputs/round74-gpt-price-floor.md` as the requested five-row table for `merchsets.saveDraft`, `merchsets.approve`, `merchsets.buySpec`, `market.create` and `market.update`.
- Started from the Round 74 evidence in `teams/build/STANDUP.md`, then checked `commons/lib/merchsets.mjs` and sliced `commons/server.mjs` by line range. Confirmed `buySpec` has no floor check: it verifies approved product/options, calculates the price row and returns it.
- Findings: `saveDraft` rejects below floor; `approve`, `buySpec`, and the generic market create/update routes do not contain a Printful-base floor guard. These are source observations, not runtime tests.
- No product code changed; no test run. Job requested the text report only.

## Prior completed / waiting

- Cut readiness UI source check: `teams/cut/outputs/cut-ready-409-ui.md`; result row added to `teams/cut/RESULTS.md`. Candidate 409 maps to generic UI copy; no readiness gate. See prior report for limits.
- Build Round 73 title candidate for Ash: `teams/build/proposed/titles-8.patch`, report `teams/build/outputs/round73-gpt-title-patch.md`. `git apply --check` passed against newer main snapshot. Await Ash's decision; do not apply without acceptance.

## Open / next

- Continue only with the next assigned build-lane job. No new project or design work.
- Round 76 report is complete; no staging, production, browser or runtime behavior was tested.

# Round 51 — GPT export-ready UI follow-up (started)

Assignment: fix the round-50 export-ready UI candidate without regressing the placed Cut tests. Required checks per `teams/cut/JOBS.md`: run `cut-video-wait.test.mjs`, `cut-export-error-propagation.test.mjs`, and my 3-test file individually; all must pass with the candidate, plus the readiness-disable mutant must fail. Save candidate under a new timestamped folder, generate it from `git diff`, and run `git apply --check` in the same call.

## Initial state

- Prior candidate: `teams/cut/outputs/2026-11-28T09-20-49/cut-export-ready-ui.patch` (sha256 `3c0feb17c1bf5bd0c235f28c6773a186c3993989efcfbb4a4f02c25f62e8f009`). The 12:30Z foreman note says it passes its own 3 tests (3/0) but causes regressions in two placed files (7 and 2 failures); not placeable.
- Current sandbox: the supplied `REPO` directory is not a Git worktree (`git rev-parse` returns fatal); Node v24.22.3 is present. Need establish whether required source/tests/dependencies are available before attempting measurements.

## Run / result

Pending. Do not infer or report a test result until a reproducible run completes. No candidate or product source modified yet.

## Limits

No placement, browser, real ffmpeg, staging, production, or live checks claimed. If the required source or Git metadata is absent, document that as a blocker and leave this report as an evidence-backed incomplete handoff.
| gate item | result | evidence |
|---|---|---|
| Assigned base / candidate identity | MEASURED | Fresh public main `c4fc82e92023d664f0fe116595160444f49672c3`; newest complete candidate `teams/cut/outputs/2026-11-28T03-19-23/`; Node v24.22.3. |
| Candidate hashes | MEASURED | Patch SHA-256 `1d365a9f3dacd0c5fe9bf6239fe6de9aaa0e9be5ffbaedd3278c14e48fe2024e`; test SHA-256 `8fbceb78661ec007c8c7c7db361f061bf6928323e4c27a1e1551a3e7d4f73321`. |
| Exact `git apply --check` | **FAIL (rc 1)** | Patch does not apply at `commons/public/cut/cut.js:73`; its first 409 hunk is already represented on current main. |
| Test on main alone | EXPECTED RED: 1 pass / 2 fail | Pending-source and failed-source readiness tests fail; the 409 test already passes. Three top-level tests, no skips/todos. |
| Exact patch + test | NOT RUN | The exact candidate cannot apply cleanly, so there is no honest exact-candidate green run. |
| Remaining UI hunks, diagnostic only | PASS: 3 / 0 | `git apply --reject` applied hunks 2–6 and rejected only the already-present first hunk. This is not a clean candidate application or placement approval. |
| Readiness-disable mutant | EFFECTIVE: 1 pass / 2 fail | Replacing `exportButton.disabled = !sourceReady || exportInProgress;` with `exportButton.disabled = exportInProgress;` makes both readiness tests red; the 409 test stays green. |
| Gate decision | **RETURN FOR REBASE** | The remaining UI behavior is dynamically supported, but the exact supplied patch is stale and must be regenerated before a clean gate/placement yes. |

# Cut round 49 — Kimi independent export-ready UI gate

## What was measured

I ran Setu's 06:30Z Job 4 file-only gate against a fresh clone of public main. The selected candidate is GPT's 03:19:23 rebuild, newer than the complete 00:20:00 pair. No newer complete pair was present when selected.

The exact patch fails `git apply --check` because its first hunk expects the old 400-only `exportFailureMessage` branch. Current main already has the placed 400/409/422/429 behavior, so that hunk is stale. This is an artifact/base mismatch, not a claim that the readiness implementation failed.

Running the unmodified test on main alone gives **1 pass / 2 fail**. The two failures are the expected pending/failed-source disabled-button assertions. The already-placed 409 behavior passes.

For diagnosis only, I used `git apply --reject`: hunk 1 was rejected and hunks 2–6 applied at offset -1. On that explicitly modified diagnostic tree, all **3 / 3** tests passed. Dropping only the readiness term from `syncExportButton` produced **1 pass / 2 fail**, with both readiness tests red. Thus the remaining UI hunks have a real behavioral signal and the readiness mutant has teeth. Neither diagnostic run converts the failed exact-artifact apply check into a pass.

## Harness note

The first attempt copied the test byte-for-byte into `commons/test/`, where its `../../../../commons/public/cut/cut.js` import resolves incorrectly and Node reports `ERR_MODULE_NOT_FOUND`; that one-test load failure was discarded as a harness-placement error, not a product result. The valid runs above execute the unchanged test at its native `teams/cut/outputs/2026-11-28T03-19-23/` path, where the import resolves. The invalid-placement raw log is retained at `teams/cut/outputs/2026-11-28T06-19-46/round49-main-alone.tap` for audit.

## Evidence

- `teams/cut/outputs/2026-11-28T06-20-19/round49-gate-summary.json` — machine-readable base, hashes, apply results, counts and scope.
- `teams/cut/outputs/2026-11-28T06-20-19/round49-main-alone-correct-path.tap`
- `teams/cut/outputs/2026-11-28T06-20-19/round49-diagnostic-remaining-hunks.tap`
- `teams/cut/outputs/2026-11-28T06-20-19/round49-diagnostic-readiness-disable-mutant.tap`
- `teams/cut/outputs/2026-11-28T06-20-19/round49-diagnostic-remaining-hunks.diff` — diagnostic tree only, **not** a replacement candidate.

## Next hand

@GPT should regenerate the one UI patch against then-current main, omitting the already-placed 409 hunk while retaining the test. @Kimi can then rerun the exact clean-apply/red-alone/patched/mutant gate. @Ash's design yes and @Setu's synchronized placement/full `cut*`/`video*` run remain separate requirements; this report supplies neither.

## Limits

Fresh-clone Node/fake-DOM evidence only. No shared-main or `commons/` candidate placement, browser, server boot, staging, production, real ffmpeg, real member data, merge, deploy, or full `cut*`/`video*` suite occurred. The `--reject` and mutant runs are explicitly diagnostic scratch trees.

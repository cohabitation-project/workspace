# Cut round 45 — saved sweep reconciliation

| File | Pass | Fail | Skip | TODO | Tests | Exit | In current Cut CI? |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| `cut-captions-words-insert.mjs` | 9 | 0 | 0 | 0 | 9 | 0 | no |
| `cut-captions-words.mjs` | 4 | 0 | 0 | 0 | 4 | 0 | no |
| `cut-captions.mjs` | 7 | 0 | 0 | 0 | 7 | 0 | no |
| `cut-cleanup.test.mjs` | 6 | 0 | 0 | 0 | 6 | 0 | yes — glob |
| `cut-cover-range.test.mjs` | 8 | 0 | 0 | 0 | 8 | 0 | yes — glob |
| `cut-edit.test.mjs` | 12 | 0 | 1 | 0 | 13 | 0 | yes — glob |
| `cut-effects.mjs` | 11 | 0 | 1 | 0 | 12 | 0 | no |
| `cut-export-body.mjs` | 4 | 0 | 0 | 0 | 4 | 0 | no |
| `cut-export-duration.mjs` | 0 | 0 | 1 | 0 | 1 | 0 | no |
| `cut-export-handoff-live.mjs` | 0 | 0 | 1 | 0 | 1 | 0 | no |
| `cut-failed-ui-live.mjs` | 0 | 0 | 1 | 0 | 1 | 0 | no |
| `cut-handoff.test.mjs` | 8 | 0 | 0 | 0 | 8 | 0 | yes — glob |
| `cut-model.mjs` | 17 | 0 | 0 | 0 | 17 | 0 | no |
| `cut-music-list.test.mjs` | 1 | 1 | 0 | 0 | 2 | 1 | yes — glob |
| `cut-phone-overflow.mjs` | 0 | 1 | 0 | 0 | 1 | 1 | no |
| `cut-render-edit.test.mjs` | 6 | 0 | 2 | 0 | 8 | 0 | yes — glob |
| `cut-render-job.test.mjs` | 10 | 0 | 1 | 0 | 11 | 0 | yes — glob |
| `cut-render-music-fade.mjs` | 0 | 0 | 1 | 0 | 1 | 0 | no |
| `cut-render-plan.mjs` | 33 | 0 | 0 | 0 | 33 | 0 | no |
| `cut-render-real.mjs` | 0 | 0 | 1 | 0 | 1 | 0 | no |
| `cut-render-timeout-orphan.mjs` | 2 | 0 | 0 | 0 | 2 | 0 | no |
| `cut-render-timeout-unlink.mjs` | 5 | 0 | 0 | 0 | 5 | 0 | no |
| `cut-route-http.test.mjs` | 3 | 1 | 0 | 0 | 4 | 1 | yes — glob |
| `cut-route-real.test.mjs` | 6 | 0 | 0 | 0 | 6 | 0 | yes — glob |
| `cut-route-unready.mjs` | 6 | 0 | 0 | 0 | 6 | 0 | no |
| `cut-route.test.mjs` | 15 | 0 | 0 | 0 | 15 | 0 | yes — glob |
| `cut-tap-targets-320.mjs` | 0 | 1 | 0 | 0 | 1 | 1 | no |
| `cut-tap-targets.mjs` | 0 | 1 | 0 | 0 | 1 | 1 | no |
| `cut-timeline.mjs` | 18 | 0 | 0 | 0 | 18 | 0 | yes — named |
| `cut-video-failed-http.mjs` | 0 | 0 | 1 | 0 | 1 | 0 | no |
| `cut-video-noprobe.mjs` | 1 | 0 | 3 | 1 | 5 | 0 | no |
| `cut-video-wait.test.mjs` | 13 | 0 | 0 | 0 | 13 | 0 | yes — glob |
| `cut-videos-mine.test.mjs` | 0 | 1 | 0 | 0 | 1 | 1 | yes — glob |
| `cut-words-to-text.mjs` | 3 | 0 | 0 | 0 | 3 | 0 | no |
| `video-link-card.mjs` | 0 | 1 | 0 | 0 | 1 | 1 | no |
| `video-topics.mjs` | 5 | 0 | 0 | 0 | 5 | 0 | yes — named |
| `videos-delete-mid-convert.test.mjs` | 4 | 0 | 0 | 0 | 4 | 0 | no |

## Result and limits

This completes the file-only reconciliation from the preserved run; **I did not rerun the tests**. Source data: `teams/cut/outputs/2026-11-27T18-24-58/cut-sweep-per-file.json` and its companion TAP/stderr records, from the 2026-11-27 18:24Z sweep on Node v24.22.3.

The row sums and saved aggregate agree: **37 files, 239 tests = 217 pass + 7 fail + 14 skip + 1 TODO; zero cancelled and zero timeouts** (measured, but runner-limited). The seven exit-1 files are `cut-music-list.test.mjs`, `cut-phone-overflow.mjs`, `cut-route-http.test.mjs`, both tap-target files, `cut-videos-mine.test.mjs`, and `video-link-card.mjs`. Their preserved boot records show the runner lacked `dotenv`; these seven boot failures are **not product reds**. The 14 skips leave the real-ffmpeg/browser behaviour unverified, not passed. This report makes no staging, production, real-export, or real-ffmpeg claim.

## Reconcile Claude's 100/104 by filename

Claude's round-43 report describes `cut-*.test.mjs` + the then-new `cut-render-timeout-unlink.mjs` + `video*.test.mjs`, with **104 tests, 100 pass, 0 fail, four statuses not printed**. Applying that file selection to the preserved rows gives exactly 104 tests. The four ffmpeg-dependent, non-pass cases in that selection are:

| File | Number of cases | Status in the preserved 18:24Z data |
| --- | ---: | --- |
| `cut-edit.test.mjs` | 1 | SKIP — no ffmpeg |
| `cut-render-edit.test.mjs` | 2 | SKIP — ffmpeg unavailable |
| `cut-render-job.test.mjs` | 1 | SKIP — no ffmpeg |
| **Total** | **4** | **4 SKIP in this later saved run** |

That reconciles the file set and names the four cases without mixing the two runs' pass/fail outcomes. Claude's original report did not print the four statuses. A later standup note describes them as **3 SKIP + 1 TODO**, but the referenced `cut-sweep-baseline-claude-100-104.json` is absent and no historical raw TAP preserving that split was found. Therefore the 100/104 total and the four filenames are supported; the later 3/1 status split is **not independently evidenced here**. In the 18:24Z data those same four are all SKIP, while three server-boot files turn red from missing `dotenv`; it would be wrong to substitute today's statuses for Claude's historical run.

## The 23 files the current Cut CI step never selects

Current workflow: `.github/workflows/commons-tests.yml`, lines 175–185. It runs `commons/test/cut-*.test.mjs`, then names only `cut-timeline.mjs` and `video-topics.mjs`. Thus 14/37 files are selected (118 tests: 111 pass, 3 fail, 4 skip in the saved data), and **23/37 are not selected** (121 tests: 106 pass, 4 fail, 10 skip, 1 TODO). These are filename-selection findings, not claims that the omitted tests are all safe to enable unchanged.

| Omitted file | Smallest rename that matches `cut-*.test.mjs` |
| --- | --- |
| `cut-captions-words-insert.mjs` | `cut-captions-words-insert.test.mjs` |
| `cut-captions-words.mjs` | `cut-captions-words.test.mjs` |
| `cut-captions.mjs` | `cut-captions.test.mjs` |
| `cut-effects.mjs` | `cut-effects.test.mjs` |
| `cut-export-body.mjs` | `cut-export-body.test.mjs` |
| `cut-export-duration.mjs` | `cut-export-duration.test.mjs` |
| `cut-export-handoff-live.mjs` | `cut-export-handoff-live.test.mjs` |
| `cut-failed-ui-live.mjs` | `cut-failed-ui-live.test.mjs` |
| `cut-model.mjs` | `cut-model.test.mjs` |
| `cut-phone-overflow.mjs` | `cut-phone-overflow.test.mjs` |
| `cut-render-music-fade.mjs` | `cut-render-music-fade.test.mjs` |
| `cut-render-plan.mjs` | `cut-render-plan.test.mjs` |
| `cut-render-real.mjs` | `cut-render-real.test.mjs` |
| `cut-render-timeout-orphan.mjs` | `cut-render-timeout-orphan.test.mjs` |
| `cut-render-timeout-unlink.mjs` | `cut-render-timeout-unlink.test.mjs` |
| `cut-route-unready.mjs` | `cut-route-unready.test.mjs` |
| `cut-tap-targets-320.mjs` | `cut-tap-targets-320.test.mjs` |
| `cut-tap-targets.mjs` | `cut-tap-targets.test.mjs` |
| `cut-video-failed-http.mjs` | `cut-video-failed-http.test.mjs` |
| `cut-video-noprobe.mjs` | `cut-video-noprobe.test.mjs` |
| `cut-words-to-text.mjs` | `cut-words-to-text.test.mjs` |
| `video-link-card.mjs` | `cut-video-link-card.test.mjs` |
| `videos-delete-mid-convert.test.mjs` | `cut-videos-delete-mid-convert.test.mjs` |

**List only: no test was renamed and no CI configuration was changed.** Renames should be reviewed individually: some are real-ffmpeg/browser gated, and the seven boot-red files first need the runner dependency fixed.

## Timeout-unlink header patch

Candidate: `teams/cut/outputs/cut-render-timeout-unlink-header.patch`. It changes only the stale second-line dependency note to describe the actual five server-free fake-child cases. It is unapplied here.

The current `commons/test/cut-render-timeout-unlink.mjs` contains **five `test(...)` declarations**, and the preserved run measured 5/5 pass. It contains no `1..2` string. I therefore did not invent a `1..2` → `1..3` edit that could not apply and would still disagree with the actual five tests. If a numeric TAP-plan fragment exists in another artifact, its owner needs to identify that artifact; it is not the current source header.

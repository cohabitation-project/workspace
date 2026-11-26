# Cut failed-export UI browser check (Job 4, Round 34 test)

**Artifact:** `teams/cut/outputs/cut-failed-ui-live.mjs` (candidate only; intended unchanged placement as `commons/test/cut-failed-ui-live.mjs`). No product source was changed in this check.

## Measured

The provided run log `teams/cut/outputs/2026-11-26T12-20-28/run-main.txt` records one browser test on `/cut/` at **390×844**. A signed-in disposable member opened the editor with `?videoId=`, and the test sent 4,096 bytes of invalid video data through the export/render download flow. Result: **1 test, 1 pass, 0 fail, 0 skipped** (about 2.6 s). The observed toast was `We couldn't prepare this video: We couldn't convert this video.` The result box, its Post link, and any Post link were not visible; the header Export button was visible. Reported document width was 390 px. The screenshot path recorded by the test was `teams/cut/outputs/2026-11-26T12-20-28/cut-failed-ui-live.png`.

This verifies the failure-state assertions in the test's local browser run, not the proposed wording patch: the test passes whether or not that patch is applied. The patch is separately described in `teams/cut/outputs/cut-failed-wording.md`; Ash's product disposition remains open.

## Deviations and limits

- `/cut/` has no file input, so the test navigates with `?videoId=`; invalid bytes enter at the render download rather than through a picker.
- The **Export to Feed** header button is always visible, so it is reported, not asserted hidden. Only the Post box/link are asserted absent.
- The test sets trim end to 2 seconds by hand because headless Chromium may not decode H.264; it does not rely on `loadedmetadata`.
- I did not inspect the screenshot; its existence/path is in the run log. This is a local test result only, not a staging, production, or live-site check.
- Playwright is a global dependency assumed by this candidate and is not in `package.json`. Setu still needs to place/run it in a dependency-complete checkout; Ash's live look remains outstanding.

**Next:** @Setu: place the candidate unchanged as `commons/test/cut-failed-ui-live.mjs` and rerun with Playwright/Chromium available. @Ash: decide whether the separate one-sentence wording patch is wanted. Geoffrey owns any production deploy.

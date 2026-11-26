# Cut failed-video wording: one sentence (Job 4, round 34, Claude)

**Patch:** `teams/cut/outputs/2026-11-26T09-24-47/cut-failed-wording.patch` (git hash-object `222df46b3a9a248aeeab5dbceefbe8e4392db1e4`, 82 lines). Built on main `b161711` (includes the placed failure UI, 2718dbc). `git apply --check` OK on a fresh clone of that commit. (The foreman note named `…/2026-11-26T09-30/…`; run_python saves into a timestamped folder, so it is at the path above.)

## What it does
Today a failed upload reads "We couldn't prepare this video: We couldn't convert this video." (the page's prefix plus the server's own sentence).

`commons/public/cut/cut.js`:
- New exported `failedVideoMessage(reason)`: the server's `reason` alone (trimmed) when it is a non-blank string, otherwise "We couldn't prepare this video."
- Both failure toasts in `handOff` (upload answer says `failed`; own-list poll says `failed`) call it.
- `waitForVideo` no longer invents "conversion failed." when the record has no reason. It returns `reason: ''`, so the page's default sentence shows (the old lowercase fragment would have shown on its own once the prefix is gone).

`commons/test/cut-video-wait.test.mjs`: the two export-flow cases now expect exactly "We couldn't convert this video."; 4 new cases: poll failed with no reason -> default sentence; upload answer failed with no reason -> default; `failedVideoMessage` (trim, blank, undefined, null, number); `waitForVideo` returns `reason: ''` with no reason.

## Measured (Node, clean clone of main, no ffmpeg/ffprobe in this runner, fake DOM only, no browser)
- `node --test commons/test/cut-video-wait.test.mjs`: 11 tests, 11 pass, 0 fail.
- `node --test commons/test/cut-*.test.mjs commons/test/cut-video-noprobe.mjs commons/test/video-topics*.mjs`: 103 tests, 95 pass, 0 fail, 7 skipped, 1 todo.
- **Red on main:** new test file against main's `cut.js`: fails to load (no export `failedVideoMessage`), 1 fail.
- **Mutant (keep the prefix, "…prepare this video: <reason>"):** 8 pass, 3 fail.

## Limits
- Fake DOM; no browser, no live look. Tier 2, Ash may say no; then it isn't placed.
- The 7 skips are the ffmpeg-dependent tests; Setu's environment has ffmpeg.
- Only the maker-facing text changes. Server `reason` strings are unchanged ("We couldn't convert this video.").

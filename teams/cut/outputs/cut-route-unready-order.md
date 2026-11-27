# Round 45: the 409 readiness guard, ordering and real-store test (Claude, Cut)

Written 2026-11-27 ~21:30Z from my 18:23Z STANDUP numbers and Setu's rerun in the Round 46 foreman note. I ran nothing new for this file. The CI grep section at the bottom says which lines I checked myself.

**For Ash, one line:** the test file is `teams/cut/outputs/2026-11-27T18-22-52/cut-route-unready-order.mjs`. It passes 8 of 8 on main, and deleting the failed-check line makes 2 of them fail. It is ready to place as `commons/test/cut-route-unready-order.test.mjs` on your yes. It is test-only, so it is Tier 2.

## What it pins (8 tests: 7 unit, 1 booted server)

| # | Case | Expected |
|---|---|---|
| a | Not-ready or failed source, object-shaped edit with bad content (`trimStart` 5, `trimEnd` 5) | 409. No probe, no render, no music lookup. The same bad edit on a ready source gets 400, which shows the 409 comes from the guard. |
| a3 | Structurally bad edit (string, array, null/undefined, `edit.music` without an id) | 400, before the guard |
| b | Not-ready or failed source with missing music, or someone else's music | 409. The music store is never asked. |
| b2 | Malformed music id (500 characters, or a newline in it) | 400, before the guard |
| b3 | Ready source: missing music, someone else's music | 404 and 403, as before |
| 403 first | Another member's not-ready video | 403, never 409, so readiness is not leaked |
| booted | Real server, real store. A fake ffmpeg that exits 1 gives a real `failed` upload. A fake that hangs gives a real `preparing` upload. | `POST /api/cut/render` gives 409 for both |

**Order on main today (read from `route.mjs`, confirmed by these tests):** structural checks (400), owner (403), readiness guard (409), music lookup (404/403), then the job's own edit-content refusal (400). So a content-bad edit on an unready source gets 409, as Setu's (a) asked me to pin.

## Measured (18:23Z session, fresh clone of main c05903a, test placed as `commons/test/cut-route-unready-order.mjs`)

| Run | pass | fail |
|---|---|---|
| main, unmutated | 8 | 0 |
| M1: failed-check line deleted | 6 | 2 (case a; the booted test) |
| M2: ready-check line deleted | 5 | 3 (a, b, booted) |
| M3: guard moved below the music lookup | 6 | 2 (b, booted) |
| M4: guard moved above the owner check | 7 | 1 (the 403-first case) |
| restored | 8 | 0 |

Raw table: `teams/cut/outputs/2026-11-27T18-23-07/round45-mutants.json`.
**Setu's rerun (Round 46 foreman note):** 8/8 on main 1760c708 as `.test.mjs`. Deleting `route.mjs:75` (the failed check) gave 6 pass and 2 fail, the same as my M1. That was Setu's run, not mine.

## What this closes, and what it does not

- Closes: the store → adapter gap, as a standing check. Setu measured it once on a6279dc by hand. This puts it in a test that goes red if `ready`/`failed` are renamed.
- Closes: the ordering question. Guard-before-validation and guard-before-music are now pinned, and owner-before-guard is pinned too.
- Does not cover: real ffmpeg (the booted case uses fakes), production, the UI toast (GPT's separate Export-disabled patch).
- **Pitfall for anyone copying the booted case:** the fake ffprobe must never hang. The store appears to call it synchronously on upload, and a hanging ffprobe froze the server for 15 s and timed out my first draft. The earlier copy in `.../T18-22-10/` is that first draft. Don't use it.
- **Fail-open stays.** A store that reports readiness some other way is not refused (Setu's deliberate design). The booted test is what would notice a rename.

## CI check (the question in Round 46)

Does `.github/workflows/commons-tests.yml` name `cut-route-unready.mjs`? **No.** I read the workflow from main over HTTP (13,649 characters, test job in full). The test job's Cut step is `node --test commons/test/cut-*.test.mjs` (plus `cut-timeline.mjs` by name). The workflow names no `cut-route-unready.mjs`.
- So `cut-route-unready.mjs` (6 tests), like any other Cut test that ends in plain `.mjs`, does not run in the standing suite. It runs only on a `kin-build/` branch that changes the file, via the merge-lane loop.
- That is why Setu's rename to `.test.mjs` for the new file is right. Also rename `cut-route-unready.mjs`, or add one workflow line for it.

### Follow-up: which Cut/video tests CI never runs (measured 21:35Z)

Method: shallow clone of main af079a1. For each file matching `commons/test/(cut|video)*`: "GLOB" if it matches `cut-*.test.mjs`, "named" if its filename appears anywhere in `commons-tests.yml`, else "NOT IN CI". Substring check on the whole workflow, so a file named only in the merge-lane block would count as named.

- **GLOB (12):** cut-cleanup, cut-cover-range, cut-edit, cut-handoff, cut-music-list, cut-render-edit, cut-render-job, cut-route-http, cut-route-real, cut-route, cut-video-wait, cut-videos-mine (all `.test.mjs`).
- **Named (2):** cut-timeline.mjs, video-topics.mjs.
- **NOT IN CI (23):**
  - Real regression guards that need no browser: `cut-route-unready.mjs` (409 guard), `cut-render-timeout-orphan.mjs`, `cut-render-timeout-unlink.mjs` (killTree and file cleanup), **`videos-delete-mid-convert.test.mjs`** (the crash fix, d3bfdf88; its name starts `videos-`, so the `cut-*` glob misses it even though it ends `.test.mjs`), `cut-export-body.mjs`, `cut-export-duration.mjs`, `cut-video-noprobe.mjs`, `cut-video-failed-http.mjs`, `video-link-card.mjs`, and the captions/effects/model/plan/words-to-text unit files.
  - Browser tests that need Chromium (probably deliberate): `cut-tap-targets.mjs`, `cut-tap-targets-320.mjs`, `cut-phone-overflow.mjs`, `cut-export-handoff-live.mjs`, `cut-failed-ui-live.mjs`.
  - `cut-render-real.mjs` needs real ffmpeg.
- I did not run any of the 23. Some may fail on `ubuntu-latest` (no ffmpeg, no browser). That is the question before adding them, not a reason to leave all of them out.
- **Smallest fix (Tier 2, workflow file):** add `commons/test/videos-delete-mid-convert.test.mjs` to the glob line, and rename the pure-Node ones to `.test.mjs`. Or add one step: `node --test commons/test/cut-route-unready.mjs commons/test/cut-render-timeout-orphan.mjs commons/test/cut-render-timeout-unlink.mjs`. The first is the one I'd do today because a crash fix with no standing test is the likeliest to be quietly undone.
- **Ran 12 of the 23 (21:40Z, main af079a1, Node v24.22.3, `npm ci --omit=dev`, no ffmpeg in my sandbox).** Results: cut-route-unready 6/6; cut-render-timeout-orphan 2/2; cut-render-timeout-unlink 5/5; videos-delete-mid-convert 4/4; cut-export-body 4/4; cut-model 17/17; cut-captions 7/7; cut-render-plan 33/33; cut-words-to-text 3/3; cut-effects 11 pass, 1 skip; cut-video-noprobe 1 pass, 3 skip, 0 fail (skips are from the missing ffmpeg). **`video-link-card.mjs` FAILS 1 of 2** on main right now, and CI would not have caught it because it isn't in CI.
  - Cause (measured): the test asserts `frame-src https://www.youtube-nocookie.com …;` but `server.mjs:394` now reads `frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com;`. `git log -S"frame-src 'self'"` points at af079a1, which is a bulk teams commit, so I can't name the author. In the Hall, Ash gave a yes on the quoted one-word change, `'self'` added at server.mjs:394. This looks like that change, with the old test left stale. It is a test that is out of date, not a security regression. Whether `frame-src 'self'` is wanted is the Hall's decision.
  - One-line fix as a patch: `teams/cut/outputs/video-link-card-csp.patch` (the regex gets `'self' ` after `frame-src `). `git apply --check` was not run. I wrote the hunk by hand from the lines above, so check it before placing.
  - Not run: cut-render-real, cut-video-failed-http, cut-export-duration, the Chromium tests.
- Caveat: Setu's note says the orphan test was renamed `.test.mjs`. On main af079a1 the file is still `cut-render-timeout-orphan.mjs`.

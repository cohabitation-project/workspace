# Cut Job 4, round 33: the /cut/ failure message (Claude)

**Patch:** `teams/cut/outputs/2026-11-26T06-28-52/cut-failed-ui.patch` — `git hash-object` 2796c7a2911aefe637d30646e5d5a68f579a1351.
Base: main 024509a (fresh clone). `git apply --check` on a clean clone of that commit: OK. After applying, blobs: `commons/public/cut/cut.js` 9745b9b6, `commons/test/cut-video-wait.test.mjs` 8df29c1a. Tier 2 (cut.js is a static page script; one test file).

## What it changes (two files only; nothing in videos.mjs, nothing about ffprobe refusal)
`commons/public/cut/cut.js`
- New exported `waitForVideo(id, …)` (near line 53): polls `GET /api/videos?by=me&limit=100` every 1.5 s up to 180 s and returns `{state:'ready'}`, `{state:'failed', reason}` or `{state:'timeout'}`. Reads `failed` and `reason`, the field names main's `videos.mjs` already returns.
- In `handOff` (lines ~313-318): if the upload answer says `failed`, or says `ready:false` and the poll then says failed, the toast is exactly `We couldn't prepare this video: ${reason}` and the function returns before `resultLink.href` / `resultBox.hidden = false`, so there is no Post link and no Export result. Timeout shows "Your video is still being prepared. Check your videos in a minute." A ready video goes on as before.

`commons/test/cut-video-wait.test.mjs` (new): 4 tests of `waitForVideo` (fake fetch + fake sleep) and 3 export-flow tests that drive the shipped `initCutEditor` with a fake DOM and fake fetch: (1) upload `ready:false`, own list `failed:true` → toast is the message, `export-post` href empty, `export-result` still hidden; (2) upload answer itself `failed:true` → same; (3) upload `ready:true` → "Tap Post it", result box shown, href `/social?cut=vid_…` (the success path still works).

## Measured (Node v24.22.3, fresh clone, `npm ci --omit=dev`, COMMONS_FAKE_LLM=1)
- `node --test commons/test/cut-*.test.mjs commons/test/cut-video-noprobe.mjs commons/test/video-topics.mjs`: **99 tests, 91 pass, 0 fail, 7 skipped, 1 todo.** (The skips and the todo are existing tests that need ffmpeg or are the no-ffprobe todo; **ffmpeg and ffprobe are absent in this runner**, `which` printed nothing, so ffmpeg-dependent tests did not run.)
- `node --test commons/test/cut-video-wait.test.mjs`: 7/7 pass.
- Red on main: with main's `cut.js`, the new test file fails to load: `SyntaxError: … does not provide an export named 'waitForVideo'` (pass 0, fail 1). That is a load failure, so it proves absence only.
- Mutant, the wording: change the poll-failure toast back to `done.reason` alone → **1 fail** (the ready:false→failed flow test); 6 pass.
- Mutant, no `saved.failed` branch: the flow test does not fail, it **hangs** (it falls into the 180 s poll with a real sleep, since the fake list is empty). I killed it at the 110 s tool limit, so this mutant is "detected by hang", not by assertion. A faster check would inject a sleep; I did not add one.

## Limits (not claimed)
- Fake DOM and fake fetch only. No browser, no real server, no live site, no real ffmpeg conversion. It does not test that videos.mjs on main actually returns `failed` + `reason` on the upload answer; Setu's HTTP route test (`cut-video-failed-http.mjs`) covers that side.
- **The wording reads doubled.** The server's reason is already "We couldn't convert this video.", so the maker sees "We couldn't prepare this video: We couldn't convert this video." The job fixed the wording; @Ash may want the prefix or the server reason shortened.
- The export-flow tests take about 5 s each file because `showToast` leaves a 5 s timer; harmless but slow.
- `waitForVideo` reads `?by=me&limit=100`; a member with more than 100 newer videos could miss it (the list is newest first, so the export itself is first; low risk, but not tested).
- No Post/Export control on the failed state beyond the existing result box staying hidden; the Export button re-enables (as before), so the maker can retry.

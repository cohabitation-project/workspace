# Cut hand-off browser check (round 18, Claude, 2026-11-24 ~09:20Z)

Question: does edit -> export -> "Post it" -> composer -> post work, and does the preview `<video>` load under the page CSP?

**Setup (all measured, local, not production).** Fresh clone of main 1f9c517; `npm ci --omit=dev`; server booted with `COMMONS_FAKE_LLM=1`, a temp data dir, port 3977. Chromium 

/usr/bin/chromium driven by `playwright-core`, viewport **375x812**. Member signed up through `POST /api/humans`. **Real ffmpeg 9.0.2** (imageio-ffmpeg) rendered the export. **ffprobe was a shell stub** (fixed 320x240, 2 s; it asks ffmpeg whether the file has audio), so probing was not real; the pass proves the wiring, not real ffprobe output.

**Chromium limit.** This Chromium reports `canPlayType` "" for H.264 (and H.264+AAC), "probably" for VP9. So the source fixture was a 2 s silent VP9-in-mp4 clip, and playback of the **exported (H.264) file in the browser could not be measured** here.

## Results

| check | result |
|---|---|
| `/cut/?videoId=<id>` previews the video | **BUG, found and fixed in a patch.** On main the preview `<video>` had no src (`getAttribute('src')` null), so no duration, so trim-end stayed at the HTML default 30. With the one-line fix: src `/videos/<id>`, duration 2, readyState 4, no media error, trim-end 2. |
| Export without a loaded video | 400 `trim 0..30 must lie within 0..2 seconds of the video`. A direct consequence of the bug above (the sliders never learned the length). |
| `POST /api/cut/render` sends `X-Commons` | **Yes.** Last session's 403 was my harness. cut.js sends it on all three POSTs, and main's `cut-handoff.test.mjs` already asserts it. |
| Export -> fetch render -> `POST /api/videos` -> "Post it" link | **Works** (with the fix). Toast "Your edited video is ready. Tap "Post it"." link `/social?cut=vid_…#compose`. |
| "Post it" link size at 375 px | **98.6 x 44 CSS px** (>= 44). |
| Post created carrying the video | **Yes.** `/api/posts` returned one post, text "my edit", `video` = the exported id, `ready: true`, with a poster, alt "hello" (the caption). |
| CSP errors | **None logged** on `/cut/` (preview of /videos/<id> loaded, readyState 4) or on `/social`. Only console error: 404 `/api/label/tracks` (not mounted in this build; the editor handles it and hides the music control). |
| x on the composer video removes it | **NOT MEASURED.** My first look at `/social?cut=…` found no `#c-vid` element (and so no x), 3 s after load, yet the post on the second load did carry the video, so feed.js did set it. Unexplained timing or selector issue in my harness; not shown to be a site bug. |
| Preview of the exported H.264 file in the composer | **NOT MEASURED** (Chromium has no H.264 here). |
| Real ffprobe rotation output vs `parseProbe` | **NOT MEASURED** (stub). |

## Fix

`teams/cut/outputs/2026-11-24T09-21-34/videoid-preview.patch` (1,503 bytes, git blob af11d87e, base main 1f9c517): in `commons/public/cut/cut.js`, `if (source) video.src = source; else if (videoId && VIDEO_ID_RE.test(videoId)) video.src = '/videos/' + videoId;` plus one test in `commons/test/cut-handoff.test.mjs`. Tests: `cut-handoff` + `editor-page` 15/15 pass; with cut.js reverted the new test fails (red-on-old, 5 pass, 1 fail). cut.js is Tier 2 (the editor page, no identity/money); the test file is mine. Needs Setu to apply via the build lane.

## Who links to /cut/ with a videoId?
Nobody yet. The editor's only entry is typing the URL, so the fix matters only once a feed/composer button exists. That button is a design call for Ash/Aletheia-6 (composer is the one form in `commons/public/feed.js`, around the `#c-video` file input).

Screenshots and raw results are beside this file: `teams/cut/outputs/2026-11-24T09-21-34/{editor-375.png,composer-375.png,results.json}`. I could not view the images myself; numbers above come from results.json.

# Cover clamp: live check (Claude, cut seat, round 56, 2026-11-25)

**Verdict (measured, with one limit below): with trim 1→3 and the cover untouched, Export returns 200 on main and 400 on the old cut.js.** The clamp fix (03e9b971) does what it says in a real browser at 390×844.

## What I ran
- Main clone at 34793ec (cut.js last changed in 03e9b97). `npm ci --omit=dev`, server booted with `COMMONS_FAKE_LLM=1`, temp `COMMONS_DATA`, `FFMPEG` = imageio-ffmpeg 9.0.2, `FFPROBE` = the stub from `teams/cut/outputs/2026-11-24T18-23-20/ffprobe-stub.py`.
- `POST /api/humans` (201, cookie kept), `POST /api/videos` with a 6 s VP9+AAC mp4 made by ffmpeg `testsrc`+`sine` (201).
- Playwright + `/usr/bin/chromium`, viewport 390×844, signed in by cookie, opened `/cut/?videoId=<id>`. Set `#trim-end`=3 then `#trim-start`=1 by dispatching `input` events. Did not touch `#cover-scrub`. Clicked `#export-feed`, waited for the `/api/cut/render` response.
- Control: same run with the browser served the previous cut.js (`git show 03e9b97~1:commons/public/cut/cut.js`) through `page.route`.

## Numbers (measured)
| run | cover input before Export | request body | status | response | toast |
|---|---|---|---|---|---|
| main cut.js | 0 | `edit:{trimStart:1,trimEnd:3,coverSec:1}` | **200** | `{ok:true,url:"/cut/cut_7a0f212c5888e233.mp4",seconds:2}` | Your edited video is ready. Tap "Post it". |
| old cut.js (control) | 0 | `edit:{trimStart:1,trimEnd:3,coverSec:0}` | **400** | `coverSec 0 must lie inside the trimmed range 1..3` | same text shown as a toast |

The rendered clip is 2 s for trim 1→3, as expected. No page errors in either run. Screenshots: `teams/cut/outputs/2026-11-25T09-22-03/{new,old}-{before,after}.png`.

## Limit (read this)
Chromium in this sandbox could **not decode the fixture** ("DEMUXER_ERROR_NO_SUPPORTED_STREAMS", probably the AAC audio or the mp4/VP9 pairing). So `#cut-preview` never got its metadata: duration stayed null and the slider max stayed at its default 30. The trim inputs still took 1 and 3 and the cover was still 0, which is exactly the bug's condition, and the request and server answers above are real. What this run did **not** test: the cover scrubber being re-ranged from a real loaded duration. That path is unchanged by the fix and covered at function level by `cut-cover-range.test.mjs` (4/4). If someone wants it closed on a decodable clip, repeat on Geoffrey's browser or with a clip Chromium plays.

**Second attempt, same result (measured).** I rebuilt the fixture as VP9+Opus and VP9 alone. Both play in this Chromium when loaded from a `data:` URL (metadata ok, 6 s). Served through the Commons (`/videos/<id>`) the same Chromium still says "no supported streams", and the upload record stays `ready:false`, `poster:null`, `seconds:null`, with `GET /api/videos/<id>` answering "not found" in my poll (that route may not exist; I did not look). So the blocker is on the sandbox side of serving or of the upload's poster/ready step with my ffmpeg + ffprobe stub, not the fixture codec. I did not chase it (out of calls). The 200/400 pair above repeated exactly on this second video (`cut_d160a668e176c75f.mp4`, 2 s; old cut.js 400), screenshots `teams/cut/outputs/2026-11-25T09-23-43/dec-*.png`.

## Zero-uploads music case (measured, same page, signed-in member with no audio)
- `#music-wrap` has `hidden = true`. Its inner text exists in the DOM ("Music / Choose your music / No music / Music volume") but is not shown, because the wrapper is hidden. So a member with no uploads sees no control and no text. This matches Ash's reading. The hint stays held until the audio picker exists in the new editor's "From Cohabi" tab (Ash, m_mwvkokzx).

## Reproduce
Script: `/tmp/live.js` (sandbox, not kept). GPT's `cover-clamp-live.mjs` was not on main when I started (round 26 note), so I wrote the same flow myself. Everything above is from one run of each case, not repeated.

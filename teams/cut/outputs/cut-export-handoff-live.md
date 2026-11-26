# cut-export-handoff-live: the happy path, seen in a browser (Cut Job 4, round 36, Claude)

Candidate: `teams/cut/outputs/cut-export-handoff-live.mjs` (9,683 bytes; sha256 `022466e29c1164c1949af6f5b44a007f9aa4af1fb7883ffa8a8d6eeafee114ac`; git hash-object `a22d8125`). Setu places it unchanged as `commons/test/cut-export-handoff-live.mjs` (Tier 2, a test only; no product code changed).
Run: `node --test commons/test/cut-export-handoff-live.mjs`. It skips, loudly, when ffmpeg, ffprobe, Playwright or Chromium is missing.

## What it does
Sibling of `commons/test/cut-failed-ui-live.mjs`: same boot, same real 2 s mp4. **Nothing is substituted.**
1. Real server on a temp data dir, signed-in cookie. A real 2 s testsrc mp4 is uploaded and waited on until ready.
2. Playwright opens `/cut/?videoId=<id>` at **375x812**, sets the trim to the real 2 s by hand (headless Chromium may not decode H.264), clicks **Export to Feed**.
3. The real `/api/cut/render` runs. The editor's own hand-off uploads the real render to `POST /api/videos`.
4. The test waits up to 60 s for the "Post it" box, then asserts:
   - render answered 200;
   - the link is visible and reads "Post it";
   - it is **at least 44 px tall**;
   - its href matches `/social?cut=<id>#compose` (the Feed composer, `handoffHref`);
   - the id **is not the source upload's id**, and is one of the member's own videos, ready and not failed;
   - document width is 375 or less.
It prints `post=<href>`, a `toast=... link=WxH docWidth=...` line, and a screenshot path.

## Measured (this session's sandbox: static ffmpeg/ffprobe 7.0.2, Playwright headless Chromium; main 97b52cc)
| run | result |
|---|---|
| the file as saved at the path above | **pass 1/1**, about 3 s. `post=/social?cut=vid_07f0b0415ff73138#compose`, toast "Your edited video is ready. Tap "Post it".", link **99x44**, docWidth 375 |
| mutant A: `resultBox.hidden = false` removed from `handOff` | **fail 0/1**: "the Post it link never became visible within 60s" (link 0x0) |
| mutant B: link built from the source id (`handoffHref(videoId)`) | **fail 0/1**: "Post it carries the ORIGINAL upload id" |
| mutant C: the poll's success branch inverted (`ready` shows the failed toast) | **fail 0/1**: toast "We couldn't prepare this video.", href `/social#compose` |
| no ffmpeg/ffprobe/Chromium on PATH | 1 skipped, 0 failed |

Mutants edited `commons/public/cut/cut.js` in a scratch clone only; it was restored each time (`git status` clean apart from the new test).
Mutant C shows the real server answers the render's upload with `ready:false`, so the test does cross the own-list poll, not only the direct path.
Raw output: `teams/cut/outputs/2026-11-26T15-20-31/run-main.txt`, `teams/cut/outputs/2026-11-26T15-23-59/mutants.txt`. Screenshot: `teams/cut/outputs/2026-11-26T15-24-30/cut-export-handoff-live.png` (I did not look at it).

## Limits
- Playwright is not in `package.json`; the test relies on a global Playwright, as `shots.mjs` and `cut-failed-ui-live.mjs` do.
- The Post it link's 44 px comes from `.export-result a { min-height: 44px }` in cut.css; the test measures it, it does not own it.
- It checks the link's href, not that the Feed composer then opens with the video chosen (that is a separate step of the post flow).
- Local sandbox, not staging or production. Ash's live look at /cut/ is still outstanding.

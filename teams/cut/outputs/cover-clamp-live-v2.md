# Cover-clamp live harness v2

**Deliverable:** updated `teams/cut/outputs/cover-clamp-live.mjs` for a one-command run by a seat with a booted disposable Commons. Use:

```sh
BASE=http://127.0.0.1:PORT FFMPEG=ffmpeg node teams/cut/outputs/cover-clamp-live.mjs
```

`BASE` is required; `FFMPEG` defaults to `ffmpeg`. The runtime also needs Playwright/Chromium as described in the script header. It generates a 6-second test clip, signs up/uploads in one browser context (retaining cookies), and visits `/cut/` at 390×844.

**Changes (line numbers in current file):**
- Lines 73–81 use the selectors Claude's live run exercised (`#trim-end`, then `#trim-start`) and dispatch bubbling `input` events. End comes first because the start slider's maximum follows the current end.
- Lines 82–89 assert trim 1–3 while the cover slider remains at 0 before export.
- Lines 91–99 capture the `/api/cut/render` response/request body, extract `edit.coverSec` and the output filename, then save a screenshot.
- Lines 101–116 require HTTP 200, a `cut_<16 hex>.mp4` name, a reported `coverSec` within 1–3, and a successful GET of the render URL. Stdout has one result line: `status=… coverSec=… file=… screenshot=…`; diagnostics/failure details go to stderr and failure sets exit 1.

**Check actually run here:** `node --check teams/cut/outputs/cover-clamp-live.mjs` exited 0. This session did **not** run the browser script, create the screenshot, or independently verify a render. Claude's earlier separate live run is recorded in `cover-clamp-live.md` and `RESULTS.md`; it reported main 200 versus old code 400, with a served-video decode/ready-state limitation. This harness waits for a decoded preview with duration, so it remains to be run where the browser can decode the uploaded test clip.

## Run by Setu (foreman), 2026-11-25 ~15:40Z — booted main @ fb22f51f
Booted `node commons/server.mjs` (COMMONS_FAKE_LLM=1, temp data dir, ffmpeg + ffprobe on PATH), then
`PLAYWRIGHT_MODULE=/opt/npm-tools/node_modules/playwright/index.js BASE=http://127.0.0.1:4791 node teams/cut/outputs/cover-clamp-live.mjs`:

    status=200 coverSec=1 file=cut_e3c86275d1d6bb39.mp4

So the preview decoded (with a real ffprobe the upload became ready), trim 1→3 was set with the cover untouched, and Export sent the cover clamped into the trim. One fix to the harness, line 41: a CommonJS Playwright loaded through `import()` puts `chromium` on `default`, so it reads `pw.chromium || pw.default?.chromium`. Cover clamp: **closed live** on this run.

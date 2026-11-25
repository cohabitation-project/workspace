# cut-export-duration — Kimi, 2026-11-25

## Deliverable

Candidate: `teams/cut/outputs/cut-export-duration.mjs` (6,732 bytes; SHA-256 `2c56932c06c1d4c6602b76072f7ca3eeff0b11b0fd97af5e51a9aeba4064c736`). Setu should place it unchanged as `commons/test/cut-export-duration.mjs` and run:

```sh
node --test commons/test/cut-export-duration.mjs
```

The test generates a real 4-second H.264 fixture with ffmpeg, boots the real Commons server, uploads the fixture as a signed-in agent, polls `/api/videos?by=me` until ready, POSTs `trimStart:1, trimEnd:3, coverSec:1` to `/api/cut/render`, fetches the returned `/cut/*.mp4`, and measures that file with ffprobe. It requires 2 seconds ±0.1 and also checks the response's `seconds` when present. A pass prints source/export durations, response seconds, tolerance and bytes. Missing ffmpeg or ffprobe produces an explicit skip, not a pass. `FFMPEG` and `FFPROBE` overrides are supported.

## Measured here

- `node --check teams/cut/outputs/cut-export-duration.mjs`: exit 0.
- `COMMONS_ROOT=$PWD/commons node --test teams/cut/outputs/cut-export-duration.mjs`: exit 0; **1 test, 0 passed, 0 failed, 1 skipped**. Skip reason: `real export not run: missing ffmpeg and ffprobe; install it or set FFMPEG/FFPROBE`.
- Evidence: `teams/cut/outputs/2026-11-25T21-16-30/cut-export-duration-check.json`.

## Not measured / next

No real server was booted and no source or exported duration was measured: this runner has neither binary. An attempt to obtain test-only ffmpeg/ffprobe packages ended in the runner's npm-cache `EACCES` cleanup error and yielded no usable result; it is not evidence. There is no export-duration pass or live-site claim. No product code changed.

@Setu owns placement and the real run on a full checkout with ffmpeg and ffprobe. Post the test's `MEASURED ...` line and pass/fail output in the Cut room.

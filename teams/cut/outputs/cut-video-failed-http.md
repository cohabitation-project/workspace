# Cut Job 4, round 34 — failed-conversion HTTP route

2026-11-26 09:30 UTC · Kimi · Tier 2 test candidate; no product code changed.

## Candidate

`teams/cut/outputs/cut-video-failed-http.mjs`

- Bytes: **5,032** (measured)
- SHA-256: `010564733388db1b172b9fee18904df7b33b4dfc535b953b9493cbfce79317b6`
- Intended placement, unchanged: `commons/test/cut-video-failed-http.mjs`
- Full-checkout command: `node --test commons/test/cut-video-failed-http.mjs`

The boot follows the placed `commons/test/cut-export-duration.mjs`: checkout-relative Commons imports, `freePort`, `store.init(dataDir)`, a seeded human member and session cookie before spawn, isolated `COMMONS_DATA`, `ASHRAM_PORT`, `COMMONS_FAKE_LLM=1`, `COMMONS_NO_SPEND_POLL=1`, `CUT_OUT`, `FFMPEG`/`FFPROBE`, and readiness polling on `/api/presence`.

## What the test checks

1. Skips explicitly when `ffmpeg` is missing; `FFMPEG` can override the binary path.
2. Boots an isolated Commons server and uploads exactly **4,096 zero bytes** as `video/mp4`, with a signed-in cookie and `X-Commons: 1`.
3. Requires the upload response to be 201 with an id.
4. Polls `GET /api/videos?by=me` every 100 ms for at most **10 s**, requiring each poll to return HTTP 200.
5. Requires that record to have `failed:true`, not also `ready:true`, and a string `reason` matching `/couldn't convert/i` but not `/ffmpeg|stderr/i`.
6. On success, prints one `MEASURED` line with the public failed/ready state, reason, poll deadline and upload size.

This exercises the actual upload and own-videos HTTP routes. It does not call `listMine` directly.

## Measured here

Node v24.22.3; neither ffmpeg nor ffprobe is on this runner's PATH.

- `node --check teams/cut/outputs/cut-video-failed-http.mjs`: **exit 0**.
- `node --test teams/cut/outputs/cut-video-failed-http.mjs`: **exit 0; 1 test, 0 pass, 0 fail, 1 skipped**, with the explicit missing-ffmpeg reason. The server and route assertions did not run.
- Raw evidence: `teams/cut/outputs/2026-11-26T09-29-31/cut-video-failed-http-check.json`.

An additional harness check used a temporary fake `ffmpeg` (`-version` succeeds; conversion exits 1). It did **not** reach the upload: `/api/presence` never became ready within the boot loop. Direct isolated `node commons/server.mjs` diagnosis exited 1 because package `dotenv` is absent in this runner. These are environment/boot results, not a failed product assertion and not evidence of real conversion behavior:

- `teams/cut/outputs/2026-11-26T09-30-01/cut-video-failed-http-fake-ffmpeg.json`
- `teams/cut/outputs/2026-11-26T09-30-11/cut-video-failed-http-boot-diagnosis.json`

## Limits and handoff

No real ffmpeg conversion, successful HTTP run, browser check, staging check or production check is claimed. @Setu owns unchanged placement and the dependency-complete run with real ffmpeg; only its `MEASURED` line and green test count establish the route contract. Geoffrey owns production deploys.

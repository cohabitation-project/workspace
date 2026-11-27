# Kimi — active checkpoint

Updated 2026-11-27T15:20Z, Cut round 44 (`prod-ffprobe-signal.md`) complete.

## Current state

I took the current Cut row: file-only source interpretation plus unauthenticated, read-only public production GETs; no Cut or Build product code changed.

**For @Ash: NO PUBLIC CONFIRMATION of production Cut export ffprobe; needs staging/operator verification.** Public `/api/posts?limit=100` contained two existing ready videos (`vid_caaac91d610e87ee`, `vid_3babed5c6190deac`), both `ready:true`, `failed:false`, **`seconds:null`**. Public feed HTML renders the first. `/api/videos` returned 401; both public `/api/videos/:id` GETs returned 404, while the supplied server snapshot has no public GET-by-id route. `/cut/` returned a 200 static shell, not a browser/export demonstration. Source reading shows `ready` can be the no-ffmpeg fallback and upload `seconds` is nullable; Cut export invokes ffprobe separately. Therefore I did **not** claim ffprobe is absent or export is broken—only that this public evidence cannot confirm it.

Report: `teams/cut/outputs/prod-ffprobe-signal.md`. Newest-first row added to `teams/cut/RESULTS.md`. Raw evidence:
- `teams/cut/outputs/2026-11-27T15-19-27/prod-ffprobe-public-observations.json`
- `teams/cut/outputs/2026-11-27T15-19-40/prod-ffprobe-feed-discovery.json`
- `teams/cut/outputs/2026-11-27T15-19-56/prod-ffprobe-video-records.json`
- `teams/cut/outputs/2026-11-27T15-20-03/prod-ffprobe-evidence-summary.json`

No login, credentials, uploads, renders, posts, deletes, admin calls, browser, host shell, or production writes. No deployed SHA or real ffprobe/ffmpeg execution was checked.

## Next / open

- @Ash decides whether Cut can proceed; @Setu/operator owns host `ffprobe -version` and a controlled staging export with an owned clip. My public check does not replace those.
- Build round 74 also names Kimi for the shared 328 px tap-target CSS cause (`.feed-btn` min-width vs Setu's `.rl-toast`). I did not start it because the latest Cut foreman note explicitly assigns the Cut row. Next session re-reads current Cut/Build JOBS and RESULTS, desk and rooms, then takes only the then-current assigned row; do not redo round 44.
- Build round 73's four-page 320×568 measurement was attempted previously: `npm ci` failed with runner `EACCES`, local boot stopped at missing `dotenv`, and staging returned HTTP 525. Its RESULTS insertion did not apply. Do not claim those measurements passed.

## Previous work — do not redo

- Cut round 43 readiness-patch source review: `teams/cut/outputs/review-route-ready-409.md`; PASS on source only, no runtime.
- Build round 72 candidate: `teams/build/outputs/market-listing-tap-targets.mjs`, SHA-256 `942c0f0c10755f46f756658a11bd015e80137927cc65318e274c0847d6254931`; static/syntax only.
- Build round 71 candidate: `teams/build/outputs/merch-panel-tap-targets.mjs`, SHA-256 `88599f5ceffa85cd7d820825109bcd49f4714d91f40c990e7de39b4b292529ea`; no browser/live claim.
- Earlier Cut/Build rounds are in team RESULTS. Do not restore superseded artifacts or expectations.

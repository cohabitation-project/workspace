# GPT — active checkpoint (2026-11-27 03:19Z)

## Current: Cut route readiness check — completed read-only report

Assigned check: determine whether `/api/cut` refuses a video whose conversion is still pending, and identify a maker-facing refusal. Read `commons/lib/cut/route.mjs`, `commons/lib/cut/wire.mjs`, and `commons/lib/videos.mjs` in this repository snapshot.

**Finding:** NO explicit readiness refusal. The adapter exposes `owner` and a file path but drops `ready`; `fileFor()` falls back to an existing `.orig` source when converted MP4 is absent; the route checks video existence/ownership but not readiness before probe/render. This is a source-reading conclusion only, not an HTTP/ffmpeg experiment. If both paths are missing, the current route's 404 `no such video` is not a readiness response.

**Shipped:** `teams/cut/outputs/route-unready-source.md` gives the finding, source references, scope/limits, and recommended guard/409 maker message. Added the evidence row to `teams/cut/RESULTS.md`. No source code changed. No server, test, live site, or ffmpeg run.

## Carry forward

- This repo snapshot's git HEAD and deployed SHA were not verified.
- Recommended small follow-up if Ash/Setu wants the gap closed: preserve `ready` through the adapter, add a route guard before probe/render, and test pending/unready versus ready source on an isolated server. Do not claim behavior fixed until a placed test runs.
- Prior pending production live-look packet remains: `teams/cut/outputs/cut-staging-live-look-checklist.md` and `teams/cut/outputs/cut-live-look-v2.md`; Ash owns the authorized production look.

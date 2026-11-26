# Cut video conversion failure: persistent maker-visible state (candidate)

**Patch:** `teams/cut/outputs/2026-11-26T00-23-27/cut-video-failure.patch`
**SHA-1 git blob:** `aa62dc80be239877b7850b33310d4b0e186ed34a`; **bytes:** 5690. This is a proposal patch only, not applied to `commons/` or live.

## Change

When asynchronous ffmpeg conversion exits nonzero, `videos.mjs` marks the upload `failed: true`, stores the generic maker-safe reason `We couldn't convert this video.`, updates the in-memory metadata, and persists the update. `publicVideo` projects `failed` and a present `reason`; `ready` remains false. The existing `GET /api/videos?by=me` route uses the member's `listMine` projection (source-checked), so Cut can distinguish failure from processing when it refreshes the own-videos list. The test harness now captures that list accessor and exits its poll on failure; a former todo is an assertion for the public projection.

## Evidence (measured here)

Node `v24.22.3`. Targeted `node --test --test-name-pattern 'maker sees a failure'` run against a temporary copy of the test, with a controlled fake `FFMPEG` executable that returns success for `-version` and exit 1 for conversion: **base source red** (failure record missing, assertion expected `true`, got `undefined`); **candidate source green, 1 test pass / 0 fail**. The fake binary tests failure-state handling only; it is not real ffmpeg. Test is server-free and invokes `videos.listMine` directly, not an HTTP request. Source check: `commons/server.mjs:906` implements authenticated `GET /api/videos?by=me` by returning `videos.listMine(me.id, ...)`. **Measured:** `git apply --check` returned 0 on an isolated temporary Git repository populated with the exact current `commons/lib/videos.mjs` and `commons/test/cut-video-noprobe.mjs` files.

## Limits / next

Patch not applied or tested in a full checkout; no real ffmpeg, browser, site, or live result. The test checks the same `listMine` projection used by the `/api/videos?by=me` handler, but does not boot the HTTP route. Setu can place/run it, then Cut UI should be tested for waiting and clear failure display. Geoffrey owns production deploy.

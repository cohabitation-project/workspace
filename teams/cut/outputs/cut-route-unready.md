# Cut round 42: a render refuses a source that is not ready (409)

**For Ash, one line:** patch and test written; unpatched 3/6 pass, patched 6/6, three mutants red; the guard is two lines in `route.mjs` and the adapter passes `ready`/`failed` through. Needs your yes (Tier 2). Placed nothing in `commons/` (this seat can't write there).

## What was wrong
`GPT, route-unready-source.md`: `wire.mjs` `videos.get()` returned only `{ owner, path }`, dropping `ready`, and `fileFor()` falls back to the `.orig` file, so a video still converting (or failed) could be probed and rendered. The route had no readiness check.

## The patch
`teams/cut/outputs/2026-11-27T09-19-18/route-ready-409.patch` (git diff format; 2 files, +5/-1 lines of substance):
- `commons/lib/cut/wire.mjs` adapter: `{ owner, path, ready: v.ready, failed: v.failed }`. `v` is `publicVideo(...)`, where `ready: !!v.ready || !ff().ffmpeg` (`videos.mjs:103`), so a server without ffmpeg still counts every video ready.
- `commons/lib/cut/route.mjs`, right after the 403 ownership check (so another member's video state is not leaked), before music, the busy counters, probe and ffmpeg:
  - `failed === true` → **409** "This video could not be prepared. Upload it again."
  - `ready === false` → **409** "This video is still being prepared. Try again when it shows ready." (Ash's sentence.)
- Stores that don't report `ready` (the older fakes in `cut-route.test.mjs`) are not refused: the check is `=== false`, not falsy.

**One thing I added beyond the job, for Ash to keep or drop:** the `failed` branch. Without it a failed video would say "try again when it shows ready", which can never come true (`failed` keeps the `.orig`, so the old code rendered it). Drop that one line and its test if unwanted.

Applies cleanly **standalone** and **on top of** `2026-11-27T06-23-00/wire-killtree.diff` (both checked with `git apply --check`; the two touch different hunks of `wire.mjs`).

## The test
`teams/cut/outputs/2026-11-27T09-19-50/cut-route-unready.mjs` → place as `commons/test/cut-route-unready.mjs`. Unit level, fake stores, no HTTP, no ffmpeg, runs in ms. Six cases:
1. not ready → 409, the maker sentence, probe and render each called 0 times
2. failed → 409 "could not be prepared", render 0
3. ready → 200, render 1
4. store without `ready` (older fakes) → 200
5. another member's not-ready video → still 403
6. through the **real** `makeCutDeps` adapter: pending → 409, same record flipped ready → 200

## Measured (node v24, `node --test`, a copy of the repo's `commons/` lib+test, no server booted)
| run | tests | pass | fail |
|---|---|---|---|
| unpatched | 6 | 3 | 3 (cases 1, 2, 6) |
| patched, standalone | 6 | 6 | 0 |
| patched on top of killtree diff | 6 | 6 | 0 |
| mutant: `ready === false` line removed | 6 | 4 | 2 |
| mutant: `failed` line removed | 6 | 5 | 1 |
| mutant: adapter drops ready/failed | 6 | 5 | 1 |

Neighbours with both patches applied: cut-route.test 15/15, cut-route-real.test 6/6, cut-render-job.test 10 pass 0 fail (the 11th is the known todo), cut-render-edit.test 6/6.

## Not checked
- `cut-route-http.test.mjs` (boots the server): this copy had no `node_modules`; it showed 1 pass / 2 fail, and I did not re-run it unpatched or after `npm ci`. Setu's real-ffmpeg run is the check for it.
- The copy of `commons/` came from the repo snapshot in the sandbox, not a fresh clone of main; `git apply --check` against current main is Setu's step.
- The UI: `cut.js` shows the server's `error` string for a non-OK export; I did not check that a 409 reaches the maker's screen with this text, nor whether the editor already blocks Export on a pending video client-side.
- No production or live behaviour.

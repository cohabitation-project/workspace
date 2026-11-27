# Production ffprobe signal — Cut round 44

**For @Ash: NO PUBLIC CONFIRMATION — needs staging/operator verification.** In the public production data checked, both existing ready videos expose `seconds: null`, not a measured duration. That is not proof that ffprobe is absent or that Cut export fails; it means the requested read-only public signal does **not** establish that Cut's export-time ffprobe is present on the production host.

## Scope and method

At 2026-11-27 15:19–15:20 UTC I made only unauthenticated, read-only **GET** requests to `https://cohabi.org`. I did not log in, upload, render, post, delete, use credentials, call an admin endpoint, or open a shell on production. I also read the relevant route and video-record code in the supplied repository snapshot to interpret the public fields. No product code changed.

## Public production observations (measured)

| Request | Observed response | What it contributes |
|---|---|---|
| `GET /api/videos` | **401**, `{"error":"sign in to see your videos"}` | The member's own video list, including durations, is not publicly readable. |
| `GET /api/posts?limit=100` | **200** JSON; two attached video records were present | Both records say `ready: true`, `failed: false`, and **`seconds: null`**. Neither supplies a positive ffprobe-duration signal. |
| `GET /api/videos/vid_caaac91d610e87ee` | **404**, `{"error":"not found"}` | No public per-id duration was obtained. The supplied `server.mjs` snapshot defines signed-in `GET /api/videos` (list own) but no `GET /api/videos/:id`; therefore this 404 must not be misread as proof that the video itself is absent. |
| `GET /api/videos/vid_3babed5c6190deac` | **404**, `{"error":"not found"}` | Same limitation. |
| `GET /feed/more?tab=everyone` | **200**, 132,517 bytes read; SHA-256 `83d9e44b3623eecd7752a33ad74091d50a971821f5501fff62c643b58ab202e0` | Public HTML really renders `vid_caaac91d610e87ee` in a `<video>` element, so this is an existing publicly visible video rather than an invented test id. |
| `GET /cut/` | **200**, 4,536 bytes read; SHA-256 `8c0cb171c047882152fc94357b380e51994b6ff2cdd581b9dcddb2e7af07cfb3` | This is the static editor shell. Its preview has `data-video-id=""`; the HTML contains no existing `vid_…` id. It does not execute ffprobe or demonstrate Export behavior. |

The two public records were:

- `vid_caaac91d610e87ee`, attached to post `p_b5418ef7f33021` (post timestamp 2026-11-25T21:23:51.448Z): non-null poster path, `ready: true`, `failed: false`, **`seconds: null`**.
- `vid_3babed5c6190deac`, attached to post `p_afb269aa8828ff` (post timestamp 2026-11-16T17:36:48.711Z): non-null poster path, `ready: true`, `failed: false`, **`seconds: null`**.

I did not run a browser, so I make no claim about `/cut/` after JavaScript runs, a signed-in `videoId` load, or an Export click. Those were outside this file-only/public-GET job.

## Why `ready: true` cannot answer the ffprobe question

The supplied snapshot explains the fields:

- `commons/lib/videos.mjs:48–51`: `probeSeconds()` returns `null` when ffprobe is unavailable **or** when parsing its stdout does not yield a finite number.
- `commons/lib/videos.mjs:65–67`: that nullable value is stored as `seconds` at upload.
- `commons/lib/videos.mjs:103`: the public record exposes `seconds: v.seconds ?? null`, and computes `ready` as `!!v.ready || !ff().ffmpeg`. Thus `ready: true` can also be the no-ffmpeg fallback; it is not an ffprobe health check.
- `commons/lib/cut/wire.mjs:34,49–52`: Cut has a **separate export-time** `ffprobe -show_streams -show_format` invocation. An old upload's `seconds` value—even if non-null—would not by itself prove that this separate invocation works on the current host.

A non-null poster is consistent with a conversion/poster workflow having completed, but it does not identify the current ffprobe configuration. Likewise, two historical null durations can have several causes and do not justify a claim that ffprobe is definitely missing.

## Decision and smallest next check

There is **no affirmative public production signal** in this sample. Keep production Cut export marked **unverified**, not “working” and not “proven broken.” The next check needs an operator/staging lane: confirm `ffprobe -version` on the actual host and run one controlled export with an owned test clip on staging, recording the route/probe result. @Ash can use that evidence for the go/no-go; this public check cannot substitute for it.

## Evidence files

- `teams/cut/outputs/2026-11-27T15-19-27/prod-ffprobe-public-observations.json` — initial public responses and targeted source excerpts.
- `teams/cut/outputs/2026-11-27T15-19-40/prod-ffprobe-feed-discovery.json` — public feed/post discovery.
- `teams/cut/outputs/2026-11-27T15-19-56/prod-ffprobe-video-records.json` — per-id responses, public rendered feed, and route excerpts.
- `teams/cut/outputs/2026-11-27T15-20-03/prod-ffprobe-evidence-summary.json` — compact field-level summary and snippets.

**Not checked:** production environment/process list, deployed commit SHA, signed-in `/api/videos?by=me`, browser behavior, a real export, real ffprobe/ffmpeg execution, or any write path.

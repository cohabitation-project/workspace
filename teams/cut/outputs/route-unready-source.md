@Ash — **NO: the render route does not refuse a source merely because it is not `ready`; an original file can proceed to ffmpeg.**

## Read-only answer

`commons/lib/cut/route.mjs:70–72` gets the source and checks only that a video exists and belongs to the member. There is no `ready` check before the probe/render path. `commons/lib/cut/wire.mjs:36–37` adapts the stores to the route using `{ owner, path: f.file }`, without passing `ready`. In `commons/lib/videos.mjs:79–84`, `fileFor()` returns an existing converted MP4, otherwise an existing `.orig` file; it does not gate on readiness. Therefore, for a pending conversion with its original still present, the route obtains a path and can reach render-job/ffmpeg. This is a source-reading conclusion only; I did not boot the server or run ffmpeg.

If the file record or both source files are absent, the current separate guard is `commons/lib/cut/route.mjs:71` (`if (!video) return fail(404, "no such video")`); it is not a readiness guard. The route's available client-facing failure for an unprobeable source is `commons/lib/cut/route.mjs:94`, `could not read that video`, but that is not an explicit pending-conversion response and does not guarantee ffmpeg was avoided in all configurations.

## Smallest readiness refusal

The wire currently drops readiness, so the route cannot test it. The smallest meaningful one-line guard belongs in `commons/lib/cut/wire.mjs` after `const v = videos.get(id), f = videos.fileFor(id);`, before returning the path: `if (v && !v.ready) return null;`. But that makes the existing route report the misleading `no such video` at line 71. Prefer to preserve readiness in the adapter and return an explicit maker-safe response from the route, e.g. `if (video.ready === false) return fail(409, "This video is still being prepared. Try again in a moment.");` before probing or rendering. No patch is proposed or applied here; this is the exact behavior that would close the gap.

**Scope/limits:** read `route.mjs`, `wire.mjs`, and `videos.mjs` in this repository snapshot. No server boot, HTTP request, ffmpeg invocation, test, production/staging check, or source mutation. The snapshot's git HEAD/current deployment was not verified.
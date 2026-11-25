# Why the sandbox upload stayed ready:false, and a loaded-preview clamp re-check

Seat: Claude (cut), round 57. Environment: fresh clone of main @ 500508f, Node 24, real Chromium 157 at 390x844, COMMONS_FAKE_LLM=1. All numbers below are MEASURED in that run unless marked.

## Cause
1. `ready:false` was never a failure. `commons/lib/videos.mjs:53` creates the record with `ready:false` and the POST returns it immediately. `convert()` (:59-67) runs ffmpeg libx264+aac in the background; after the poster step :67 sets `ready:true` and `poster`. With real ffmpeg+ffprobe, polling `/api/videos?by=me` showed `ready:true` plus a poster after 511 ms. The earlier run most likely read the POST response and never polled.
2. `seconds` comes from `probeSeconds` (:34-38), which needs `ffprobe -show_entries format=duration` to print a number. With real ffprobe seconds=6. `convert` does not use ffprobe. (The ffprobe stub from earlier rounds only fakes this probe.)
3. "No supported streams" is the sandbox Chromium, not the server. The converted file is valid h264+yuv420p+aac mp4. In this Chromium `canPlayType` returns "" for H.264/AAC mp4, "probably" for VP9/Opus webm, "probably" for VP8/Vorbis webm. It is a codec-limited build, so the server's output can never play there. This also explains why an earlier VP9 file played from a data: URL but not from /videos/<id>.

## Getting real ffprobe in the sandbox
`pip install static-ffmpeg imageio-ffmpeg`, then `static_ffmpeg.run.get_or_fetch_platform_executables_else_raise()` (downloads ffmpeg/ffprobe n8.0.1 with libx264, aac, vp9, opus). Put ffmpeg+ffprobe on PATH (/tmp/bin). Set `XDG_CACHE_HOME=/tmp/xc` and node subprocess `cwd=/tmp`, otherwise run_python scratch cleanup can hit EACCES on `.cache/fontconfig` and the output is lost.

## Clamp re-check with a loaded preview
Method: `page.route('**/videos/<id>')` fulfils a 6 s VP9/WebM; the server still holds the real h264 file, so Export works on the real thing.
- Preview loaded, duration 6.008.
- `#cover-scrub`, `#trim-start`, `#trim-end` all got max=6.008: the scrubber max follows the clip's real duration.
- Trim 1->3, cover untouched: Export returned 200; request body `{"videoId":...,"edit":{"trimStart":1,"trimEnd":3,"coverSec":1}}`; clip came out 2 s; no page errors.

## Nit (small UI honesty)
After the trim change the `#cover-scrub` DOM value still reads 0 while the request sends coverSec 1. Export is correct, but the control does not show the cover that will be used. For Ash/Setu.

## Consequence for the harness
GPT's `cover-clamp-live.mjs` waits for `readyState>=1` on the served mp4. That cannot pass in this sandbox Chromium (no H.264). Use the route-to-webm trick, or run it where Chromium has proprietary codecs.

## Round 28: what each line does when ffprobe (or ffmpeg) is missing (from code, then run server-free)
Lines are `commons/lib/videos.mjs` on main as read this session. `has()` (:19) memoizes `ffmpeg -version` / `ffprobe -version` exit 0 on first use (`ff()`, :21), from `FFMPEG` / `FFPROBE` env.
- `canProbe` (:17) = ffprobe present. `probeSeconds` (:34-38): no ffprobe -> returns `null` before spawning anything.
- :51-52 `secs = probeSeconds(orig)`; the 2-minute refusal only runs `if (secs != null && ...)`. **No ffprobe = no length cap**: a 125 s clip is accepted silently (measured).
- :53 the record is written with `seconds: secs` (so `null`) and `ready:false`. The POST answer therefore always says ready:false.
- `convert` (:59-67): `if (!ff().ffmpeg) return` (:60) is the only guard; **convert never calls ffprobe**. So ffmpeg-without-ffprobe still converts and flips `ready:true` + `poster` at :67 (measured: converts, ready, served `<id>.mp4`).
- No ffmpeg at all: convert returns at :60, nothing ever sets `ready:true` in the record, but `publicVideo` (:82) reports `ready: !!v.ready || !ff().ffmpeg` = **true at once**, serves the original, no poster, no length (measured).
- **The only way to stay `ready:false` forever is ffmpeg present but failing**: :64 `if (code !== 0) { rmSync(out); return; }` sets nothing, tells nobody, leaves the original served and the record `ready:false`. Measured with 4 KB of junk bytes: accepted, still ready:false after 4 s, no poster, `<id>.orig.mp4` served.
- Consequence for Setu's note ("ready:false was most likely no ffprobe"): by the code, a missing ffprobe cannot cause it. A stub ffprobe that fails `-version` only disables the length cap. If a sandbox upload stays ready:false, suspect a failing or crashing ffmpeg run (code != 0, or the process killed before :67), or a poll that read only the POST body.
- Two findings for Ash/Setu, as `test.todo` in the test: (1) no ffprobe -> no 2-minute limit; (2) a failed conversion is never reported to the maker (no `failed` flag, no 4xx; the Cut preview would wait on `ready` forever).

Test: `teams/cut/outputs/2026-11-25T15-21-49/cut-video-noprobe.mjs` (to land as `commons/test/cut-video-noprobe.mjs`; server-free, imports only `../lib/videos.mjs`, each case in a child node process because of the memoizing). MEASURED run on a copy of main's videos.mjs with ffmpeg 9.0.2 and `FFPROBE=/nonexistent`: 4 pass, 0 fail, 2 todo, 4.4 s. Mutants (on the lib, then restored): failed convert marks ready:true -> junk-bytes case red (pass 3 / fail 1); cap enforced when probe is null (`?? 999`) -> all 4 red. Cases that need ffmpeg skip with a reason when none is on PATH. No edit to `commons/lib/**` or `videos.mjs`.

## Raw files
- `teams/cut/outputs/2026-11-25T12-28-08/out.json`, `ready-preview.png`
- `teams/cut/outputs/2026-11-25T12-28-32/loaded.json`, `loaded-before.png`, `loaded-after.png`

## Limits
One machine, one Chromium build. I did not test a Chromium with H.264. No deploy or merge is claimed.

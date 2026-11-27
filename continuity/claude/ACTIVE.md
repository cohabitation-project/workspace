# Claude — ACTIVE checkpoint (2026-11-27 ~03:25Z, cut seat)

## Done this session
- Answered Ash's two open questions (Cut room m_mwybrrp05q3c6fe0): (1) no uncaughtException/unhandledRejection handler anywhere in repo (main 1f52ed5); (2) Cut export -> /api/videos -> videos.upload -> convert, so the paths apply.
- MEASURED (fake ffmpeg holding its .part open, module-level): deleting a video mid-encode -> renameSync ENOENT -> node exit 1. Any member can crash the Commons this way. Ghost update rows after delete in two other windows.
- Patch + test (not on main, I can't write commons/): `teams/cut/outputs/2026-11-27T03-20-23/videos-guard-resume.diff` (+ videos.patched.mjs), test `teams/cut/outputs/2026-11-27T03-21-20/videos-delete-mid-convert.test.mjs` (0/4 unpatched, 4/4 patched). Report `teams/cut/outputs/cut-video-delete-mid-convert-crash.md`; RESULTS.md row added.
- Earlier: door-return attack matrix (t_1fd66467a4, 20 rows), cut-video-reason-server.md.

## Open
- Setu: place videos.mjs patch + test (code, Tier is Ash/Setu's call); place door-return-attacks.mjs (t_e9c44f6f79).
- Ash: live look still pending; do not delete the A-full test video until ready/failed.
- Not tested: real ffmpeg, DELETE route over HTTP, pm2 restart behaviour, double restart starting two encodes.
- Owed: Round 52 section of round51-claude-token-callsites.md; desk t_ce0829cb04, t_617a54a5f0, t_5ad8ffe1dc; Tier 1 answers #308/#309.

## To the next me
- A fake ffmpeg that doesn't hold its output file open hides the crash (it recreates the .part). Use `exec 3>"$last"` in the shell fake.
- Recipe: clone main to /tmp/M, module probe with FFMPEG/FFPROBE env pointing at a shell script, /usr/local/bin/node, child process per case so crashes show as exit codes. 9 calls to patch+test+report.
# Claude — ACTIVE checkpoint (2026-11-27 ~03:25Z, build seat, round 70)

## Done this session
- Round 70 job: each `/r/:id` chat room gets its own `<title>`. Patch `teams/build/outputs/2026-11-27T03-21-04/server.patch` (two edits in commons/server.mjs, Tier 1). Test `teams/build/outputs/2026-11-27T03-19-58/seo-room-title.mjs` (to be placed at commons/test/). Measured on a clone of main e30e193: test 1/1 green; mutant red; seo-*/agent-connect*/front-door* 80/80. Report `teams/build/outputs/round70-claude-room-title.md`.
- The repo copy of commons/server.mjs in my sandbox had the edits applied too (edit_file worked), so the runner may open a kin-build PR.

## Open
- Setu: review exact SHA (Tier 1), place test if the runner didn't.
- Unchecked: og:title/twitter:title on /r/:id; site-links (needs jsdom).
- Older: door-return-attacks.mjs placement (desk t_e9c44f6f79, Setu); Round 52 section of round51-claude-token-callsites.md; desk t_ce0829cb04, t_617a54a5f0, t_5ad8ffe1dc; Tier 1 answers #308/#309; stalled-panel option a/b/c (Geoffrey).

## To the next me
- $OUT is a new directory on every run_python call: files written to $OUT in one call are only reachable from the repo path teams/build/outputs/<ts>/ in the next. Do clone + patch + test in ONE call.
- Recipe: git clone --depth 20 main to /tmp/M; npm ci --omit=dev in background Popen (HOME=/tmp/home); patch /tmp/M with string replace; node --test in Popen; mutant via cp -r. Whole job took 7 calls.

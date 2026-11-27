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

# Claude — ACTIVE checkpoint, cut seat, round 28 (2026-11-25 ~15:30Z)

## Round 28 job (cut): DONE
- `teams/cut/outputs/video-ready-sandbox.md` finished (round 27 findings + round 28 "ffprobe missing" section, file:line from videos.mjs).
- Test candidate `teams/cut/outputs/2026-11-25T15-21-49/cut-video-noprobe.mjs` (server-free, child process per case): 4 pass, 2 todo; two mutants red. Needs Setu to place it in commons/test/.
- Finding: missing ffprobe can't cause ready:false (convert never uses it). It only disables the 2-minute cap. The only stuck path is ffmpeg present but failing (videos.mjs:64 returns silently).
- RESULTS row added to teams/cut/RESULTS.md.

## Open
- Round 27 cover-scrub nit (DOM value 0 after trim, request sends 1) — for Ash/Setu.
- Desk t_921656d7f1 (submitted); v0.4 WUW privacy review; station-review fixes (t_94a2e3ad0e); Round 52 section of round51-claude-token-callsites.md.
- Music hint waits on Ash's audio picker in the new editor ("From Cohabi").

## To the next me
- Server-free lib test recipe: run_python, `pip install imageio-ffmpeg` (HOME=/tmp/h), copy binary to /tmp/bin/ffmpeg, stage `$REPO/commons/lib/X.mjs` into /tmp/T/commons/lib, test into /tmp/T/commons/test, `node --test` with PATH=/tmp/bin. $OUT changes every run_python call: write the final file to $OUT in the call that makes it.
- Lib modules that memoize env (videos.mjs `ff()`) need a child process per env case.
- Build-seat recipe (from round 57) still works: clone, fetch branch, mutant on code line.
- Wrote the stub/report in call 1 this time; job took 8 calls.

# Claude — ACTIVE checkpoint (2026-11-27 ~12:40Z, cut seat, round 43)

## Done this session
- Round 43 job: parent cleans up a timed-out render's file. Patch `teams/cut/outputs/2026-11-27T12-24-24/timeout-unlink.patch` (on top of wire-killtree.diff), test `cut-render-timeout-unlink.mjs` same folder, report `teams/cut/outputs/cut-render-timeout-unlink.md`, RESULTS row, Cut room note, desk handoff to Setu (place killtree, then this, then 409).
- Measured (fake child, fresh clone main 85090e4): new test 5/5 patched, 1/5 killtree-only; 5 mutants red; cut-route-http 4/4 after npm ci; neighbours pass; 409 patch still applies on top.
- Earlier: route-ready-409 patch + test (Ash's yes pending), wire-killtree.diff, 320 tap test, videos.mjs crash fix merged.

## Open
- Ash: yes/no on killtree, timeout-unlink, 409 (+ failed sentence). Ash's question: detached fork means a dead server leaves the child and its file (sweep is the backstop).
- Not tested: real ffmpeg at 150 s, server death mid-render, production.
- Older: door-return-attacks.mjs placement (t_e9c44f6f79); Round 52 section of round51-claude-token-callsites.md; desk t_ce0829cb04, t_617a54a5f0, t_5ad8ffe1dc; Tier 1 #308/#309.

## To the next me
- Recipe: `git clone --depth 5 https://github.com/cohabitation-project/workspace /tmp/M`, `git apply` earlier diffs, commit, patch, `git diff` to $OUT; `npm ci --omit=dev` in commons takes seconds and cut-route-http then runs. Whole job took 6 calls. Mutants: make them with a string replace, and check the mutant actually changes behaviour (my first "trusts job.outPath" mutant was harmless; the real one makes the parent rm job.outPath).
- Write report, RESULTS row, post and ACTIVE in parallel with the last measurement call.

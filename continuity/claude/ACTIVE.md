# Claude — ACTIVE checkpoint, updated 2026-11-24 ~15:35Z (cut seat, round 20)

## Cut seat round 20 — DONE (patch), waiting for Setu's Tier 1 yes
- Job: build music option A. Patch `teams/cut/outputs/2026-11-24T15-18-04/music-a.patch` (base 372067a, blob 5f861248db9eec3a0d84c531a7cc313da4bb4618, 4 files: server.mjs +2 lines GET /api/cut/music, cut.js:65 URL, cut.html label "Choose your music", test cut-music-list.test.mjs).
- Measured (fresh clone, Node 24.22.3, no ffmpeg): new test 2/2, red on old 0/2, 3 mutants red; applied cut-*+editor-page+live-check 101 run/96 pass/0 fail/5 skip vs base 99/94/0/5.
- RESULTS.md row written (top of table). Not tested: a 200 render with music; 60-row cap; browser.
- Open design call: member with no uploads sees no music control and no hint.
- Stale copy teams/cut/editor/cut.js:58 still has the old URL (untouched).

## Earlier cut work
- Round 19: music-tracks-proposal.md (A now, B per release later, never C). Round 18: browser run + videoid-preview fix (merged e07e6854). Round 17: handoff (merged).
- Not written: entry-point-proposal.md (Aletheia-6 design pending).

## Review seat / Build seat
- Review desk items t_94a2e3ad0e, t_ce0829cb04, t_617a54a5f0 untouched; to review t_2fdf50012e. Build: round 48 ws-session-revoked waiting Setu; round 49 not done.

## To the next me
- Sandbox recipe: `HOME=/tmp git clone --depth 1 https://github.com/cohabitation-project/workspace /tmp/M; npm ci --omit=dev`; edit via python rep() asserting count==1; test with `COMMONS_FAKE_LLM=1 node --test`; red-on-old with `git stash -q` (-u to stash new test); patch with `git add -N newfile; git diff > $OUT/x.patch`; `git apply --check` on a clone of the edited tree. Whole round 20 took 9 calls.
- Real-server test needs only: spawn server.mjs with ASHRAM_PORT, COMMONS_DATA, COMMONS_FAKE_LLM=1, COMMONS_NO_SPEND_POLL=1; sign up via POST /api/humans (x-commons: 1); POST /api/audio {data: base64 of "ID3"+bytes, title}.

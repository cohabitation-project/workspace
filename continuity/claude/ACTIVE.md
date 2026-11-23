# Claude — ACTIVE checkpoint, updated 2026-11-23 ~12:40Z (build seat, round 41)

## Build seat (Geoffrey: door, market, pages, structure, tokens; "no new projects")
- **Round 41 (done):** `commons/test/door-repair-guards.mjs` (moved from teams/review/proposed-tests, rewritten for main). 9 tests pass on main, 15/15 with store-repair-save-fail + door-yes-*. No finding: main has the kind/retired/returning_to guards and the erase rollback, so no test.todo left. Mutation run: dropping returning_to → 3 red, kind → 1 red (case 2b), retired → 1 red (case 3b). One observation pinned in case 5: a retired seat's login link still resolves to the retired record (loginIndex not cleaned; dead end, not a way in). Write-up `teams/build/outputs/round41-claude-repair-guards.md`.
- Round 40: mydata-delete-503-http (merged). Round 39 deleteAccount 503, 38 eraseMember rollback, 37 revoke index.

## Cut seat (separate JOBS in teams/cut/)
- Round 9 done: placement bundle `teams/cut/place/`; 59 tests, 55 pass. Next: GPT reads `route-wire.md`; Setu applies hunk, real render on staging (Tier 1).
- Open: screen (cut.html/js/css) not in bundle; real ffprobe/ffmpeg; no mutation run on route.mjs.

## Open
- Add store-erase-rollback, store-revoke-index, mydata-delete-write-fail, mydata-delete-503-http, door-repair-guards to commons-tests.yml (foreman).
- 3 door tests time out (15 s) in my bare sandbox on main; cause unknown.
- Unwalked: rejoin under old name after a revoke on a live door; production door proof with a fresh agent.
- Unread: Aletheia-6's Spine R0 (c_mws5x43x929599ac), Master Model, Awen's counsel questions.

## To the next me
- Sandbox recipe: `tar` $REPO (minus .git/teams/docs) to /tmp/w; `mkdir src; echo 'export const chat=async()=>({text:""})' > src/llm.js; echo '{"type":"module"}' > package.json; HOME=/tmp/h npm_config_cache=/tmp/npmc npm install express@4 ws dotenv`. One call.
- Mutation check = string-replace the guard in /tmp/w/commons/lib/store.mjs, run, restore. A guard needs its own case where ONLY that guard decides (2b, 3b), not just a case that happens to be ambiguous anyway.
- Write test files first; write_file of commons/ shows up in $REPO at once; run_python can't write into the repo.

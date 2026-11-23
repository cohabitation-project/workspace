# Claude — ACTIVE checkpoint, updated 2026-11-23 ~09:45Z (build seat, round 40)

## Build seat (Geoffrey: door, market, pages, structure, tokens; "no new projects")
- **Round 40 (done):** `commons/test/mydata-delete-503-http.mjs` boots the real server, signs in via `/login/<secret>`, plants a DIRECTORY at `members.json.<child pid>.tmp` (writeAtomic's tmp name) so the erase write throws EISDIR (works as root, no stub), POSTs `/account/delete`. Asserts 503, plain "try again / still open" page, no system text or stack, form still there, session still works (GET /account 200), no deletions.jsonl; control retry finishes with one record. Measured 7/7 with mydata-delete-write-fail; red on old code (500, 3 pass/1 fail). No finding on main. Write-up `teams/build/outputs/round40-claude-delete-503-http.md`.
- Round 39: deleteAccount 503 (mydata.mjs, merged, Setu audited). Round 38 eraseMember rollback, 37 revoke index, earlier store-repair-ambiguous, door-yes-revoked-seat.

## Cut seat (separate JOBS in teams/cut/)
- Round 9 done: placement bundle `teams/cut/place/` (README, build-bundle.py, 14 flat files in `teams/cut/outputs/2026-11-23T06-17-33/`); 59 tests, 55 pass, 0 fail, 4 skipped over fresh main 91962ccb. Next: GPT reads `route-wire.md`; Setu copies the bundle, applies the hunk, real render on staging (Tier 1).
- Open: screen (cut.html/js/css) not in bundle; real ffprobe/ffmpeg on server; no mutation run on route.mjs.

## Open
- Add store-erase-rollback, store-revoke-index, mydata-delete-write-fail, mydata-delete-503-http to commons-tests.yml (foreman).
- Boot repair guards for behaviour B: proposed test `teams/review/proposed-tests/door-repair-guards.mjs`.
- 3 door tests time out (15 s) in my bare sandbox on main; cause unknown.
- Unwalked: rejoin under old name after a revoke on a live door; production door proof with a fresh agent.
- Unread: Aletheia-6's Spine R0 (c_mws5x43x929599ac), Master Model, Awen's counsel questions.

## To the next me
- Sandbox recipe for commons tests: `tar` $REPO (minus .git/teams/docs) to /tmp/w; `mkdir src; echo 'export const chat=async()=>({text:""})' > src/llm.js; echo '{"type":"module"}' > package.json; HOME=/tmp/h npm_config_cache=/tmp/npmc npm install express@4 ws dotenv` (plain `npm ci` has no lockfile; default npm cache is EACCES). Whole thing is 3 calls.
- Red-on-old-code: edit the /tmp/w copy by string slicing, run, restore.
- run_python can't make subfolders in $OUT or write into the repo; keep $OUT flat. `git clone --depth 1 https://github.com/cohabitation-project/workspace /tmp/main` works.
- Write the content argument first. grep `^ℹ (tests|pass|fail|skipped|cancelled)` for totals.

# Claude — ACTIVE checkpoint, build seat, round 52 (2026-11-24 ~21:45Z)

## This session — mostly done, NOT handed in
- Round 52 job: make `commons/test/door-token-callsites.mjs` green.
- Cause of the red control: the Station is invitation-only (`station.mjs` mayEnter), so a live token got 403 even with COMMONS_STATION_ENABLED=1. Fix: seed `<data>/station/grants.json` for both seeded agents. The control now asserts 'open' and the Station case asserts instead of skipping.
- Measured in a fresh clone of main (HOME=/tmp/h, npm ci, my branch's test file fetched with `git fetch origin kin-build/20261124-1823-claude`; the file is NOT in the sandbox REPO): `node --test commons/test/door-token-callsites.mjs` = 13 tests, 13 pass, 0 fail, 0 skipped.
- Mutant: both retired checks removed at `station.mjs:232` (`if (m) member = m` and `if (!member)`) → Station case red, 12/13.
- The fixed test file is only at `/tmp/M/commons/test/door-token-callsites.mjs` in the sandbox. It is NOT yet written to the repo. The sandbox is discarded, so the next session must re-apply the edit (3 small changes, described above).
- `round51-claude-token-callsites.md` now holds my table; its "Round 52" section is still "(to be filled)".

## Open
- Re-apply the grants.json edit to the repo test, write the repo file, run `node --test commons/test/door-token-callsites.mjs commons/test/ws-session-revoked.mjs commons/test/door-*.mjs`, and record the counts in the result file.
- Rejoin question not answered: does `POST /api/rejoin` (`core.rejoinAgent`, server.mjs:2188) leave the old say-link alive? Only `/rejoin/confirm` (server.mjs:2211) rotates `sayHash`. If it does, add a named `test.todo('server.mjs:2211 …')` and tell @Setu (Tier 1 fix).
- Hand in desk t_921656d7f1.
- Still owed from earlier: v0.4 of the WUW privacy review; station-review fixes under desk t_94a2e3ad0e.

## To the next me
- Write the test file into the repo with write_file FIRST: work done only in /tmp is lost.
- Recipe: `export HOME=/tmp/h; git clone --depth 1 https://github.com/cohabitation-project/workspace.git /tmp/M`; `cd commons && npm ci --omit=dev`; `git fetch --depth 5 origin <branch>` then `git show FETCH_HEAD:path`.

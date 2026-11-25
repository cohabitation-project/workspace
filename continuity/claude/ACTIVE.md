# Claude — ACTIVE checkpoint, round 54 cut seat (2026-11-25 ~03:40Z)

## Done this session (all in the repo working tree; nothing merged or deployed)
- Cover-frame bug fixed (GPT round-23 NO): `commons/public/cut/cut.js` now exports `coverInRange` and the Export click uses it. Test `commons/test/cut-cover-range.test.mjs` 4/4; mutant red 3/1; handoff+edit 20 pass/1 skip. Report `teams/cut/outputs/cover-clamp-fix.md`; RESULTS.md row added at top.
- Upload entry point (Ash's step 1): only the HQ room composer 📎 (`hq.js:1407/1435`) uploads audio; none in Cut, studio, feed (by grep, not live).

## Open
- Ash: is a hint "Upload a track to add music" pointing to an HQ room OK, or does audio upload need its own entry point? Hint NOT written until answered.
- Live run still owed at 390x844: trim start 1, cover untouched, Export -> 200; and the zero-uploads music case (is `#music-wrap` hidden, any text).
- GPT to review the cover patch; Setu/lane to merge (Tier 2).
- `core.rejoinAgent` leaves old say-link alive (Tier 1, tell Setu; `door-rejoin-saylink.mjs` holds the todo). MCP rejoin untested.
- 3 door tests time out in sandbox (advice-live, press-yes, return-crash), cause unknown.
- Owed: round51-claude-token-callsites.md "Round 52" section; WUW privacy review v0.4; station-review fixes (desk t_94a2e3ad0e); desk t_921656d7f1 hand-in.

## To the next me
- Sandbox recipe for pure-JS tests: copy `$REPO/commons` to /tmp/M/commons, write /tmp/M/package.json `{"type":"module"}`, `node --test`. No npm needed for tests that import only cut.js/edit.mjs.
- Don't read all of cut.js (15k chars); grep first.
- Write file edits first, report right after the first green run.
# Claude — ACTIVE checkpoint, build seat, round 54 (2026-11-25 ~03:40Z)

## Round 54 job: DONE (in the branch, awaiting lane + Setu's Tier 1 yes)
- `commons/lib/core.mjs` rejoinAgent: `sayHash: null` added with the new tokenHash (an API rejoin now kills the old say-link).
- `commons/test/door-rejoin-saylink.mjs` rewritten: todo removed (real assertion), new case "/rejoin/confirm: old say-link 404, new say-link 200". 6 tests.
- Measured (fresh clone of main, npm ci): saylink file 6/6 fixed; mutant (main's core) 5/6, red line "old say-link answered 201 … REACHED the General Hall"; wider door/agent-connect/welcome set 146/146.
- Result file: `teams/build/outputs/round54-claude-rejoin-say.md`.
- Earlier rounds (52/53): `door-token-callsites.mjs` on main, green (13/13 then).

## Open
- Setu's second yes (Tier 1). Superseded branch `kin-build/20261125-0019-claude` should be dropped.
- Still owed from earlier: v0.4 of the WUW privacy review; station-review fixes under desk t_94a2e3ad0e. Desk t_921656d7f1 hand-in not done.

## To the next me
- In run_python, `$REPO` is a fresh snapshot per call: it sees `write_file`/`edit_file` edits but NOT files written from Python. Write repo files with write_file, then copy `$REPO/...` into the clone and run.
- Recipe: `HOME=/tmp/h git clone --depth 1 https://github.com/cohabitation-project/workspace.git /tmp/M; cd /tmp/M/commons && npm ci --omit=dev`; mutants via `git checkout <file>` in the clone. Grep node output for `^✔|^✖|^ℹ (tests|pass|fail)`.
- Write the result file in call 1 (done this time) and fill it right after the first measurement.

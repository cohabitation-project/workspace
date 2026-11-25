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

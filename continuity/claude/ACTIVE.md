# Claude — ACTIVE checkpoint, updated 2026-11-24 ~03:30Z (build seat, Round 46)

## Build seat (Round 46) — DONE
- `commons/test/door-secret-routes.mjs` (new, test only): reads server.mjs text, collects secret-named :param routes, asserts agentdoor.isSecretPath for each; uncovered = `todo` with server.mjs line. Main: 8 routes found, 0 uncovered (/api/merch/mockups/:key allowlisted, behind marketWriter). 17/17 with door-token-transport; red-on-old (login removed) gives 1 todo.
- Result: `teams/build/outputs/round46-claude-secret-routes.md`. Round 45 file now notes agent-connect-forgiving 404 = sandbox artifact (Setu's Round 8 audit: doesn't reproduce on main).
- Open (foreman): name door-secret-routes.mjs and door-token-transport.mjs in commons-tests.yml if it doesn't glob. I couldn't read .github from the sandbox.

## Review seat (earlier)
- `teams/review/wake-up-write-r1-privacy-review-v0.3.md` done (v0.2 → v0.3 patch). Desk t_c35cb65b18 already submitted.
- Old desk items to me, unstarted: t_94a2e3ad0e consent checklist + recording law (station/CONSENT-CHECKLIST-draft-v1.md, station/RECORDING-LAW.md), t_ce0829cb04 repo audit, t_617a54a5f0 wallet threat model.
- To review: t_2fdf50012e (Gemini's market-withdrawn-listings test; run it for real).

## Cut seat
- Round 13 patch placed; nothing owed.

## To the next me
- Sandbox recipe: cp -r $REPO/commons /tmp/w/commons; /tmp/w/src/llm.js `export const chat=async()=>"";`, package.json {"type":"module"}; `HOME=/tmp/h npm_config_cache=/tmp/npmc npm install express@4 ws dotenv sharp`; COMMONS_FAKE_LLM=1 node --test. run_python can't write the repo (use edit_file/write_file); it CAN run bash via subprocess in one call, so do copy+install+test+mutant in one call. Round 46 took 6 calls.
- Check desk status before desk_submit.
# Claude — ACTIVE checkpoint, updated 2026-11-24 ~03:30Z

## Cut seat (this session, round 17)
- Cut placement is LIVE: `node teams/cut/place/live-check.mjs https://cohabi.org` -> 4/4 PASS (main f5c39e5). cut tests are in commons-tests.yml.
- Found the last Job 4 gap: export threw away the render url; no hand-off to the composer. Wrote `teams/cut/outputs/2026-11-24T03-18-24/handoff.patch` (blob 3daaf121, base f5c39e5, 5 files, tests 76/72/0 fail/4 skip, red-on-old 2 of 4). RESULTS row written.
- Needs: Setu's read (feed.js is shared) + apply + real-ffmpeg export in a browser at 375 px; then confirm /cut -> export -> "Post it" -> composer shows video -> post. Not tested in a browser: preview <video> under the page CSP.
- Open design call (not mine): a button in the feed/composer that opens /cut. Ash/Aletheia-6.
- Open: real ffprobe rotation output vs parseProbe.

## Review seat
- DONE earlier: `teams/review/wake-up-write-r1-privacy-review-v0.3.md`; v0.2; eraseMember rollback d61759c9.
- Old desk items to me, unstarted: t_94a2e3ad0e consent checklist + recording law, t_ce0829cb04 repo audit, t_617a54a5f0 wallet threat model. To review: t_2fdf50012e (Gemini's withdrawn-listings test).

## Build seat
- Round 45 canonical fix `agentdoor.isSecretPath` done; open: agent-connect-forgiving.mjs:62 on exact-SHA checkout; needs Setu's yes.

## To the next me
- Sandbox: `HOME=/tmp git clone --depth 1 https://github.com/cohabitation-project/workspace /tmp/M`, `HOME=/tmp npm_config_cache=/tmp/npmc npm ci --omit=dev`. Edit in /tmp/M with a python `rep()` that asserts the old text appears once, run tests, `git diff > $OUT/x.patch`. run_python can't write the repo; $OUT patch is the deliverable.
- Write RESULTS + ACTIVE right after first green run.

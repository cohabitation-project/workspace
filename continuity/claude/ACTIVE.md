# Claude — ACTIVE checkpoint (2026-11-27 ~06:35Z, build seat, round 71)

## Done this session
- Round 71 job: `commons/test/door-tap-targets-320.mjs` (new, Tier 2). Ran on a clone of main with a booted server + Chromium: RED on 25 real findings; mutant (DOOR320_MUTANT=1) red, 78. Report `teams/build/outputs/round71-claude-door-320.md`; logs `teams/build/outputs/2026-11-27T06-22-28/` and `06-22-36/`. RESULTS.md row added.
- Findings: /door document 369 px (unwrapped `<code>` URLs, door.html:18, no overflow-wrap); agent aside links 15 px tall on every page (agentdoor.mjs:20-27); /join inputs 42.8 / select 39; 4 checkboxes 18-22 px (label not checked). /join, /signin, /signup doc = 320.

## Open
- Setu: place the 320 test as-is (red) or after the /door one-line fix; decide whether the agent aside links are exempt.
- Unchecked: checkbox labels' hit area; production /door width with the real base (cohabi.org); signed-in pages.
- Earlier, still open: door-return-attacks.mjs placement (desk t_e9c44f6f79); Round 52 section of round51-claude-token-callsites.md; desk t_ce0829cb04, t_617a54a5f0, t_5ad8ffe1dc; Tier 1 answers #308/#309; stalled-panel option a/b/c (Geoffrey).
- Room title (round 70) and videos.mjs crash fix already merged by Setu.

## To the next me
- The runner CAN boot the server: shallow clone main to /tmp/M, `npm ci --omit=dev` (2 s, cached), /usr/bin/chromium exists, run with HOME=/tmp/home, no DBUS vars, node at /usr/local/bin/node. The raw-CDP door tests need no playwright. Whole job took 9 calls.
- JOBS.md says "most runners can't boot" — check, don't assume; here it worked.
- Copy the repo test into /tmp/M each call (REPO path), since /tmp persists between run_python calls only sometimes — it did persist here.

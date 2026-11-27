# Claude — ACTIVE checkpoint (2026-11-27 ~18:35Z, build seat, round 75)

## Done this session (round 75 job: /r/general at 320, controls)
- `teams/build/proposed/general-320.patch` (hq.css six one-line rules in the max-width:720px block + pages-tap-targets-320.mjs with /r/general, panel-open and panel-closed states, rail and map flags). Measured on main 30443ac: 36 findings before, 0 after; six mutants red; `git apply --check` rc 0. Exact copy also at teams/build/outputs/2026-11-27T18-22-57/general-320.patch (sha256 1fcb43b3…a1c6). The proposed/ copy was retyped by hand: if sha differs, trust the outputs copy.
- Report: `teams/build/outputs/round75-claude-general-320.md`.
- NOT fixed: 17 of 19 floor-plan (`#map .room-hit`, `.actors`) targets under 44px; a design question (phone rooms list). The test exempts them visibly (MAP lines); `MAP320_STRICT=1` fails them.

## Open
- Setu: place the patch (Tier 2); decide map exemption vs design (Aletheia-6).
- Still owed under t_1fd66467a4: session expiry, steward mint path end to end, join caps, restart mid-sequence, second-IP lockout probe.
- Door council items (A10, A14b, A16), stalled-panel choice a/b/c: Geoffrey/council.
- Older: round51-claude-token-callsites.md Round 52 section; desk t_ce0829cb04, t_617a54a5f0, t_5ad8ffe1dc; Tier 1 #308/#309.

## To the next me
- Recipe: clone main to /tmp/M, `npm ci --omit=dev`, `/usr/local/bin/node --test commons/test/x.mjs` with HOME=/tmp/home; `npm i --no-save playwright-core` works for probes with /usr/bin/chromium. /r/:id serves hq.html and opens the room panel over the page (aria-modal, full width on phones), so measure panel-open and panel-closed separately. Write report/ACTIVE before the last measurement.

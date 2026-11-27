# Claude — ACTIVE checkpoint (2026-11-27 ~21:45Z, Cut seat, round 46)

## Done this session (round 46 job: finish round 45, report only)
- Report: `teams/cut/outputs/cut-route-unready-order.md` (test pins, mutant table, ordering on main, CI check, follow-up).
- RESULTS row prepended in `teams/cut/RESULTS.md`.
- Test file (8 tests): `teams/cut/outputs/2026-11-27T18-22-52/cut-route-unready-order.mjs`. Main c05903a: 8/8, mutants 2/3/2/1 red, restored 8/8. Setu reran 8/8 on 1760c708. NOT placed; waits on Ash's yes (Tier 2, test-only).
- CI grep, measured on main af079a1: workflow doesn't name `cut-route-unready.mjs`. 23 of 37 cut*/video* test files are not in CI (glob is `cut-*.test.mjs`). `videos-delete-mid-convert.test.mjs` (crash fix) is among them.

## Open
- Ash's yes → Setu places the order test as `.test.mjs`; decide the CI step for the 23 (I ran none; some need ffmpeg/Chromium).
- Orphan test still named `cut-render-timeout-orphan.mjs` on main af079a1 (Setu's note said renamed).
- Still owed (Review, t_1fd66467a4): session expiry, steward mint path, join caps, restart mid-sequence, second-IP lockout probe.
- Build seat: general-320 patch (`teams/build/proposed/general-320.patch`) waits on Setu; map targets under 44px are a design question for Aletheia-6.
- Older desk: t_ce0829cb04, t_617a54a5f0, t_5ad8ffe1dc; Tier 1 #308/#309; round51-claude-token-callsites.md Round 52 section.

## To the next me
- Recipe: `git clone --depth 1 https://github.com/cohabitation-project/workspace /tmp/M` (use cwd='/'); `npm ci --omit=dev`; `/usr/local/bin/node --test ...` with HOME=/tmp/home. WRITE THE REPORT IN CALL 1; this time it worked.
# Claude — ACTIVE checkpoint (2026-11-27 ~21:35Z, build seat, round 76)

## Done this session (round 76 job: door session expiry + join caps)
- `commons/test/door-session-expiry.mjs` (2 tests, 28 rows), green on main a6542e6. Patch: `teams/build/outputs/2026-11-27T21-20-49/door-session-expiry.patch` (sha256 1bf0126f…d1a, 11,862 B), `git apply --check` rc 0 on a clean clone. NOT retyped into teams/build/proposed/ (too big to hand-copy safely): Setu takes the outputs copy.
- Six mutants (expiry, revoke, version, signature, per-IP cap, global cap) all red.
- Report: `teams/build/outputs/round76-claude-door-expiry.md`.
- Findings: claim-answer with expired cookie is 403 not 401 (refused, claim stays pending); sign-up cookie is session-only (1 day); no per-operator join cap exists; join caps are in-memory (restart resets); rejoin isn't capped by join cap (C5 observe).

## Open
- Setu: place door-session-expiry.patch (Tier 2 test only).
- Still owed under t_1fd66467a4: steward mint path end to end, restart mid-sequence, second-IP lockout probe, mcp/gpt/link door caps, /oauth/authorize expired cookie.
- Door council items (A10, A14b, A16), stalled-panel choice a/b/c: Geoffrey/council.
- Older: round51-claude-token-callsites.md Round 52 section; desk t_ce0829cb04, t_617a54a5f0, t_5ad8ffe1dc; Tier 1 #308/#309.

## To the next me
- Recipe (6 calls): clone main to /tmp/M, `npm ci --omit=dev`, HOME=/tmp/home, `/usr/local/bin/node --test`. Forge cookies from D/secret.key. Mutate lib via exact-once string replace and restore in the same call. Printed patch output is truncated at the head; verify apply on a fresh clone of origin (not a clone of /tmp/M with untracked files).

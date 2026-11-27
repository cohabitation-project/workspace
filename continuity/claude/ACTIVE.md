# Claude — ACTIVE checkpoint (2026-11-27 ~18:30Z, review seat, round 64)

## Done this session
- Accepted desk t_e9c44f6f79 (door-return-attacks.mjs placed by Setu): identical file, 1/1 on main 3b4b950.
- New test `teams/review/outputs/2026-11-27T18-12-47/door-recovery-attacks.mjs` (14 rows, all pass; mutants "code not consumed" and "any code accepted" red). Report `teams/review/round64-claude-recovery-attack-matrix.md`. Existing recovery tests 11/11 pass.
- Finding: refusal text core.mjs:899 says names are exact (capitals count) but memberByName lowercases. Text-only fix.
- Handoff to Setu to place the test (Tier 2).

## Open
- Still owed under t_1fd66467a4: session expiry, steward mint path end to end, join caps, restart mid-sequence, second-IP lockout probe.
- Door council items (A10, A14b, A16), stalled-panel choice a/b/c: Geoffrey/council.
- Cut: 409 v2 (guard after validation) is on the cut seat; I asked Setu for a file+SHA.
- Older: round51-claude-token-callsites.md Round 52 section; desk t_ce0829cb04, t_617a54a5f0, t_5ad8ffe1dc; Tier 1 #308/#309.

## To the next me
- Recipe: clone main to /tmp/M, `npm ci --omit=dev`, `/usr/local/bin/node --test commons/test/x.mjs` with HOME=/tmp/home. Rate limit hits (429) on rejoin from one IP after ~5 failures; do not assume 403 on replays. Write the report/ACTIVE before the final measurement.

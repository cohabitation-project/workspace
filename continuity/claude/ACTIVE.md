# Claude — ACTIVE checkpoint (2026-11-28 ~00:30Z, build seat, round 77)

## Done this session (round 77 job: Tier 1 review of setu-spend-income @ 35a1e2d9)
- Verdict in `teams/build/outputs/round77-claude-review-spend-income.md`: YES on code (items 1–4); item 5 NO as written (7 of 15 mutants survive in `spend-income.mjs`, incl. P&L income = gross).
- Companion test `teams/build/proposed/spend-income-pl.mjs` (sha256 13a2e90d…f725; authoritative `teams/build/outputs/2026-11-28T00-22-42/`). 4/4 with the original; kills 8 mutants; M15 survives.
- RESULTS row prepended. Notes for Ash/Setu: refunds don't net co-op income, test+live summed, complete:true hardcoded, month by order creation.

## Open
- Setu: place spend-income-pl.mjs with 35a1e2d9 (Tier 2 test); decide on the non-blocking notes.
- Still owed (Review t_1fd66467a4): steward mint path, restart mid-sequence, second-IP lockout, mcp/gpt/link door caps, /oauth/authorize expired cookie.
- Cut seat: 23 cut/video tests not in CI (.github is Geoffrey's); orphan test still named cut-render-timeout-orphan.mjs.
- Build: general-320 map targets under 44px = Aletheia-6 design question.
- Older desk: t_ce0829cb04, t_617a54a5f0, t_5ad8ffe1dc, t_296c15614f (cut export-error candidate restore); Tier 1 #308/#309.

## To the next me
- Recipe (4 calls): clone main to /tmp/M (cwd='/'), `git apply` the diff, `npm ci --omit=dev`, HOME=/tmp/home, COMMONS_NO_SPEND_POLL=1, `/usr/local/bin/node --test`. Mutants via exact-once replace + restore in same call; check uniqueness first (a string in ORDER_STATES matched twice). Write the report in call 1 — worked.

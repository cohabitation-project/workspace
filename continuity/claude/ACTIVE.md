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
# Claude — ACTIVE checkpoint (2026-11-28 ~00:35Z, Cut seat, round 47)

## Done this session (round 47 job: export-error test, rebuilt; desk t_296c15614f claimed)
- Test (rebuild, NOT the 17:11Z file): `teams/cut/outputs/2026-11-28T00-23-17/cut-export-error-propagation.mjs`, SHA-256 0703ea61f9eb4225c609ffea2a2628ebe84c1a15f2917c4d42e24a829d483033.
- Patch (git diff, apply --check rc 0 on main 54a35f0): same folder, `exportFailureMessage-409.patch` (cut.js:76: show `error` for 400/409/422/429, not only 400).
- Measured: main 4 pass/6 fail; patched 10/10; mutants M1 6/4, M2 8/2, M3 8/2, M4 8/2, M5 4/6.
- Report `teams/cut/outputs/cut-export-error-propagation.md`; RESULTS row added.
- Earlier this round (Setu's note): route-unready-order test PLACED on Ash's yes; video-link-card CSP fix placed.

## Open
- Ash's yes → Setu places patch + test together (test is red without the patch). Whether 422/429 should show server text is my design choice; Ash may trim.
- I did not run the full cut*/video* suite on the patched cut.js. Setu should.
- Kimi's static gate should point at the new path/hash, not the 17:11Z path; desk t_296c15614f needs reword.
- GPT's export-ready patch corrupt; the Export-disabled-while-pending part is still undone.
- Still owed (Review, t_1fd66467a4): steward mint path, restart mid-sequence, second-IP lockout probe, mcp/gpt/link caps.
- Older desk: t_ce0829cb04, t_617a54a5f0, t_5ad8ffe1dc; Tier 1 #308/#309.

## To the next me
- Recipe (6 calls): clone to /tmp/M, `npm ci --omit=dev`, HOME=/tmp/home, write test to $OUT in the call that makes it; mutants by exact-once replace + restore in the same call. Never claim a file exists that you did not write: the 17:11Z "export-error" file was never saved.

# Claude — ACTIVE checkpoint, build seat (2026-11-26 ~03:45Z)

## Done this session (build round 62)
- Unsent-order sweep at start-up: one guarded `setTimeout(... checkout.resendUnsent ...)` in the listen callback of `commons/server.mjs`; test `commons/test/merch-resend-boot.mjs` (2 tests). Fresh clone of main c876742: red 1/pass 1 on unchanged server, 2/2 with change; guard-removed and second-call mutants red; merch-resend-unsent + merch-resend-boot + merch-checkout* + agent-connect*: 38/38 pass. Report `teams/build/outputs/round62-claude-resend-boot.md`.
- Earlier: Steward reserved (round 61, lane-merged c461ce01); #307 NO → #311 fixed, my YES at 9f934d5.

## Open
- Setu: Tier 1 second yes on server.mjs change at exact SHA; a booted run with a real unsent order (timer not tested).
- Reviews I owe: #308 closed by Setu; #309 merged — Setu said he'd answer my four panel questions with tests; check.
- Round 52 section of `round51-claude-token-callsites.md`; desk items t_ce0829cb04, t_617a54a5f0, t_1fd66467a4, t_5ad8ffe1dc.

## To the next me
- Clone: `git clone --depth 30 https://github.com/cohabitation-project/workspace.git /tmp/M`, HOME=/tmp/h, npm_config_cache=/tmp/npmc, XDG_CACHE_HOME=/tmp/xc, COMMONS_FAKE_LLM=1, `npm ci --omit=dev` (4 s with cache). The sandbox REPO has no node_modules and no .git: test in /tmp/M. Orders live in `<data>/payments/orders.jsonl`. Budget: edits + a run cost calls; write the report as soon as the first measurement exists.

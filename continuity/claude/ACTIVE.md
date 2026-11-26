# Claude — ACTIVE checkpoint (2026-11-26 ~18:35Z, build seat, round 67)

## Done this session
- Round 67 job (OpenRouter in-flight 402 retry): code + test written and tested, NOT placed because `scripts/` is not writable by kin tools. Files: `teams/build/proposed/openrouter-402-retry/{openrouter-retry.mjs,openrouter-402-retry.mjs}`, diff `teams/build/outputs/2026-11-26T18-23-24/team-agent-openrouter-retry.diff`. Report `teams/build/outputs/round67-claude-402-retry.md`. 10/10 green, mutants A–D red. Board 074 + desk handoff to Setu.

## Open
- Setu: place the three pieces (steps in the report), review first.
- Earlier (review seat): Setu places the two /apply tests (desk t_366f623275); Geoffrey decides stalled-panel option a/b/c (`teams/review/round62-claude-apply-panel-check.md` §3).
- Owed: Round 52 section of round51-claude-token-callsites.md; desk t_ce0829cb04, t_617a54a5f0, t_1fd66467a4, t_5ad8ffe1dc (old); Tier 1 answers #308/#309.

## To the next me
- write_file/edit_file refuse scripts/, ops/, config/, commons/ (the commons/ edits in build lane happen via the runner branch?). Check the first write fails fast, then use teams/build/proposed/ + board_request.
- Pattern that worked: write proposed files with write_file first (they persist and show in $REPO of later run_python calls), then one run_python assembles /tmp/S, patches, diffs to $OUT, runs tests; mutants in a second call. Stub missing npm packages (dotenv) with a fake node_modules dir.
- node --test summary lines start with "ℹ"; define sh() in every run_python call; $OUT is new per call.

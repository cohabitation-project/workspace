# Claude — ACTIVE checkpoint (2026-11-26 ~18:30Z, review seat)

## Done this session (review, round 62 follow-up)
- `teams/review/round62-claude-apply-panel-check.md`: /apply on main 43ddc73. (1) application-http.mjs is 6/7 under COMMONS_FAKE_LLM=1 (server inherits it; kin vote the person in); one-line fix `COMMONS_FAKE_LLM: ''` in spawn env -> 7/7 both ways. Diff at `teams/review/outputs/2026-11-26T18-12-03/application-http-pin-kin-off.diff`. (2) New `teams/review/proposed-tests/application-panel-stall.mjs` 4/4, mutant red. (3) Finding: own agent never votes -> four unanimous votes leave application in review forever; no timeout/expiry export. Human question, not a feature. (4) Correction: admission needs 5 votes incl. own agent + 2 council, not "three yeses".
- Posted in review; desk handoff to Setu to place both tests (Tier 2).

## Open
- Setu: place the two tests; Geoffrey: decide stalled-panel option a/b/c (in report §3).
- Owed: Round 52 section of round51-claude-token-callsites.md; desk t_ce0829cb04 (repo inventory), t_617a54a5f0, t_1fd66467a4, t_5ad8ffe1dc (LayerV clearance, old); Tier 1 answers #308/#309; Setu's second yes on petition-text SHA.
- Earlier this day: cut handoff-live test (cut seat), ourall sync flake test (build seat), wording patch placed.

## To the next me
- Sandbox: `git clone --depth 30` to /tmp/M, `npm ci --omit=dev` in a Popen (done in <60 s); node --test summary lines start with "ℹ". Define sh() in every run_python call. $OUT is new each call, so make the diff and copy in the same call. Write the report BEFORE the final calls; this session it was written in call 9 of 14 and that was fine.
- A unit probe of a module (import, setHooks, init tmp dir) is a fast way to measure behaviour without a server.

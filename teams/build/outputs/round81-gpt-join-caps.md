# Round 81 GPT — join caps (carried into Round 82)

Status: started. I am continuing the assigned Tier 2 test from `teams/build/JOBS.md`, not changing product code.

Required evidence: run the per-IP join-cap case against a disposable local server (cap 2; third join gets 429; roster unchanged), then the global-cap case if the configured proxy trust permits distinct client addresses, and show that `JOINCAP_MUTANT=1` makes the per-IP assertion fail. Record exact commands/results and limitations here.

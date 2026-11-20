# Production deploy gate: predicate fixture, run (Claude, Review, 2026-11-19)

**Verdict in one line:** the gate text now on main (deploy.yml blob `b480d7af0fd51269430b4fdcda4b75ea2199eb10`, fetched from raw.githubusercontent.com main at 18:13 UTC) refuses every PR-only, fork, feature-branch, wrong-SHA, failed-run and non-staged case I modelled, and accepts push-on-main and build-lane dispatch on main. This is a **component check of the gate script against a modelled API**, not a check of GitHub itself or of the server-side `~/bin/deploy-gate.sh`.

This closes the "planned, not run" status I carried in the Review room since 2026-11-19 04:00 UTC. It does NOT close the launch condition: see "Not checked".

## What changed on main since the earlier findings
Three versions of check 2 have been seen in this thread: `484b176f` (head_sha + status only), `60e7385` (adds `branch=main`), and now `b480d7af`. In the current text check 2 is:
`runs?head_sha=$full&branch=main&status=success&per_page=20` then a jq filter keeping runs with `.head_branch == "main"`, `.head_repository.full_name == $GITHUB_REPOSITORY`, and `.event == "push" or "workflow_dispatch"`, counted `>= 1`.
So the **event omission Aletheia-6 raised is closed in text** by an explicit allowlist (push, workflow_dispatch). Whether `workflow_dispatch` should stay allowed is a policy call for Geoffrey: the comment says it is there for the build lane's dispatch after a merge. Case S05 shows it is currently accepted; mutant M12 shows the fixture notices if it is removed.

## Method (measured, by execution)
- `run_fixture.py` extracts the real "Production gate" step from the workflow YAML and runs it **unchanged under bash 5.3 with jq 1.8.1** (the actual `--jq` expressions execute in real jq).
- `gh` and `curl` are stubs (`stub-gh.py`, `stub-curl.py`) fed synthetic JSON per scenario. Two modes:
  - **faithful**: the stub applies GitHub-style query filters (head_sha, branch, status=success).
  - **lax-api**: the stub ignores those query filters, so only the jq/bash side can refuse.
- 20 scenarios (S01-S20), 14 mutants (M1-M14: delete one predicate and see whether any scenario changes outcome).
- Files (all in `teams/review/outputs/2026-11-19T18-15-47/`): `run_fixture.py`, `stub-gh.py`, `stub-curl.py`, `deploy.yml.snapshot` (the exact text tested), `results-v2.json`. Run: `python3 run_fixture.py [deploy.yml]` (needs bash, jq, pyyaml). Earlier exploratory run without S20 is in `outputs/2026-11-19T18-12-46/`.
- Note: the first saved copy of the driver in `outputs/2026-11-19T18-13-28/` and `18-13-39/` is the version before S20 was added; use the 18-15-47 one.

## Results
**Faithful mode: all 19 non-informational scenarios behave as expected (accept 4: S01, S05, S11, S16; refuse 15).** Accepts: push on main + staging live (S01), build-lane dispatch on main (S05), staging not live but an automatic staging deploy run succeeded (S11), abbreviated 7-char SHA (S16). Refuses include: PR-only green (S02), fork PR with head branch `main` (S03), same-repo PR run (S04), schedule event (S06), green for a different SHA (S07), failed run (S08), diverged SHA (S09), no automatic staging run (S12), only a manual-dispatch staging run while live differs (S13), unreachable healthz with no staged run (S14), API error (S15), unknown commit (S17), empty SHA (S18), failed staging run (S19), **same-repo push-event green on a feature branch (S20)**. S10 (SHA behind main) is refused with "not on main (behind)": informational, it means a production redeploy of an older ancestor is refused; I did not decide whether that is wanted.

**lax-api mode:** two expected-by-design differences, S07 and S08: with the API's head_sha and status filters switched off the script passes. That is not a defect in the script, it shows **the script relies on GitHub to apply `head_sha` and `status=success`**; the jq side does not re-check them. If GitHub's filter semantics ever changed, those two would silently stop protecting. Cheap hardening: add `.head_sha == $full and .conclusion == "success"` to the jq select.

**Mutants:** 12 of 14 killed. Two survived, and both are redundancy, not holes:
- **M2** (drop the jq same-repo check): survives because fork runs are already excluded by the event allowlist and `branch=main`. Defence in depth.
- **M4** (drop `&branch=main` from the URL): survives because the jq `.head_branch == "main"` still filters.
- M13 (drop *both* branch predicates) is killed by S20, so each layer is covered by the other. **S20 was added only after the first run showed M13 surviving**: the first scenario set had no feature-branch push case, which is exactly the "PR head commit later merged into main" path I named on 2026-11-19. I am reporting that gap in my own first pass.

## Real-data cross-check (public GitHub API, unauthenticated, 2026-11-19 ~18:12 UTC)
Check 3 relies on `deploy.yml/runs?head_sha=$full&event=workflow_run`. I worried that for a `workflow_run`-triggered run GitHub records the default-branch tip as `head_sha`, not the tested commit. Measured on the 8 newest `workflow_run` deploy runs against the matching `commons-tests.yml` push runs: for the 5 pairs I compared (77c0f9ee, 755b1c23, 3f2dc404, bea281fd, plus the skipped a69432a1) the deploy run's `head_sha` equals the tested commit. The a69432a1 case is a real example: tests failed on push, and the deploy run is `skipped`, so `status=success` excludes it. **Not tested:** the case where several merges land in a minute (the concurrency-cancel case Setu's comment describes), which is where a tip-vs-tested difference would show. Marked unknown.

## Not checked (so the launch condition stays open)
- `~/bin/deploy-gate.sh` on the server (the forced SSH command): unread. The workflow gate and the server gate are separate controls.
- `commons-tests.yml` triggers and path filters: unread. If a path filter skips tests for some pushes, there is no green run for that SHA, and the gate would refuse a legitimate deploy (fails closed, annoying not unsafe).
- The workflow job-level `if`: `workflow_dispatch` is admitted unconditionally; production dispatch is protected by the in-script gate and, per the file comment, by a GitHub Environment required-reviewer setting that I cannot see (admin-only). Not verified.
- Staging "success" proves the deploy workflow succeeded, not that the staging server finished that SHA; check 3's first branch (live healthz equals SHA) does prove it, the second branch does not. Aletheia-6's point stands for the second branch.
- GitHub's own API semantics (does `branch=` match fork PR head branches?) are modelled by my stub, not tested against GitHub. My fork-PR claim from memory is still memory; S03 shows the script refuses it either way because of the event allowlist.

## Suggested small changes (Geoffrey's hands, .github/ is his)
1. Add `.head_sha == "'$full'"`-style and `.conclusion == "success"` re-checks inside the jq select (second layer for S07/S08).
2. Decide and record whether `workflow_dispatch` on main stays in the allowlist (S05/M12).
3. Add `run_fixture.py` to CI (it needs only bash/jq/python): then a future edit to the gate that breaks a case fails a PR.

## Labels
Everything above in "Results" is **measured** (executed, bash + jq, synthetic data). The API-behaviour model is **inferred** from GitHub's documented query parameters. The real-data cross-check is **measured on 5 pairs**. "Not checked" items are **unknown**.

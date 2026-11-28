# Bounded review — deploy queue at `c8e26bb5`

Reviewed exact branch head `c8e26bb5b8d65847a4c7e064f4cb2ca4aded139c` and its `.github/workflows/deploy.yml`. Static review only: no GitHub Actions run, approval, cancellation, merge, or deploy was performed. Exact fetched YAML and main-to-branch diff are retained in `teams/cut/outputs/2026-11-28T15-22-49/`.

**Verdict: NO merge yes yet — the approval/cancellation race is narrowed, not closed.**

1. **Queue property: pass by inspection.** `supersede` has no `needs` and no concurrency block; concurrency is on `deploy` alone. Therefore a waiting/pending deploy job does not hold the deploy-job concurrency queue against the newer run's independent `supersede` job.
2. **Filter property: pass for the selection and re-read.** The list endpoint is queried with `status=waiting`; jq additionally selects only `.id < github.run_id`. There is no `in_progress` item in that selection by construction. The subsequent per-run status re-read also skips anything whose status is not exactly `waiting`.
3. **Race: blocker.** The status re-read and `POST .../actions/runs/$id/cancel` are two separate API operations with no atomic status precondition. Interleaving: re-read returns `waiting` → Geoffrey approves, moving the run to `in_progress` → the already-decided cancel POST can cancel that approved deploy. The comment says the re-read prevents this, but it only reduces the window. `|| echo` after the cancel handles a reported failure; it does not prevent a successful cancellation after approval.

The two requested structural checks are therefore sound, but they do not establish the claimed safety property. Before merge, remove automatic cancellation of production approval waits or replace it with a mechanism whose conditional-cancellation semantics are documented and tested to make this interleaving impossible. A second shell re-read would only narrow the window again, not fix it. This review does not assert that the race occurred; it shows the code permits it.

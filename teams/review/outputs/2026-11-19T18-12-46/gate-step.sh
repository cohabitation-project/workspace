refuse() { echo "::error::REFUSED: $1"; exit 1; }
[ -n "$SHA" ] || refuse "production needs the exact commit id. Copy the sha from https://staging.cohabi.org/healthz."
full="$(gh api "repos/$GITHUB_REPOSITORY/commits/$SHA" --jq .sha 2>/dev/null)" || refuse "no commit $SHA in this repository"
echo "Checking $full"
rel="$(gh api "repos/$GITHUB_REPOSITORY/compare/$full...main" --jq .status)" || refuse "could not compare $full with main"
[[ "$rel" == identical || "$rel" == ahead ]] || refuse "$full is not on main ($rel)"
echo "1. on main: yes ($rel)"
# Only a green test run ON MAIN counts (push, or the build lane's dispatch after a merge). A green run on a
# kin-build branch or a pull request with the same SHA no longer opens production (Aletheia-6, deploy-gate audit, 2026-11-19).
tests="$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/commons-tests.yml/runs?head_sha=$full&branch=main&status=success&per_page=20" --jq '[.workflow_runs[] | select(.head_branch == "main" and .head_repository.full_name == env.GITHUB_REPOSITORY and (.event == "push" or .event == "workflow_dispatch"))] | length')" || refuse "could not read the test runs"
[ "${tests:-0}" -ge 1 ] || refuse "Commons tests have not passed for $full"
echo "2. Commons tests passed for this exact commit: yes"
# On staging: either staging runs it right now, or an automatic staging deploy of exactly it succeeded.
live="$(curl -fsS -m 20 https://staging.cohabi.org/healthz | jq -r .sha 2>/dev/null || true)"
staged="$(gh api "repos/$GITHUB_REPOSITORY/actions/workflows/deploy.yml/runs?head_sha=$full&event=workflow_run&status=success&per_page=1" --jq .total_count 2>/dev/null || echo 0)"
if [ "$live" = "$full" ]; then echo "3. on staging: staging is running it now";
elif [ "${staged:-0}" -ge 1 ]; then echo "3. on staging: deployed there automatically (staging now runs ${live:-unknown})";
else refuse "$full was never deployed to staging (staging runs ${live:-unknown}). Let it reach staging and check it there first."; fi
echo "SHA=$full" >> "$GITHUB_ENV"
echo "### Production gate passed for \`$full\`" >> "$GITHUB_STEP_SUMMARY"
echo "On main · tests passed · was on staging · requested by @$GITHUB_ACTOR" >> "$GITHUB_STEP_SUMMARY"

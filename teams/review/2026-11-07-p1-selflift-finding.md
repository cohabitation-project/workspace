# P1 branch finding: a recovered token can lift its own quarantine (Setu, 2026-11-07 ~10:15 UTC)

**Scope:** real code, branch `fix/rejoin-burn-quarantine` at `d44095e` (NOT on main; checked with
`git merge-base --is-ancestor d44095e origin/main` → no). Run in a throwaway copy with its own data. Not a mock.

**Reproduce:** `git worktree add /tmp/p1 d44095e && ln -s $PWD/node_modules /tmp/p1/node_modules &&
node teams/review/2026-11-07-p1-selflift-repro.mjs /tmp/p1`

**Result (as run):**
1. join → recovery code issued
2. rejoin with the code → 200, quarantined, code burned
3. store purchase with the new token → 403 (quarantine works)
4. same token → POST /api/me/recovery (rotate_recovery) → 200, "Your post-recovery quarantine is lifted."
5. quarantined afterwards → no; the purchase guard no longer blocks (the item id in the script was wrong: 404, not 403)
6. the owner's original code → 403 (burned at step 2)

**Finding:** `rotateOwnRecovery` sets `quarantine: null` in the same write that re-arms recovery (core.mjs ~728) and
needs only the recovered token. Whoever used the code (owner or thief) can end the quarantine in one call; a thief who
does so also holds the only working recovery code. Remaining protection: the @mention note in the Hall at rejoin, and
a steward mint. This is the case Ash held her review for, and matches Aletheia-6's gate rule "token-only clearance denied".

**Smallest fix (not applied; waits on Geoffrey's yes):** rotation re-arms recovery and leaves quarantine on; clearance
moves to a path independent of the recovered token (a steward first; later the witness gate Aletheia-6 is designing).
Add this script as a failing test on the branch first, then the fix. The branch is still an improvement over main,
where one stolen code can be reused forever with no quarantine.

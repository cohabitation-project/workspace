# Round 73 GPT — title patch for Ash

Status: complete, file-only candidate. No product code was changed or applied.

## Patch and validation
- Candidate unified diff: `teams/build/proposed/titles-8.patch`.
- Generated from a fresh shallow clone of `main` at `e211151373124561a761d905b908fe263dc630fb`. Then checked the exact saved patch with `git apply --check` against a separate fresh shallow clone of `main` at `066d349e9f37593a156f0ccceef604cf21ff5d7f`.
- Output: `GIT_APPLY_CHECK_EXIT: 0`; `GIT_APPLY_CHECK_OUTPUT: (no output; exit 0)`. The branch advanced between clone operations; the exact candidate nevertheless applies to the later fresh main snapshot.
- The six pages using the shared `layout()` suffix (`/wishlist`, `/library`, `/join`, `/privacy`, `/terms`, `/tour`) will be titled `<Page> · Cohabi`; `/headquarters` is changed in its static HTML. Listing detail pages use the new `titleSuffix: 'Cohabi'` override, while other market pages retain `· Cohabi Market`.
- Note for Ash: changing the shared `layout()` suffix also changes the suffix on any other page rendered through that helper, not just the six mapped routes. This is a source-level consequence to accept or revise before applying.

## Exact validation output
```text
GIT_APPLY_CHECK_EXIT: 0
GIT_APPLY_CHECK_OUTPUT: (no output; exit 0)
```

This proves the patch applies cleanly to the fresh main clone used for the check. No application, test, browser, staging, or live behavior was checked.

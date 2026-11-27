# Cut sweep reconciliation — round 45

**Status: in progress; no result yet.** Scope is the current Cut assignment only: run the `cut-*` / `video*` test sweep on main, give a count for every file, reconcile Claude's earlier 100/104 count by filename, and supply a one-line patch for the stale timeout-unlink header. No product code has been changed and no production claim is being made.

Command to run from the repository root:

```sh
node --test commons/test/cut-*.mjs commons/test/video*.mjs
```

The completed per-file TAP accounting, baseline comparison, and patch evidence will be appended below after the run.

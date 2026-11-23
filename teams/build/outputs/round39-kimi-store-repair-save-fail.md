# Round 39 — boot repair save failure

Status: complete, green on fresh `main`; test file only.

## Deliverable

Added `commons/test/store-repair-save-fail.mjs`. It creates a fresh temporary data directory with two live agents sharing one token hash, then checks the whole requested sequence:

1. The first `store.init()` has its `members.json` rename forced to fail. Init does not throw, the failed write is logged, neither claimant resolves by the shared token, both are revoked only in memory, nobody is retired, recovery hashes remain, and the old file is still on disk.
2. A second `store.init()` reads that still-unrepaired file with writes working. The shared token still resolves to nobody and neither claimant is retired.
3. The second boot persists `tokenHash: null` for both claimants, without writing a retirement flag.

No defect was found, so per the assignment I stopped at the test and did not change `commons/lib/store.mjs` or any other implementation file.

## Measured

On a fresh codeload copy of `refs/heads/main`, retrieved 2026-11-23T06:17:58Z, with the new test overlaid:

```text
node --check commons/test/store-repair-save-fail.mjs
  exit 0

node --test commons/test/store-repair-save-fail.mjs commons/test/store-repair-ambiguous.mjs
  tests 11
  pass 11
  fail 0
  cancelled 0
  skipped 0
  duration_ms 69.96797
```

No dependency install was needed for this store-only command: the exercised imports are Node built-ins and repository-local modules. Evidence: `teams/build/outputs/2026-11-23T06-17-58/tests.log` and `teams/build/outputs/2026-11-23T06-17-58/result.json`.

Limits: this measures the store's re-`init()` restart model in an isolated temporary directory, not an operating-system process restart, a booted HTTP server, staging, or production.

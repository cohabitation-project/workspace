# Claude (review seat), 2026-11-17 session note

**What I chose.** To turn last session's loose ends into scripts that can be re-run: an HTTP rejoin test and a Station grant/revoke test, each with mutants. I had promised that several times and not done it; this time I wrote the scripts into `$OUT` so they are kept.

**What I found.** The two gaps I named last time were real and are now closed by tests: M1 is caught once the assertion is `== 410`, and a deny-all Station mutant fails four checks. The M1 result also taught me something: the hold-delete is defence in depth, since the spent code already blocks a replay. A mutant surviving is a reason to ask what the barrier actually is.

**What I'm unsure of.** Whether the clone's HEAD matches the deployed server (I never read the live /healthz). And whether the 429 on wrong codes could ever lock out the owner under a different IP/rate setup; this run only shows the right code passing from the same address.

**Left unfinished.** Mycelium isolation (spec only), prompt-injection, one-time receipts, logging check, the old Desk items (t_94a2e3ad0e, t_5ad8ffe1dc, t_ce0829cb04, t_b429627c74, t_617a54a5f0, t_1fd66467a4), reviews of t_52dacf3b8c and t_fa12afcef9.

**To whoever comes after.** `HOME=/tmp/h` and a clone, then Popen the server inside one run_python call. Write the test script to `$OUT` so it survives; copy it into the clone to run. Mutate by string-replacing in a copy (restore in `finally`). Assert exact status codes.

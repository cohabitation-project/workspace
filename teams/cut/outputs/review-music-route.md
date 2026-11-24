# Job 4 round 21 — second read of music-list route

**Verdict:** YES on the three requested claims for the merged main route at `d09d0773` (per the current foreman note). This is a file/source review, not a server boot or browser check.

## Claims

| Claim | Verdict | Evidence and boundary |
|---|---|---|
| No `path` key in any response | **YES** | `commons/server.mjs:860` maps every returned audio record to a new object with exactly `{ id, title, source: 'yours' }`; it never returns the stored audio record. For signed-out requests, the route throws a 401 before returning a list. `commons/test/cut-music-list.test.mjs:51-57` checks the 401 JSON has no `tracks`; lines 63-70 check Alice's returned track objects have exactly `id/source/title` and scan the body for path/store fields. This establishes the route's response shape in source and exercises the principal success/error cases. The test does not separately query every possible server error response or repeat the path assertion on Bob's list; the shared route mapper is the source-level basis for the broader claim.
| 401 before any list | **YES** | At `commons/server.mjs:860`, `actor(req)` is checked and a 401 is thrown before `audio.list(...)` appears in the expression. The test at `commons/test/cut-music-list.test.mjs:51-57` exercises a signed-out request and asserts 401 JSON with no `tracks`. It does not instrument/spy on `audio.list`; the strict no-call ordering is verified by reading the route's source order, not by that assertion alone.
| A test fails if the `by` filter is dropped | **YES** | The route calls `audio.list({ by: me.id, limit: 60 })` at `commons/server.mjs:860`. The real-server test uploads two tracks for Alice and one for Bob, then at `cut-music-list.test.mjs:63-70` expects Alice's exact two IDs and explicitly excludes Bob's ID. Removing the `by` filter would include Bob's track and fail that exact-list assertion. Claude's round-20 RESULTS row also records the `audio.list`-without-`by` mutant turning the new test red (one failure).

## Source checked

- `commons/server.mjs:860` — merged `GET /api/cut/music` route.
- `commons/test/cut-music-list.test.mjs:51-84` — signed-out, ownership, response-shape, and render-rule checks.
- `teams/cut/RESULTS.md` — Claude's measured round-20 patch/test and mutant record.

No files in running code were changed; no new test run was performed in this file-only review.

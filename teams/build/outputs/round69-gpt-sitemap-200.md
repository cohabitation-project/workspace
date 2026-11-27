# Round 69 GPT — sitemap pages return 200 and have titles

**Status: candidate written; server/browser behavior unrun here.** Assignment: `teams/build/JOBS.md` Round 69 GPT. The candidate is `teams/build/outputs/sitemap-all-200.mjs`, ready for Setu to place as `commons/test/sitemap-all-200.mjs` and run against a full checkout.

## What the test does
- Boots `commons/server.mjs` with an isolated temporary `COMMONS_DATA`, `COMMONS_FAKE_LLM=1`, and `COMMONS_NO_SPEND_POLL=1`, using the existing `ASHRAM_PORT` / `/api/presence` boot pattern from `commons/test/seo-sitemap-signin.mjs`.
- Fetches `/sitemap.xml`, extracts each `<loc>` URL's path, then requests that route on the isolated local server with redirects disabled.
- Requires HTTP 200 for every listed route; for `text/html` responses, requires a non-empty `<title>`.
- Prints one `path status title=...` line per route and a `DUPLICATE TITLES:` block. Duplicate titles are diagnostic only, not failures.
- A sitemap entry for `/does-not-exist` should fail the route-status assertion (intended negative check; not run here).

## Evidence and limits
- **Measured:** `node --check teams/build/outputs/sitemap-all-200.mjs` exited 0 in this session.
- **Not run:** the server-backed test, per-route status/title measurements, duplicate-title inventory, and the injected-missing-route negative check. No claim about current sitemap behavior.
- `context/NOW.md` and `teams/build/RESULTS.md` were checked. I copied the server boot/data-isolation approach from `commons/test/seo-sitemap-signin.mjs`; no earlier all-sitemap run was found in those records.

**Next:** @Setu place the candidate at `commons/test/sitemap-all-200.mjs`, run it on the server-equipped runner, record output and any failures here, then test the missing-route mutant. Be alert to title/404 failures and preserve the duplicate-title list without failing on duplicates.

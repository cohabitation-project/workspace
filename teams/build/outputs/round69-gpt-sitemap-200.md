# Round 69 GPT — sitemap pages answer

**Assignment:** `teams/build/JOBS.md`, Round 69 GPT. Visit each `<loc>` in `/sitemap.xml` locally; fail on non-200 or missing/empty HTML `<title>`. Print one `path status title` line per URL and list repeated titles as diagnostics only. The test candidate is `teams/build/outputs/sitemap-all-200.mjs` for Setu to place at `commons/test/sitemap-all-200.mjs` and run.

## Work and evidence

- Candidate follows `commons/test/seo-sitemap-signin.mjs`: isolated temp data directory, `freePort()`, server boot via `/api/presence`, no seeded records or writes to real data.
- Walks every sitemap `<loc>` path, checks 200, checks HTML titles, prints per-path output and `DUPLICATE TITLES:` groups. Repeated titles do not fail.
- Includes `MUTANT_404=1` to append `/does-not-exist` to the walked paths; the normal per-path 200 assertion should catch it. This mutation has **not** been demonstrated yet because the server could not boot here.
- Measured: `node --check teams/build/outputs/sitemap-all-200.mjs` passed.
- Measured: `node --test teams/build/outputs/sitemap-all-200.mjs` failed before sitemap assertions, after the 30-second readiness wait (`isolated server booted`). I separately ran the startup probe with stderr captured: `commons/server.mjs` exits with `ERR_MODULE_NOT_FOUND: Cannot find package 'dotenv'`. This runner lacks the server dependencies. So no sitemap statuses/titles or duplicate counts were measured; the 404 mutant remains unverified.

## Next / limits

@Setu: place this candidate unchanged as `commons/test/sitemap-all-200.mjs`, run it in the dependency-complete environment, then rerun with `MUTANT_404=1` to record a red mutant. The runner should report actual output/counts before claiming the sitemap passes. No source/product code, staging, production, or deploy state changed here.

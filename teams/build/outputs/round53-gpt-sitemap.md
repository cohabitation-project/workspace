# Round 53 — GPT sitemap addresses

**Status: partial; no current-server sitemap results.** Assignment: every `<loc>` in `/sitemap.xml` must answer locally; test file in `commons/test/sitemap-http.mjs`, plus a fake-`<loc>` mutation that fails.

## Source inspection (measured this session)
- `commons/server.mjs:572-575` builds the list: home, public documents/pages, market listings (`/label/l/:id`), `/api/mission`, and current `/room/:id` routes.
- `commons/server.mjs:578-582` returns XML, with canonical host from `core.CFG.canonicalUrl`; no sitemap source edit appears indicated from source-only inspection. This is not proof all listed routes work.
- Existing `commons/test/agent-door.mjs:80-99` checks sitemap shape/canonical URLs, but does not GET each `<loc>`.
- Environment: Node v24.22.3; repository checkout has no root `package.json`, lockfile, or `node_modules`.

## Candidate test and execution
- Wrote `teams/build/outputs/round53-gpt-sitemap-http.mjs`, a candidate for `commons/test/sitemap-http.mjs`: isolated temp data, fake LLM, `/api/presence` boot wait, `/sitemap.xml` status/XML checks, request each `<loc>` path with manual redirects, fail on invalid/fetch-error/404/5xx, print `locs=… requested=… bad=…`.
- `node --check teams/build/outputs/round53-gpt-sitemap-http.mjs`: **pass, rc 0**.
- Attempted `node --test teams/build/outputs/round53-gpt-sitemap-http.mjs`: **fails** at “Commons server booted” because server process cannot import missing `dotenv` (candidate run has no server stdio); confirmed directly with `node commons/server.mjs`: **exit 1, `ERR_MODULE_NOT_FOUND: Cannot find package 'dotenv'`**.
- Therefore no current `locs/requested/bad` counts, no page failures established, no builder mutation run, and no CI registration. Do not infer these from the current test failure.

## Limitation / handoff
The test source is staged only in the team output because this session's file tools cannot write under `commons/` or `.github/`; the site checkout also lacks its dependencies, preventing actual integration or mutation evidence. Next: put the candidate in `commons/test/sitemap-http.mjs`, add it to `.github/workflows/commons-tests.yml`, run in a complete dependency-enabled checkout, then exercise an injected invalid `<loc>` and fill in measured counts. No production or deploy behavior was checked.

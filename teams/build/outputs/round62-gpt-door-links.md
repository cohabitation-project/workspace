# Round 62 — GPT: door links

**Assigned test:** `commons/test/pages-door-links.mjs` checks `/door`, `/join`, `/signin`, `/signup`, and `/connect` both signed out and signed in, plus one hop of same-origin `href`/`src` targets. It logs redirects with `REDIRECT <page> <location>`, allows signed-in `/signin` and `/signup` redirects, reports non-2xx/3xx links as `LINK <page> <href> <status>`, and fails on 404/5xx or fetch errors. Test-only fake-reference mode: `FAKE_REFERENCE_MUTANT=1` injects a nonexistent same-origin route.

**Measured here (Node runtime in runner):** `node --check commons/test/pages-door-links.mjs` exit 0. Actual Commons run: `node --test commons/test/pages-door-links.mjs` exit 1 after the 20-second readiness wait, 0 passed/1 failed; the isolated server did not become ready, before any page navigation. Thus actual page/link behavior is **unrun here; needs boot**.

**Harness-only fixture validation (not Commons behavior):** Against a temporary local HTTP fixture, the normal run passed 1/1 (10 page visits, bad=0), and signed-in `/signin` and `/signup` each printed a 302 redirect to `/door`. With `FAKE_REFERENCE_MUTANT=1`, it logged the injected route's 404 and failed the 404/5xx assertion (0 pass, 1 fail). This verifies redirect allowance and mutant sensitivity in the test harness only; it does not establish that the real app pages or links work.

No product source changed. Setu should run this test against a dependency-complete isolated Commons checkout and record the actual page/link counts and statuses.

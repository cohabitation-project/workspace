# Round 58 — Kimi: door pages at phone width

## Shipped candidate

- New test source: `teams/cut/outputs/2026-11-25T15-21-22/pages-phone-overflow-door.mjs`
- Apply-ready new-file patch: `teams/cut/outputs/2026-11-25T15-21-22/round58-kimi-door-overflow.patch`
- Destination after application: `commons/test/pages-phone-overflow-door.mjs`
- Size: 13,195 bytes, 293 lines. SHA-256: `fd8b268a93a67f062185860dbdf88f47ae51884367e2230c1eab9ba468664e12`.

## What the test checks

It reuses the round-57 isolated server/raw-CDP driver, browser discovery, 390×844 emulation, document measurement, WIDEST/OVERFLOW evidence, and best-effort cleanup. It registers a public OAuth client through `POST /oauth/register` with `token_endpoint_auth_method: 'none'`, creates a temporary human through `POST /api/humans`, and validates the returned session with `/api/members/me`.

The six requested responses are `/door`, `/join`, `/signin`, `/welcome`, `/connect`, and `/oauth/authorize?…` with a real registered client, PKCE S256 challenge, state, redirect URI, and `scope=commons`. The five public pages are fetched and rendered signed out. The signed human cookie is installed through CDP only for OAuth consent. Every response prints `page=… status=… document=…`; a 3xx prints its `location`, is counted as reported, and is not navigated or measured. Other responses require HTTP 200 HTML, the exact route after navigation, a 390×844 viewport, and `document.documentElement.scrollWidth <= 390`.

## Evidence and limits

- **Measured:** `node --check teams/cut/outputs/2026-11-25T15-21-22/pages-phone-overflow-door.mjs` exited 0 with empty stderr.
- **Measured:** `git apply --check teams/cut/outputs/2026-11-25T15-21-22/round58-kimi-door-overflow.patch` exited 0 against this session's repository; the destination did not already exist.
- **Not measured:** no full server/Chromium run and no page status, redirect, or overflow verdict. This runner has browser executables but no installed `node_modules/dotenv`, so the isolated server was not started.

## Next hand

@Setu/next builder: apply the patch and run `node --test commons/test/pages-phone-overflow-door.mjs`. Use each response's `status`/`location` and each failing page's WIDEST/OVERFLOW output to distinguish routing from layout defects. Do not weaken the six-response classification or the 390 px document-width assertion to obtain a green result. Review, merge, and Geoffrey's production deploy remain separate.
# Round 58 — Kimi: door pages at 390 px

## Shipped

Added only `commons/test/pages-phone-overflow-door.mjs` (10,393 bytes; SHA-256 `bbe27ebb85292f58e99c9d0ca0f14336e19fa060d860c3df4fffc6662fbcea4c`). No HTML, CSS, site implementation, or CI file changed.

The test reuses the round-57 isolated boot, raw CDP, 390×844 emulation, WIDEST diagnostics, and tolerant cleanup. It creates a temporary human and registers a temporary public OAuth client using the query pattern in `door-consent-who.mjs`. It then requires HTTP 200 HTML, readiness, a 390 px layout/visual viewport, document width ≤390 px, and no browser errors for:

- `/door`
- `/join`
- `/signin`
- `/welcome`
- `/connect`
- `/oauth/authorize?...` with the seeded human's `cx` cookie installed before navigation

The five public pages are measured before installing that cookie. The consent route additionally requires the visible text `You're signed in as Door Overflow Seed`, so a signed-out consent page cannot pass as the signed-in case.

## Measured

- `node --check commons/test/pages-phone-overflow-door.mjs`: **exit 0**, empty stdout/stderr.
- A temporary mock Commons was substituted only in a scratch copy of this exact test, leaving its CDP/navigation/assertion code intact, and run against this runner's real Chromium:
  - **Narrow control: exit 0, 1 pass.** All six routes printed `document=390`, `viewport.width=390`, `visualWidth=390`, and `visualHeight=844`. The signed-in consent assertion passed.
  - **Wide mutant: exit 1, 1 fail.** The mock `/door` contained a deliberate 600 px div. The test printed `document=608 body=600` and failed `/door: layout viewport` (`608 !== 390`), stopping before the other routes. This proves the harness rejects the injected overflow; it is not a real-site result.
- Evidence: `teams/build/outputs/2026-11-25T15-22-18/round58-kimi-door-overflow-mock-verification.json`.
- The first mock attempt exposed a real test bug: `assert.ok(registered.ok, await registered.text())` consumed the body before `.json()`. Both mock runs then failed with `Body is unusable`. I fixed it by parsing once and using the parsed value as the assertion message; the green/red runs above are after that fix. Earlier evidence: `teams/build/outputs/2026-11-25T15-21-31/round58-kimi-door-overflow-verification.json`.

## Not measured / next

The real Commons server was not booted: a direct boot exited 1 because this snapshot lacks the `dotenv` package (`src/llm.js` is also absent). Therefore **no real door-page width, real consent render, site pass/fail, merge, or deployment is claimed**.

@Setu should run `node --test commons/test/pages-phone-overflow-door.mjs` with the full source/dependencies and Chromium, and record all six `page=… document=…` lines. If a page fails, use its route and WIDEST evidence for a minimal assigned fix; any visual change goes back to @Aletheia-6. This test must not be weakened to obtain a green run.

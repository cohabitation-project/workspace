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

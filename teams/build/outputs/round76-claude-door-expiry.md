# Round 76 — Claude: door matrix, owed rows (session expiry + join caps)

Base: main 084e989 (fresh clone), then re-checked on a6542e6. Test-only, Tier 2. Everything below is **measured** (booted server, real HTTP, node --test) unless marked.

## Deliverable
- **`commons/test/door-session-expiry.mjs`** (117 lines, 2 tests, 28 rows). Green: `pass 2 / fail 0` on main a6542e6 with the patch applied.
- **Patch: `teams/build/outputs/2026-11-27T21-20-49/door-session-expiry.patch`** (11,862 bytes, sha256 `1bf0126f5071d7924d15ee74a293df5ba3659f44d8e2171cf7879d2a0615fd1a`). On a clean clone of main (a6542e6): `git apply --check` rc 0, `git apply` rc 0, test green. The exact test file is also at `teams/build/outputs/2026-11-27T21-20/…/door-session-expiry.mjs` (the run-folder copies). I did NOT retype the 11 KB patch into `teams/build/proposed/` (a hand-retyped copy risks drifting from the measured bytes); **Setu: take the outputs copy.**

## How it works
Cookies are forged with the server's own `data/secret.key` (HMAC-SHA256 base64url over `id.exp.ver`), so "expired one second ago" is exact. Control rows X0a/X0b prove a forged *live* cookie is accepted, so each refusal is about expiry and nothing else.

## Findings (what today's code does)
1. **Session expiry exists** (`commons/lib/auth.mjs:79-94`, `memberFromCookie`): signed expiry, signature check, revocation list, session-version check. Cookie life 180 days with "keep me signed in", 1 day otherwise (`auth.mjs:37-41`).
2. **X0c OBSERVE:** the cookie issued by `POST /api/humans` is a **session cookie** (no Max-Age; one-day server-side life). So a human who signs up and comes back after a day is signed out. Whether that is intended for sign-up is a design question, not a defect I assert.
3. **X4 finding (small):** the claim answer `POST /api/me/agent-claims/:id` with an expired cookie returns **403** (a "not yours" style refusal), whereas the Yes press `/api/me/agent-returns/:id` and `GET /api/me/agent-claims` return **401** ("sign in"). The claim stays pending, nothing is applied (checked), so it is refused correctly, but the human isn't told to sign in. Route at `commons/server.mjs:2364` passes `actor(...)`'s null to `operators.answer`. I assert 401 *or* 403 there and say so in the row.
4. **Join caps exist at two levels** (`commons/lib/core.mjs:50,58,~795-800`): per-address per day (default 5, here 3 via `COMMONS_JOINS_PER_IP_DAY`) and Commons-wide per hour (default 120, here 3). Refusal is **429** with the sentence "rate limit: 3 agent joins per day from one address (…)" and `retry_after` 86400.
5. **C0:** malformed (400) and taken-name (409) joins do **not** spend the budget (checks run before the limit).
6. **C3:** a returning-seat join ("Alder returning") after the cap is used is also 429, so squatting is bounded by the cap, as the code comment says. **C4:** refused joins leave no member behind.
7. **C5 OBSERVE:** `/api/rejoin` after the join cap is used is **200** — the cap is on join, not rejoin. Recorded, not asserted.
8. **No per-operator cap exists** in `core.mjs` or `agentconnect.mjs` (grep: only `join:${ip}`, `join:gpt-door`, `join-mcp:${ip}`, `join-link:${ip}`, `join:all`, and an agentconnect registration cap of 200 an hour at `agentconnect.mjs:153`). So the job's "per-operator" half has nothing to assert; the `mcp`, `gpt` and `link` door caps are **not** covered here (UNVERIFIED).

## Mutants (each one line removed in a clone, test run, restored)
| Mutant | file | red rows |
|---|---|---|
| M1 no expiry check (`Date.now() > exp`) | auth.mjs | X1, X2, X3, X4, X4b, X4c |
| M2 no revoked-session check | auth.mjs | X7 |
| M3 no session-version check | auth.mjs | X6 |
| M4 no signature check | auth.mjs | X5, X5b, X8 |
| M5 no per-address join cap | core.mjs | C2, C3, C4 |
| M6 no Commons-wide join cap | core.mjs | C6 |
All six red; baseline green (pass 2, fail 0).

## Not covered
Staging/production; the `/oauth/authorize` consent page with an expired cookie (needs a registered client; `/my-agents` stands in for the page where the human presses Yes, X3); steward mint path end to end; restart mid-sequence; second-IP lockout probe; `mcp`/`gpt`/`link` door caps; the real 180-day Max-Age path (login with "keep me signed in" not exercised). Rate-limit state is in memory (`auth.allow`, `Map`), so a **server restart resets every join cap** — stated from the code, not tested.

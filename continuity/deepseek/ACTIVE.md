# DeepSeek — active checkpoint

_Last written: 2026-11-22 12:40Z, build session (Round 33). One page. Read this first, then `context/NOW.md`, then
`teams/build/JOBS.md` + `RESULTS.md`._

## Where I stand
Round 33 job (Setu, Tier 2, moved from Gemini): **pages and links — every door link on /signin opens.** Done as a
single new test file; I touched no existing file.

## Shipped this session
- **`commons/test/signin-door-links.mjs` (new, only file touched).** Boots `commons/server.mjs` the way
  `door-signin-agent.mjs` does (temp `COMMONS_DATA`, `freePort`, wait on `/skill.md`), GETs `/signin`, regexes the
  hrefs out of *only* the `<p class="cx-note">Is your AI agent locked out?…</p>` paragraph, asserts ≥4 links and that
  `/connect`, `/join`, `/my-agents`, `/rejoin` are each in it, then fetches every href with `redirect:'manual'`:
  200 passes, a 302/303/307/308 whose Location is `/signin` or `/login` passes, anything else fails.

## What I actually ran (measured, node v24.22.3, copy at /tmp/ds_sdl)
Recipe (works every time): copy `commons/` to `/tmp/x/commons`, write `/tmp/x/src/llm.js` exporting **`chat`** (also
`complete`, `ask`), `npm install --no-audit --no-fund express@4 ws dotenv` (and `jsdom` if running auth-frontend),
`HOME`/`npm_config_cache` in `/tmp`, run `node --test test/…` from `<x>/commons` with `COMMONS_FAKE_LLM=1`.
- `node --test test/signin-door-links.mjs` → **1 pass, 0 fail**.
- `node --test test/auth-frontend.mjs` → **9 pass, 0 fail** (only after `npm install jsdom`; without it the file dies
  on `Cannot find module 'jsdom'`, which is the harness, not the code).
- **Sensitivity, 4 mutations on the copy's `pages.mjs`, each red, each message naming the link:**
  remove the `/my-agents` anchor → "at least four door links… found 3"; `href="/rejoin"` → `/rejoin-typo` → "the
  paragraph links /rejoin"; change the paragraph's lead text → "still carries the … note"; **add a dead
  `href="/no-such-door"` next to the real ones → "…got 404"** (this one proves the each-link-opens loop, not just the
  presence check). Restored → green.

## Facts measured (do not re-derive)
- **The job's "303" is wrong: the guest answer on main for `/my-agents` and `/rejoin` is 302 to /signin.** `/connect`
  and `/join` answer 200. My first run failed on exactly that (`302 !== 303`); the test now accepts any redirect to
  sign-in and forbids 404/401/500. First run of a link test, print the statuses before pinning them.
- `pages.mjs:1074` is the paragraph (one line, all four links). `door-signin-agent.mjs` already asserts only
  `/connect` and `/rejoin` exist as substrings; my file is the stricter, paragraph-scoped version.
- `.github/` is **not** in the build runner's copy, so I cannot see or edit `commons-tests.yml`. Same fact as last
  round; only Setu can add a test to CI.

## Open / next
1. **CI:** `signin-door-links.mjs` is not in the workflow yet — Setu needs to add it beside `door-join-again-words`
   and `door-last-words` (4e39d043). Until then it runs only when someone names it.
2. `/gpt/openapi.json`: **closed — not a bug.** Setu measured 43/43 on front-door on real main; `commons/gpt/` exists,
   my runner copy lacked it. Don't reopen.
3. Round 32/33 door text all merged (90591119, a1466f1e) and audited Tier 1 by Setu. Door text job is done; grep
   `grep -rn "ask a steward" commons/lib` before opening another one — the remaining hits are deliberate
   last-resort clauses (agent with no human) and `core.mjs:250` (human social standing).
4. #291 (Printful) still needs GPT's verdict line in `teams/build/outputs/review-291-fafdcdfe.md`.

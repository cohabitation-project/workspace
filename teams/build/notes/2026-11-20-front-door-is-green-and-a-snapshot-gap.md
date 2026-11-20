# front-door.mjs is green on main — and a session-snapshot gap makes it look broken

**DeepSeek, 2026-11-20 ~12:30 UTC.** Measured, not inferred. Closes Desk task `t_817a803049`
("fix the 2 failing front-door tests") as **already fixed upstream**; the two failures I could
reproduce were an artefact of the sandbox snapshot, not of the site.

## What the task asked for
`node --test commons/test/front-door.mjs` should pass all checks. On 2026-11-18 two failed:
test 4 "its buttons lead to real pages" and test 40 "the shared header: one clean COHABI menu".

## What I measured
Runtime: a disposable copy of the session's repo snapshot plus `express@4 ws dotenv`, `src/llm.js`
stubbed to `export async function chat(){return ""}`, `node_modules/sharp` stubbed — the recipe in
`teams/build/STANDUP.md`.

- **Both named tests pass on the current snapshot**, unchanged, no edit by me:
  `✔ its buttons lead to real pages (38.1ms)`,
  `✔ the shared header: one clean COHABI menu (Geoffrey, 2026-11-13), the deep links behind it (5.4ms)`.
  They were fixed by the /social rename work of rounds 14–15 (Claude's e2e/llms work, GPT's feedv2
  and profile-public `/feed` → `/social`, Setu's composer-id assertion fix). Nothing left to do.
- **Two other checks failed in the first run, and both were false:**
  `✖ link audit: join` and `✖ link audit: privacy`, with
  `AssertionError: join: "this schema" -> /gpt/openapi.json answers 500`.
  `/join` (commons/lib/pages.mjs ~26994) and `/privacy` (same file ~73569) link to the Commons GPT's
  OpenAPI schema; `commons/server.mjs` (~195358) serves it by reading `commons/gpt/openapi.json` and
  answers **500 `{error:'schema missing'}`** when the read fails.
  The file is not missing from the project. On `main` it is `commons/gpt/openapi.json`, 70,711 bytes,
  blob sha `66742f2ed521bebfbebc06f81866bf947def5541` (checked through the GitHub contents API, which
  also lists `INSTRUCTIONS.md`, `SETUP.md`, `build-openapi.mjs` in the same directory). **The session
  snapshot handed to this sandbox has no `commons/gpt/` directory at all.**
- **With that one file restored into the disposable copy and nothing else changed, the whole file
  passes: `node --test commons/test/front-door.mjs` → exit 0, no ✖ line.** That is the proof that the
  500 was the snapshot's, not the site's.

## What this means for the foreman
1. `t_817a803049` needs no build work. Keep it closed; don't spend a round on it.
2. **The snapshot exclusion is worth fixing once:** any kin who runs a page test that follows links to
   `/gpt/openapi.json` (front-door's link audit does, on `/join` and `/privacy`) will report a false
   500 and may "fix" a page that is correct. Two of thirteen snapshot-missing-file reports in a round
   can also hide a real one.
3. `front-door.mjs` is a good canary for this: run it first in a session and, if the only failures are
   `/gpt/openapi.json` answering 500, the snapshot is short a directory, not the site a route.

## Limits of this note
- I did not run the file against `npm ci` on a complete checkout; I ran it against a disposable copy
  with three dependencies installed by hand, and I did not reproduce CI.
- I did not verify the deployed site's `/gpt/openapi.json`; I verified the file's presence and size on
  `main` and the route's behaviour locally.
- The counts above are from one run each; the second run (file restored) exited 0 with no failure line,
  which is the run that matters.

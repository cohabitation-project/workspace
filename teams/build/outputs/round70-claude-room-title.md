# Round 70 — Claude: each chat room gets its own title

STATUS: DONE as a candidate. Tier 1 (server.mjs): needs Setu's review of the exact SHA. Nothing deployed.

## What changed (commons/server.mjs, two edits; patch: `teams/build/outputs/2026-11-27T03-21-04/server.patch`)
1. `sendHQ` (line 547): if `res.locals.hqTitle` is set, the served HTML's `<title>…</title>` becomes `<name, HTML-escaped> · The Commons`. The replace uses a function replacer, so a room name containing `$&` or `$1` can't be read as a pattern. With no `hqTitle` (`/headquarters`, `/ask`) nothing changes.
2. `/r/:id`: looks the room up once (`const __room = repo.roomById(...)`), keeps the 404, and sets `res.locals.hqTitle = __room.name`. The canonical line I added last round is unchanged.

## Test: `commons/test/seo-room-title.mjs` (copy at `teams/build/outputs/2026-11-27T03-19-58/seo-room-title.mjs`)
Boots a real server (FAKE_LLM, temp data dir), takes a second room from `/api/rooms`, asserts exactly one `<title>` per page and:
`/r/general` = "General Hall · The Commons"; second room = "<its name> · The Commons" and different from general's; `/headquarters` and `/ask` = "Headquarters · The Commons"; `/r/no-such-room-xyz` is 404.

## Measured (node v24, main at e30e193 shallow clone + `npm ci --omit=dev`, patch applied there)
- Test: **pass 1 / fail 0** (printed `titles: /r/general="General Hall · The Commons" /r/rnd="R&amp;D / Kodama · The Commons" /headquarters="Headquarters · The Commons" /ask="Headquarters · The Commons"`). The `&amp;` is the escape working: the room is named "R&D / Kodama".
- Mutant (drop the `res.locals.hqTitle = …` line): **red**, `/r/general` served "Headquarters · The Commons", expected "General Hall · The Commons"; pass 1 / fail 1 of the two files run (seo-room-canonical stays green).
- Broader: `seo-*` + `agent-connect*` + `front-door*` on the patched clone: **80 tests, 80 pass, 0 fail**.

## Not measured / limits
- No browser, staging or production check. I did not look at the `<title>` on a phone tab.
- The `og:title`/`twitter:title` on `/r/:id` are whatever `hq.html` and `agentdoor.inject` already give; I did not change or check them. If they also read "Headquarters", they are a second duplicate to fix.
- `/headquarters` itself is still titled "Headquarters · The Commons", as the job says.
- Not run: `site-links*` (needs jsdom; `--omit=dev` install).

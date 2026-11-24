# Cut: where does the editor's music come from? (proposal for Ash, no code)

Claude, cut seat, round 19. Read against main `562b41c` (2026-11-24). Nothing here is placed, tested or live.
Labels: **read** = I read the line on main; **measured** = I ran something; **inferred** = my reading, not run.

## What is true today (read)

1. **The music control can never appear.** `commons/public/cut/cut.js:65` (`loadMusic`) fetches `GET /api/label/tracks`.
   `server.mjs` has `GET /api/label/artist/:slug` (:1690) and the `/label/*` pages, and no `/api/label/tracks`.
   `loadMusic` returns quietly on a non-OK answer, so `#music-wrap` stays `hidden` (cut.html:63). The page is honest
   about nothing: no error, no control.
2. **The render route is ready for music; the server is not wired for the label half.**
   - Accepted id: any string, 1–200 chars, no NUL/CR/LF (`commons/lib/cut/route.mjs:38` `MAX_ID_LEN`, `:50-52` `goodId`).
     The id comes from `body.musicId` or `edit.music.id` (`route.mjs:63-65`); music is only looked up when the edit mixes it (`:66-68`).
   - Lookup: `deps.music.get(id)` (`route.mjs:77`), built in `commons/lib/cut/wire.mjs:40-45`. Two branches:
     (a) `labelTracks.get(id)` → `{ public: true, path }` (`wire.mjs:42`), (b) `audio.get(id)` → `{ owner: a.by, path: audio.fileOf(a) }` (`wire.mjs:43-44`).
   - Rule: `route.mjs:80` — 403 "that music is not yours" unless `m.public === true` or `m.owner === member.id`; unknown id → 404 (`:78`).
   - **`server.mjs:154` calls `makeCutDeps({ videos, audio, outDir, log })` with no `labelTracks`**, so branch (a) is dead code on main:
     a label track id would answer 404 today.
3. **What a member can use right now, with no server change:** their own uploads. `POST /api/audio` (server.mjs:790) stores
   `aud_` + 16 hex (`audio.mjs:36`) with `by = member.id`; `GET /api/audio?by=me` (server.mjs:791) lists them. The existing
   test `commons/test/cut-route-real.test.mjs:84-87` already proves own → 200, someone else's → 403, unknown → 404
   (against fakes with the stores' shapes, not the real stores; read).
4. **Rights facts on the label** (read): `label/releases.json` has 7 releases, 109 files, all `by: "human"` (Geoffrey David / LoTRē,
   and "church searcher"), **none has a `license` or any reuse flag** (measured: `license` is absent on all 7). `label/NOTICE`:
   works "belong to the artists… all rights are reserved by each artist", except what they grant the label in writing — and the
   terms (`docs/label-terms-v1.md:7`) grant "host/stream/distribute" and say "Still not in force until Geoffrey adopts it".
   Putting a track under a member's video, which is then posted and re-shared, is **a new copy with a new picture** — a
   synchronisation use. I read nothing that grants it. (inferred; this is a question for counsel/Geoffrey, not a ruling.)
   Only two artists are linked to members in `releases.json` `artists` (`geoffrey-david`, `lotre`); "church searcher" is not.
5. **`audio.upload` asks for no rights statement** (`audio.mjs:30-44`: data + title only), and `/audio/:id` and
   `GET /api/audio` are public. So "own upload" means "uploaded by me", not "I hold the rights". (read)

## The rights question, with options

| | Who may put what under a video | Rights basis | Server work | Risk |
|---|---|---|---|---|
| **A. Own uploads only** | A member, only tracks they uploaded (`aud_…`, `by === member.id`). | The member's own say-so at upload. Same trust as every other upload on the site. | None in the route (rule already at `route.mjs:80`). Editor fetches `/api/audio?by=me`. | A member can upload music they don't own. Same exposure as `/api/audio` today; the editor makes it a bit more visible. |
| **B. A + label tracks the artist opted in** | A, plus label tracks whose release carries an explicit reuse flag set by the label (by commit, like the `artists` map: "only the Label sets this"). | The artist's written opt-in, per release, naming video use. | Pass `labelTracks` at `server.mjs:154`; read-only index built from `releases.json`; a list route. | The terms aren't adopted; "church searcher" can't be shown to have opted in. Needs Geoffrey (artist/label owner of 6 of 7) to say yes in his own words first. |
| **C. Everything on the label** | Any member, any label track. | None found. | Same as B. | Unlicensed sync use of artists' work: **not recommended**. |

**Recommendation: A now, B later and only per release.** A works with what main has, honestly, and removes the dead control.
B is a rights decision for Geoffrey (and counsel if it goes beyond his own releases), so the code should be ready but the
flag defaults to off: no release is usable until one carries it. Never C.

For B, the credit must travel: a label track's use should add "Music: *title*, *artist* (Last of the Real Estate)" to the
exported video's `credit` (`videos.upload` already stores a `credit`, videos.mjs:41/53, as stock clips do). The render
route should return that string (it knows which track it mixed) and the editor's `POST /api/videos` copy (cut.js:279)
should pass it, because the server never sees that upload's text otherwise. (inferred; needs a read of the upload path.)

## The route (proposal)

`GET /api/cut/music` — replaces the URL at `cut.js:65`; `loadMusic` already accepts `{ tracks: [...] }` and uses
`title|name|label`, so the editor change is the one URL string plus the visible label ("Choose label music" → "Choose your music" for A).

- **Auth:** signed in (same `actor(req)` as the other reads; signed out → 401 JSON, not a redirect). Read only; no CSRF header needed.
- **Fields:** `{ tracks: [{ id, title, source: "yours" | "label", credit? }] }`, newest first, at most 60 (as `GET /api/audio`).
  `yours` = `audio.list({ by: member.id })`. `label` (option B only) = opted-in tracks, id `lbl_<releaseId>_<NN>` (≤ 200 chars;
  e.g. `lbl_2026-03-04-the-ninja-twins_07` is 34). Never a file path in the response.
- **Server:** the id → path index for label tracks is built from `releases.json` at boot, path must resolve inside `label/audio/`
  (`path.resolve` + `startsWith`), and is passed as `labelTracks` at `server.mjs:154`. A non-opted track id is **404**, not 403, so the route doesn't confirm it exists.
- **No new store, no new permission:** the route reuses `audio.list`, `wire.mjs:40` and the rule at `route.mjs:80`.

## The test that would prove it

`commons/test/cut-music-list.test.mjs`, booting the server the way `cut-route-http.test.mjs` does (fake LLM, temp data):

1. signed out → 401 JSON.
2. Alice uploads one audio, Bob uploads one: Alice's list has exactly hers, `source: "yours"`, no `path` key anywhere in the JSON.
3. **Round trip:** the id from the list goes into `POST /api/cut/render` (fake `run`, as the existing http test does) → 200; Bob's id → 403.
4. (B only) a release without the flag is absent from the list and its `lbl_…` id → 404; with the flag it appears with its credit, renders 200, and the response carries the credit string.
5. Static: `cut.js` fetches `/api/cut/music`, not `/api/label/tracks` (stops the dead URL coming back).
Red-on-old: 1 and 5 fail on main today (no route; the dead URL).

## Not measured
I ran no server for this. Nothing in this file was executed against main beyond `grep`/reading. Read, not run: `actor(req)` (server.mjs:451-469) **returns null for a signed-out read** (it only throws for bad tokens), so
signed-out `GET /api/audio?by=me` gets `by = undefined` and lists everyone's audio (`server.mjs:791`). That list is already public, so it is
not a leak, but "?by=me" silently means "everyone". Also why the new route must test `if (!me) → 401` itself: `actor` won't. A one-line test for whoever builds A. I did not check audio length versus video length (loop/fade is the render plan's business).
No rights opinion here is legal advice; B waits on Geoffrey and counsel.

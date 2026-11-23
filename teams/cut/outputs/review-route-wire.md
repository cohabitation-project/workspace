# Independent second read — Cut `server.mjs` wire

**Verdict: YES — the proposed hunk's four insertion points and its names still fit the current `main` server source.** I found no line or scope mismatch requiring a NO. This is a source review only: no hunk was applied, server booted, route exercised, or deployment checked.

**Basis checked:** fetched [`commons/server.mjs` from raw GitHub `main`](https://raw.githubusercontent.com/cohabitation-project/workspace/main/commons/server.mjs) during this review (HTTP 200), then checked its relevant source against the repository checkout. The inspected anchor contents and line numbers agreed. Lines below refer to that checked source. The route-wire file reviewed is `teams/cut/editor/route-wire.md`.

## Insertion-point claims

| Claim in route-wire | Finding | Evidence / qualification |
|---|---|---|
| (A) imports after server line 54 | **Holds** | Line 54 is `import * as stock from './lib/stock.mjs';`; adding the three Cut imports there is syntactically consistent with the existing import block. The three new modules do not yet exist on main, as expected for this proposed placement. |
| (B) create output directory/dependencies and start cleanup after line 148 | **Holds** | `DATA` is defined at 112; `audio.init(DATA)` is at 145 and `videos.init(DATA)` at 148. Thus both stores are initialized before the proposed `CUT_OUT` and `makeCutDeps` call. `path` and `fs` are imported at 15–16. This is a source-order check, not a runtime test. |
| (C) render POST after line 848 | **Holds** | Line 848 is the existing `DELETE /api/videos/:id`; stock GET/POST routes are at 846–847. `app` exists at 324; `wrap` at 462; `houseWriter` at 744. The proposed handler's response status assignment and returned JSON fit the existing `wrap` contract at 462–467. |
| (D) static `/cut` mount after line 850 | **Holds** | Line 850 is `GET /videos/:id/poster.jpg`; the insertion is after the existing `/videos` routes. `express` is imported at 19. The global middleware at 333–340 sets `X-Content-Type-Options: nosniff` and CSP `media-src 'self' blob:`, so the proposed `express.static` mount inherits those response protections and same-origin media policy. `index:false` is consistent with not serving a directory index. |

## Name and source claims

| Name/claim from route-wire's table | Finding | Evidence |
|---|---|---|
| `path` | **Holds** | Imported from `node:path` at line 15. |
| `fs` | **Holds** | Imported from `node:fs` at line 16. |
| `express` | **Holds** | Imported at line 19; also used to construct `app` at 324. |
| `DATA` | **Holds** | Defined at line 112. |
| `videos` | **Holds** | Imported at line 53, initialized at 148. `commons/lib/videos.mjs` defines `fileFor` at 73 and `get` at 81; `get` returns a public record whose owner field is `by`, consistent with the adapter note. |
| `audio` | **Holds** | Imported at line 43, initialized at 145. `commons/lib/audio.mjs` exports `get` at 45 and `fileOf` at 46. |
| `app` | **Holds** | Created at line 324; all proposed route/static insertions are later. |
| `wrap` | **Holds** | Defined at line 462; it awaits the handler, serializes a defined return value as JSON, and maps `CommonsError` statuses. |
| `houseWriter` | **Holds** | Defined at line 744; requires an acting writer and calls `core.writeAllowed`. Existing stock routes at 846–847 use it too. |
| `req.body` / `jsonSmall` | **Holds** | `jsonSmall` is defined at line 360 and selected by the body-parser middleware at 362. The proposed endpoint is not among the special raw/audio/big-body paths, so it receives `jsonSmall` (300 kb), more than enough for the edit payload described. |

## Placement notes

The route-wire note's path adjustment for `render-edit.mjs` (`../../../commons/lib/cut/plan.mjs` to `./plan.mjs`) is appropriate when the file is placed beside `plan.mjs`; its `edit.mjs` adjustment to `./wrap.mjs` likewise depends on copying `wrap.mjs` beside it. Those are placement-bundle conditions, not mismatches in the `server.mjs` hunk. I did not independently test the route modules, static-file behavior, cleanup timing, or the public output URL.

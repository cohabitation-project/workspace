# Round 51, Claude: the render catch by provenance (variant C)

Base: public main `d8533888a92155dc18707d2c838c43bf0fcfb536`. Node v24, fake deps plus the real render chain without ffmpeg (refusals happen before ffmpeg). No browser, no booted server, nothing live. All numbers MEASURED in my sandbox, not yet independently re-run.

## Files
- Patch: `teams/cut/outputs/2026-11-28T12-42-49/cut-render-provenance.patch` — SHA-256 `74ea969c257952d56eaf9602652e4becf6f33124bd16c6121c738b43f17b80ff`, 29,694 bytes. `git apply --check` rc 0 on a fresh clone of main. It includes the new test file and the one-line (a2) edit.
- Test: `teams/cut/outputs/2026-11-28T12-42-00/cut-render-error-text.test.mjs` — SHA-256 `93399ce4d86481b4d965e5fc134a3cb36697072d213ff4d311e4f260b2ea89fd` (byte-identical to the file inside the patch). Replaces the round-49/50 `cut-render-error-text` test (not placed on main yet).

## What changed (7 files)
1. `edit.mjs`: new `export function makerRefusal(Ctor, message)` returns a plain TypeError/RangeError with `maker: true` (so `instanceof` still holds and every existing edit test is unchanged). 16 `throw new TypeError/RangeError` became `throw makerRefusal(...)`. The stored `durationSec` checks stay plain (a server value, not the maker's). `finite()` echo of the maker's own value is cut at 40 chars.
2. `render-job.mjs`: the over-length trim ("the trimmed video is N s; the limit is …") is marked. Everything else there (path, outDir, hasAudio, width/height, durationSec) stays unmarked.
3. `render-child.mjs` sends `maker: e?.maker === true`; `wire.mjs` restores `e.maker = true` after the fork.
4. `route.mjs` catch: show `err.message` at 400 only if `err.maker === true` AND it is a TypeError/RangeError with a non-empty string message. Else `deps.log(err.message)`; TypeError/RangeError/RenderPlanError → 400 with `REFUSED_TEXT` ("That edit couldn't be rendered. Check the trim, text and music and try again; if it keeps failing, it's on our side." — my wording, open to change); any other error → the existing 500 "the render failed". Header updated: the stale "the refusal's own message" line, and the missing 409 line.
5. Tests: new `cut-render-error-text.test.mjs` (11 tests); `cut-route-unready-order.test.mjs` (a2): its stub refusal is now `Object.assign(new RangeError(...), { maker: true })`, with a comment.

## Results
| Run | pass | fail |
|---|---|---|
| new test, main alone | 6 | 5 |
| new test, patched | 11 | 0 |
| mutant: route shows every message (the PROVENANCE_MUTANT) | 8 | 3 |
| mutant: `makerRefusal` sets no mark | 8 | 3 |
| mutant: wire drops the mark | 10 | 1 |
| mutant: render-child doesn't send the mark | 10 | 1 |
| mutant: route stops logging the detail | 5 | 6 |
| mutant: over-length trim unmarked | 10 | 1 |
| mutant: mark honoured on any Error class | 10 | 1 |
| 40 cut*/video* files, one process each, patched in-tree, BEFORE the (a2) edit | 253 | 1 (cut-route-unready-order a2, as predicted) |
| 40 files on a CLEAN clone of main with the patch file applied | **254** | **0** |

The red file in the first full run was exactly the one the foreman and Kimi expected, (a2): it had a plain RangeError expect "trimEnd". Under provenance a plain one is unmarked, so it correctly gets the fixed sentence; the stub now says it is a marked refusal.

## What the new test pins
(5) each of 10 REAL `editToTracks` refusals (trim order, trim range, cover, non-number, line break, 500-char text, y offset, volume 7, missing music id, text not an object) carries `maker:true` and is shown verbatim. (8) ten unmarked refusals — pathless "outDir must be an existing directory", "video.hasAudio must be…", maker-looking "trimEnd (1) must be greater…" text without a mark, a RenderPlanError, a two-line one, a 300-char one, an empty one, `maker:'yes'`, `maker:1` — all get the same fixed sentence, and the real text is in the log. (9) a marked plain Error is still the fixed 500. (10) the real `renderEditJob`: missing outDir and a stored zero length → fixed sentence; a 4000 s trim keeps its own "limit" sentence. (11) a real `forkRenderJob` child: bad trim rejects with `maker:true`, missing outDir does not.

## Limits, said plainly
- **Provenance is by who threw, and I trust the 17 marked throw sites.** A future edit.mjs throw that interpolates server state into a marked message would show it. Mitigation: edit.mjs only sees the edit body plus width/height/durationSec; the one place those are echoed (`durationSec`) is unmarked.
- Marked messages still echo the maker's own values (trim numbers, `text.y`), truncated at 40 chars only in `finite()`. These are the maker's own input.
- `edit.mjs` durationSec checks are unreachable through the route (render-job refuses first) so no test pins them.
- Not tested: the page's reading of the 400 text, real ffmpeg, a booted server's JSON path for this branch, production.
- Needs: Ash's yes on C (and on the fixed wording), Setu's placement and the same-day full suite, Kimi's independent run. Variants A and B (round 50 report) stay on file for comparison.

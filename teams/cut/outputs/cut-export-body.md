# Cut round 28 — Kimi: Export body versus render route

**Result: PASS.** Added the requested server-free static contract test, `commons/test/cut-export-body.mjs`. In the checkout measured at 2026-11-25T16:14Z, the browser sends no top-level key that `/api/cut/render` ignores, and no browser-supplied top-level key is missing from the handler's reads.

## Compared sources

| Layer | Evidence | Conclusion |
|---|---|---|
| Browser Export | `commons/public/cut/cut.js:315` | Sends exactly `{ videoId, edit }` as JSON. |
| Server route | `commons/server.mjs:861` | Passes `req.body || {}` to `handleCutRender` without renaming or selecting keys. |
| Handler | `commons/lib/cut/route.mjs:60` | Reads `videoId` and `edit` from the body. |
| Music fallback | `commons/lib/cut/route.mjs:64` | Also accepts optional top-level `musicId`, otherwise uses the browser's `edit.music.id`. This extra accepted alias is not a missing browser field. |
| Render handoff | `commons/lib/cut/route.mjs:104-116` | Puts the complete `edit` object in the job and passes that job to the real or injected renderer; nested edit keys are not picked off at this layer. |

**Ignored browser keys:** none. **Missing browser keys:** none. The test derives both top-level key sets from source rather than only checking a hard-coded happy path. A synthetic additional browser key, `ignoredByRoute`, is asserted to appear in the mismatch result.

## Measured

```text
node --check commons/test/cut-export-body.mjs   -> exit 0
node --test commons/test/cut-export-body.mjs    -> exit 0
tests 4, pass 4, fail 0, skipped 0
```

Final test SHA-256: `f9e1476b69724dcaff7dc57ab50f1fcf2c55636ef2ac314c18bb938e12526680` (3,786 bytes). Raw TAP and command evidence: `teams/build/outputs/2026-11-25T16-14-00/cut-export-body-final.json`.

During development, the first candidate went red on its own outdated music-fallback/render-adapter source anchors. I corrected those assertions to the actual current route; that red run was not evidence of a product mismatch. The final four-test result above is against the unchanged product sources.

## Limits / next

This is a static request-contract check, not a browser export or ffmpeg verification. It does not boot the server, click Export, inspect real network traffic, render media, or prove downstream visual/audio behavior. No production source, CI configuration, review, merge, or deployment was changed. @Setu / the next builder can run the one command above in the full checkout and place the test with the other Cut contract tests.

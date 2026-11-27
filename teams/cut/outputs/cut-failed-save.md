# Cut failed-save message regression — GPT, 2026-11-27

## Deliverable

`teams/cut/outputs/cut-video-wait.test.mjs` is a fresh copy of current main's `commons/test/cut-video-wait.test.mjs`, with two additional maker-facing save-failure cases. The relevant product behavior is `commons/public/cut/cut.js:317` (line number from this snapshot): when saving the rendered export fails, show the server error or an HTTP-status fallback and do not expose a post link.

The first new case simulates HTTP 500 with `{error: "Disk is full."}` and asserts exactly one matching toast, exact final text, an empty post href, and a hidden result box. The second simulates HTTP 500 whose JSON body rejects and asserts the fallback matches `/Could not save the export to your videos \(500\)/`, with no post link and a hidden result box. Test imports use `../public/cut/cut.js`, as they will when placed unchanged at `commons/test/cut-video-wait.test.mjs`.

## Measured evidence

- Node v24.22.3. In a temporary `commons/test` + `commons/public/cut` layout, copied the candidate and current main `cut.js` into place: `node --test commons/test/cut-video-wait.test.mjs` → **13/13 pass, 0 fail, 0 skipped**.
- Mutant check in a separate temporary copy: replaced the line-317 failure branch's toast with an immediate return. `node --test --test-name-pattern='export save HTTP 500' ...` → **2/2 targeted cases fail**, as required (message assertions turn red).
- This is a fake DOM/fetch test only. No product file was changed or placed; no real HTTP server, browser, ffmpeg, upload, or live site was exercised.

## Next

Place this candidate unchanged as `commons/test/cut-video-wait.test.mjs` on the build lane and rerun it against the checked-out source. This report does not claim placement, merge, or live verification.

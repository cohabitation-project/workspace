# Cut pending-source 409: maker-facing UI check

**Checked:** 2026-11-27 12:24Z. **Scope:** read-only source inspection of this repository snapshot. No UI/browser, server, ffmpeg, production, or deployed-SHA check was run.

## Result

- **Does the editor show the proposed 409 readiness sentence? No.** Claude's candidate `teams/cut/outputs/2026-11-27T09-19-18/route-ready-409.patch` proposes a server 409 with `error: "This video is still being prepared. Try again when it shows ready."` (candidate patch, not verified as placed). In the current `commons/public/cut/cut.js`, `exportFailureMessage()` has explicit handling for 404 and 400 only (lines 74–77); every other status, including 409, maps to `Export could not finish. Your edit is saved here.` The render response handler passes that result to `showToast()` (lines 348–350), so it does not display the proposed 409 error text.
- **Does the editor already block Export for a pending source? No.** `cut.html:16` declares the Export button without a disabled attribute. In `cut.js:329–357`, it checks for a `videoId`, disables the button only after the user clicks and only while the request is in flight, then re-enables it in `finally`. There is no readiness lookup or pending-source condition before the render POST. This is a source-reading inference; no pending video was exercised in a browser.

## Small follow-up

If Ash accepts the route candidate, add a 409-specific message to `exportFailureMessage()` (or display a safe nonempty server error for 409), and add a regression test that confirms the exact maker-visible message. Whether to disable Export while a source is preparing is a separate UX choice; the server guard remains necessary regardless.

## Evidence / limits

- Read `commons/public/cut/cut.js` lines 74–78 and 329–358, `commons/public/cut/cut.html` line 16, and the candidate route patch above.
- Current source snapshot only. The candidate patch's placement and the deployed UI/server SHA were not checked. No product source changed.

# Cohabi Cut — staging/live look checklist for Ash

**Status:** checklist only; no staging or production page was opened by GPT this session. This is not evidence of a pass.

## URL and guardrails

- **Staging URL:** `https://[CURRENT-STAGING-ORIGIN]/cut/` — fill in the exact origin from the current staging/deploy handoff before starting. The repository record I searched documents a `COMMONS_STAGING=1` banner but does not establish the staging hostname; do not guess one or substitute `cohabi.org`.
- Confirm the visible staging banner before testing. Record the complete URL, UTC time, device/browser, and any visible build/commit identifier. If the banner is absent or the host is ambiguous, stop and ask Geoffrey/Ash which staging origin is current.
- Sign in only with an authorized test account. Use an owned, disposable short video; keep its content safe to display. Do not publish. Do not test on production unless Geoffrey confirms the current build is already deployed and asks for a read-only live look. No deploys, payments, or external API calls are part of this checklist.

## Happy-path export (375 × 812 CSS px)

1. Open `/cut/` on staging and use the editor's normal flow to choose a disposable video you own (or an approved stock clip). Confirm the preview is usable; avoid uploading another person's private footage.
2. Set a short trim within the source duration. Optionally add a harmless short text caption and set a cover frame. Do not add copyrighted or personal material.
3. Set the browser viewport to **375 × 812 CSS px** (device emulation is sufficient), reload, then press **Export to Feed** once.
4. Wait for completion. Record the toast text and whether the result box / **Post it** link appears. If the editor stalls, errors, or the exported item is not ready, stop and capture the exact message; do not repeatedly submit.
5. Check that **Post it** points to a Feed composer for the newly exported video, not the source clip. It is safe to open the composer for inspection; **do not press the final publish/post action**. Confirm the page has no horizontal overflow at this viewport.
6. Record measurements or screenshots only if they contain no private account/video information; otherwise describe the result without retaining the image.

**Expected observations, cross-checked against the placed local browser test:** a successful `/api/cut/render` response, visible “Post it” link at least 44 CSS px high, same-origin path `/social?cut=<export-id>#compose`, exported id different from the uploaded source id, exported video ready/owned by the member, and document width no greater than 375 px. Source: `commons/test/cut-export-handoff-live.mjs:106,120,124,141-152`. These are test assertions, not staging findings.

## Failure-message check (390 × 844 CSS px)

- Do **not** deliberately corrupt a request or force a failing conversion on staging/production. The automated failure test injects junk into the finished-render download inside a local browser harness; that failure injection is not a manual live procedure.
- If a failure occurs naturally during the disposable staging test, record the exact toast and whether the result box and Post link remain hidden. The current UI test expects a plain “couldn't prepare/convert this video” message, no ffmpeg/stderr internals, no Post result, and no width overflow at 390 px: `commons/test/cut-failed-ui-live.mjs:108,133,135,164-169`.
- The failure UI test accepts either wording, so it does **not** prove Ash's one-sentence wording choice. The local unit/browser coverage for message behavior is separate; don't call the wording live based on this checklist alone.

## Record to post back in `cut`

Use this template; mark every item **PASS**, **FAIL**, or **NOT CHECKED** and include the actual evidence:

```text
Live look: staging (or read-only production, if authorized)
URL/origin:
UTC timestamp:
Visible build/commit, if available:
Browser + viewport:
Own disposable video / stock clip:
Export result and exact toast:
Post link destination and target video checked:
Overflow / visible controls:
Failure case: NOT CHECKED (unless it occurred naturally)
Evidence: screenshot path or concise observations (redact private content)
Limits / follow-up:
```

Only Ash can record the live observations. Local test results and source assertions are not a substitute.
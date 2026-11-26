# GPT — active checkpoint (2026-11-26 18:24Z)

## Current: Cohabi Cut — failed-export UI check recorded

This session completed the promised documentation from the prior Cut standup. I read the existing candidate `teams/cut/outputs/cut-failed-ui-live.mjs` and the raw run log `teams/cut/outputs/2026-11-26T12-20-28/run-main.txt`; wrote `teams/cut/outputs/cut-failed-ui-live.md` and added a `teams/cut/RESULTS.md` row.

**Evidence, as recorded in the log:** browser test on `/cut/` at 390×844; invalid 4,096-byte payload delivered via the render download path; failure toast exactly `We couldn't prepare this video: We couldn't convert this video.`; result box and Post link hidden, header Export button visible; doc width 390; 1 test / 1 pass / 0 fail / 0 skip. The screenshot is present but I did not inspect it. This test passes with or without the separate wording patch.

**Limits / next:** candidate remains unplaced. @Setu places unchanged as `commons/test/cut-failed-ui-live.mjs` and reruns in a dependency-complete checkout with Playwright/Chromium. @Ash decides on the separate one-sentence wording patch and owes a staging/production live look. This session did not run the browser test itself, inspect the screenshot, or check staging/production. Geoffrey owns production deploys.

## Other carried Cut work

- `teams/cut/outputs/cut-tap-targets.mjs` / `.md`: syntax passed, but browser check did not reach Chromium because `dotenv` was missing. No tap-target measurements. @Setu needs to place/run in the dependency-complete environment.
- Export-duration candidate (`teams/cut/outputs/cut-export-duration.mjs`): previous run only exercised the expected missing-ffmpeg/ffprobe skip. A real render/duration assertion remains for @Setu in an environment with both binaries.
- Export handoff browser candidate `teams/cut/outputs/cut-export-handoff-live.mjs`: Claude recorded local pass and mutants in `teams/cut/outputs/cut-export-handoff-live.md`; Setu placement and Ash's live look remain outstanding.
- Failure wording patch `teams/cut/outputs/2026-11-26T09-24-47/cut-failed-wording.patch` remains an Ash product decision, not approved/placed by this session.

## Separate carried Build work

Round 62 door link test (`commons/test/pages-door-links.mjs`, `teams/build/outputs/round62-gpt-door-links.md`): actual app readiness timed out; only a temporary fixture passed and mutant failed. Needs @Setu's dependency-complete isolated run. Keep this separate from Cut.

## Decisions

Do not call a candidate placed/live without that evidence. Use `teams/cut/RESULTS.md`; no Cut-specific Work Desk handoff was available this session. No product code or production state changed.

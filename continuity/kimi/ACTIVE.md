# Kimi — active checkpoint

Updated 2026-11-24 15:23Z, Round 50 PR #299 signed-in layout measurement completed.

## Current result

`teams/build/JOBS.md` assigned the resumed #299 measurement on head `3e60cce9e99f6a5dce76082d893783f72105798d`, signed in, at **1536×900 only**. I rebuilt the lost scratch harness as the durable diagnostic **`commons/test/merch-299-signed-in.mjs`**, left it out of CI, and edited no `#299` or `merch-*` implementation file.

Main report: **`teams/build/outputs/round49-kimi-299-1536.md`**. Evidence: `teams/build/outputs/2026-11-24T15-21-12/` (`pr299-signed-in-1536.png`, `pr299-signed-in-1536-result.json`, `pr299-pixel-analysis.json`, run/server logs).

**Verdict: overall FAIL, one remaining defect.** At 1536×900:
- **FAIL — purple band:** measured PNG still has a 1,200 px-wide purple run at y=234–246. Other upper-chrome runs are separately identified in the pixel JSON; the DOM-only query missed this band, so the screenshot pixels decide the verdict.
- **PASS — actions card/heading:** 0 px² overlap.
- **PASS — pricing heading/price:** 0 px² overlap.
- **PASS — table/document overflow:** table client/scroll widths 420/420; internal, viewport and document horizontal overflow all 0 px.
- Signed-in label “PR299 Painter” was present; eight products rendered. Result status is `measured`, failure `null`; viewport is 1536×900 and full-page PNG 1536×2317.

The exact head was git-verified. The isolated server used stand-in Printful and a real isolated listing. The assigned Chrome path was absent, so the scratch run used temporary Headless Shell 158. The pixel FAIL is automated evidence for @Ash, not a claim of human visual approval.

## Previous merged work (do not redo)

Round 47 Printful public-catalog research: `teams/build/outputs/round47-kimi-printful-ids.md`; research only, no runtime compatibility claim. Round 46 Creator Workshop diagnostics: `commons/test/merch-aletheia-visual.mjs` plus `teams/build/outputs/round46-kimi-visual-warnings.md`; merged by Setu in `f95bc2d6`. Round 45 pill contrast `df667cc5`; Round 43 artist-page discoverability `5b4663eb`; Round 42 `ship_to` producer `37f0faab`; Round 41 fulfillment words `7d291ca8`. Earlier history: `continuity/kimi/RECORD.md`.

Do not reclaim or duplicate-submit `teams/income/royalty-fee-tables-v0.2.md` / Desk `t_428bda82ca`; fee decisions belong to Ash/council.

## Next / open

Next session read the newest `teams/build/JOBS.md` and `teams/build/RESULTS.md`, verify this diagnostic branch's merge result, and take only the newly assigned Kimi job. @Ash/@Setu own inspection and any correction of the remaining purple band; do not edit the implementation from this measurement lane. Scratch checkout, if it survives: `/tmp/kimi-round50-pr299/workspace`. Nothing is blocked in my lane; the verdict and evidence are complete.

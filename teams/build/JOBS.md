# Builders: jobs — Round 30 (Setu, foreman, 2026-11-22 01:50Z)

**Geoffrey, Nov 21: no new projects; finish what's started; keep spend low.** Read `context/NOW.md` first. Older rounds are in teams/build/JOBS-HISTORY.md (history only).

Round 29 result: Claude's conditional YES on #285 (fixed as he specified, merged); GPT's NO on #279 (fixed, back to GPT); #283, #280, #282 merged. DeepSeek's session ended with nothing, so its reviews move.

This round has **three** jobs, all reviews. Gemini and DeepSeek: read NOW.md, then call finish() with "no job this round". Nobody opens the Work Desk, claims tasks or edits source. **Write your review file in your first steps, then add to it**: last round a full review was lost because the file was never written.

## GPT (Tier 2 re-review): #279 at `dd274452`
Your NO (teams/build/outputs/review-279.md) is answered in the last commit: `month()` now has `readings_current`, `openrouter_error`, `anthropic_error`, and `complete` is false while either read failed; `commons/test/spend.mjs` adds success-then-failure for each API. Run `node commons/test/spend.mjs` with the runtime recipe. Write `teams/build/outputs/review-279-dd274452.md`: **YES or NO on dd274452**, what you ran, any defect with file and line.

## Claude (Tier 2 review): #291 Printful print on demand at `9970a4f3`
Read `commons/lib/printful.mjs`, the `/api/merch/*` routes in `commons/server.mjs`, the `design` addition in `commons/lib/fulfillment.mjs`, the "Make it a product" panel (`listingForm` in marketpage.mjs, end of `commons/public/market.js`) and `commons/test/merch-printful.mjs`. Run `node --test commons/test/merch-printful.mjs` from the repo root. Check: art must be the maker's own upload; the token only in the Authorization header; price can't go below base cost; a mockup publishes once; no order reaches Printful. Write `teams/build/outputs/review-291-9970a4f3.md`: **YES or NO**, what you ran, defects with file and line.

## Kimi (Tier 1 review: sign-up): #281 13+ at its head sha
Read the diff (`commons/lib/pages.mjs` terms + signup form, `/auth/finish` form, `commons/public/arrive.js`, `commons/test/age-13.mjs`). Run `node --test commons/test/age-13.mjs` and `node commons/test/front-door.mjs` if present. Check every human sign-up path asks, and that an agent join is not asked. Write `teams/build/outputs/review-281.md`: **YES or NO on the head sha**, what you ran, defects with file and line.

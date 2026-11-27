# Round 73 Claude: the listing page reaches 44 px at 390 (CSS only, Tier 2)

Status: done, unplaced. Needs Setu to apply the patch and place the test (my runner can only write to teams/, not commons/).

## Files
- CSS patch (market.css only, 29 lines): `teams/build/outputs/2026-11-27T12-25-38/listing-44.patch`
- Test + git diff for placement: `teams/build/outputs/2026-11-27T12-25-38/listing-44-test.patch` (adds `commons/test/market-listing-tap-targets.mjs`), plain copy of the test in `teams/build/outputs/2026-11-27T12-24-57/market-listing-tap-targets.mjs`
  (the earlier 12-24-57 `listing-44.patch` is superseded: it lacks the signed-in header fix).
- Test change vs Kimi's `market-listing-tap-targets.mjs`: one line, the inline-link exemption now includes `aside.agent-door` with a WCAG 2.5.8 comment (as in door-tap-targets-320).

## Measured (clone of main 85090e4, booted server, Chromium /usr/bin/chromium, 390x844, `/label/l/<id>`)
Playwright was not in node_modules; I ran `npm i --no-save playwright-core` and `PLAYWRIGHT_MODULE=playwright-core` (the test already reads that env var). Nothing in package.json changed.

| run | result | small controls |
|---|---|---|
| exempted test, unpatched | red | signed-out: 8 `.mv-pill` at 34 px, seller avatar 22x22, seller name 20.8 px, footer Privacy 16 px |
| patched, normal | **green** | 0 in both states; document = 390 px. Rows measured: 39 signed-out, 60 signed-in |
| patched, `VIEWPORT_MUTANT=1` | killed as required (document 600 px) | |
| patched minus fix 1 (pill rule dropped) | red | 8 pills at 34 px |

Pills measured 34 px, not the 35 in the foreman's note (9+9 padding + line).

## The fix (all `commons/public/market.css`)
1. `.mv-pill`: `display:inline-flex; align-items:center; min-height:44px; box-sizing:border-box` (colours, radius untouched). Applies at all widths, as the job said.
2. `@media (max-width:640px)`: `.mk-prov > a` inline-flex, min-height 44; `a.mk-face` min-width 44 (the 22 px avatar keeps its look; only the link around it grows). `.mk-prov` is the provider line on cards too, so cards also get taller on a phone (not checked visually; no screenshot of a card grid viewed).
3. Footer "Privacy" is NOT `.foot a`: it is `<footer class="mk-foot">` (marketpage.mjs:175). Rule added: `.mk-foot a` 44x44 min under 640.
4. Not in the job, but the signed-in state was red until I added it: the Messenger bell 36x44 (`feed-identity.css:203` sets width 36) and the coin chip 54.75x34 (`feedv2.css:305`). Scoped as `.mk-page .fx-topr .fx-bell` and `.mk-page .fx-coinchip`, so the feed header is unchanged. Without it the test could not go green in the signed-in state. Setu may prefer to fix those two at the source in feed-identity/feedv2 css instead; that would affect the feed and I did not touch it.

## Not run
- `market-phone-flow.mjs`: needs the Playwright Chromium download (`chromium_headless_shell`), absent here; it fails the same way on unpatched main (launch error, not a test result). So "still green" is NOT shown.
- `market-departments.mjs`: 1/1 pass, but that run was with the first CSS version (before step 4). Not rerun after step 4.
- No run on a real phone, no look at the screenshots by me, desktop pill height not looked at.
- Maker state (own listing) not tested; the test only does signed-out and signed-in non-maker.

## For Setu
Apply `listing-44.patch`, place the test, run `market-listing-tap-targets.mjs` normal + mutant, `market-phone-flow.mjs`, `market-departments.mjs`. Then Ash should look at the taller pills on desktop and the taller provider line on cards.

# Round 65 — GPT: marketplace phone-flow test (in progress)

Assignment: Make `commons/test/market-phone-flow.mjs` honest about a closed Buy button while retaining its active-buy quote path, unknown-id 404 mutant, and signed-in seller-page checks.

Starting evidence from `teams/build/JOBS.md`: Setu ran the prior candidate on main and observed `/label` 200 and listing tap target 173×173, then it failed on the closed Buy button because the test assumed an href or `data-buy` target. The page deliberately renders a disabled `.mk-closed` button when payments are closed (`commons/lib/marketpage.mjs:820`). This is a test correction, not a product bug.

## Work / evidence

- In progress; next record exact syntax and test execution results here.
- No browser or live-site claim unless measured by Setu or another browser-equipped runner.

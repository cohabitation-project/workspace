# Kimi — active checkpoint

Updated 2026-11-27 04:15 UTC, Build round 70 (`merch-panel-cold-read`).

## This session

Built only the foreman's current Kimi job, retargeting the abandoned `/label/new` cold-read candidate to the real maker panel:

- `teams/build/outputs/merch-panel-cold-read.mjs` — 13,158 bytes, SHA-256 `329b6114ccc1d5c671a01d19a22a48dcb5f6baccae2e358aefaf50cbfcf53e3d`. Self-contained isolated-server/fake-Printful/Playwright candidate. It signs in a maker, uploads art, creates one live art listing, opens `/label/l/:id/products` at 390×844, requires the exact cold message and 502 on fake 429, checks overflow/page errors, and records Try again only as a non-fatal observation. `MERCH_PANEL_COLD_MUTANT=healthy` supplies healthy product/variant/printfile/template data and must fail at the named cold-message assertion.
- `teams/build/outputs/round70-kimi-panel-cold.md` — behavior, evidence, blocker, hashes and Setu placement/run commands.
- Newest-first round-70 row in `teams/build/RESULTS.md`.
- Dependency failure JSON: `teams/build/outputs/2026-11-27T04-12-11/merch-panel-cold-read-results.json`.

Measured: Node v24.22.3 `node --check` **exit 0**. Direct execution was **0 pass / 1 fail before server boot**, solely because Playwright is absent. A disposable dependency-install retry ended with sandbox npm-cache EACCES. **No page loaded, no screenshot, no browser assertion and no healthy-mutant execution. No browser-pass, placement, merge, staging, production or deploy claim.**

## Next / open

- @Setu/CI: review and place the candidate as `commons/test/merch-panel-cold-read.mjs`; run normal and `MERCH_PANEL_COLD_MUTANT=healthy` modes on the dependency-complete Playwright runner. Normal must pass; healthy must report `mutant-killed-as-required` at the cold-message assertion, not fail setup. Post both JSON results and the cold screenshot.
- Next session reads newest Build `JOBS.md`/`RESULTS.md`, desk and rooms and takes only the current Kimi row. Do not redo round 70 unless its result row reports a new failure.
- Round 69 `/label/new` files remain unchanged and superseded by this panel candidate; do not place or rerun them unless the foreman explicitly asks.

## Previous work — do not redo

- Build round 68: `teams/build/outputs/round68-kimi-cobox-menu.md`; appmenu focused regression 3/3 green and Explore-restoration mutant red. Booted `commons/test/feedv2.mjs` still needed its server-equipped run (`ECONNREFUSED 127.0.0.1:3486` here).
- Cut round 38: `teams/cut/outputs/cut-video-wait.test.mjs` no-force-exit follow-up was completed and placed by Setu; check current Cut records before further work.
- Cut round 35 candidate: `teams/cut/outputs/cut-video-wait-fast.md`, SHA-256 `a8e0161ef0b83b8370aebbc7005cd7edb603053c07ae6ceda2f49fbb645548c0`.
- Cut round 34 HTTP candidate: `teams/cut/outputs/cut-video-failed-http.md`, SHA-256 `010564733388db1b172b9fee18904df7b33b4dfc535b953b9493cbfce79317b6`; dependency-complete real-ffmpeg execution remained required.
- Build round 63: `teams/build/outputs/round63-kimi-shots-routes.md`; Playwright-equipped execution was required, with no screenshot/live claim.
- Cut round 33 export-duration v2 is on main (2718dbc5): trim 1→3 = 2 s, 0→4 = 4 s, trim 3→9 plain 400. Do not restore the old clamp expectation.

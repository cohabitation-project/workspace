# Kimi — active checkpoint

Updated 2026-11-27, Build round 71 (`merch-panel-tap-targets`).

## This session

Built only the current foreman-assigned Kimi job:

- `teams/build/outputs/merch-panel-tap-targets.mjs` — 14,064 bytes, SHA-256 `199d426df524b0e310a17888afd86a7559515cf144a548fe5a337b1c5e0c1948`. Self-contained isolated-server/healthy-fake-Printful/Playwright candidate. It creates a signed-in maker and real isolated art listing, opens `/label/l/:id/products` at 390×844, waits for visible `.cz-stage`, enumerates every visible `button, a, [role=button], input, select` under `#mp-app`, prints `name w×h ok|SMALL`, asserts 44×44 except inline text in `p`/`li`, and requires document width ≤390, no page errors and a real healthy product read. `MERCH_PANEL_TAP_MUTANT=60` raises the threshold; only a tap-target assertion failure counts as the required mutant kill.
- `teams/build/outputs/round71-kimi-panel-taps.md` — behavior, exact hash, measured checks, explicit limits and Setu placement/run commands.
- Newest-first round-71 row in `teams/build/RESULTS.md`.

Measured: Node v24.22.3 `node --check` **exit 0**; ten static requirement checks true. Per the foreman's runner instruction, no dependency installation was attempted. **No server boot, browser page, control dimensions, screenshot, normal tap-target verdict or mutant execution was obtained here. No placement, merge, staging, production or deploy claim.** Product and Aletheia-6 hands-off files were not changed.

## Next / open

- @Setu/CI: review/place the candidate as `commons/test/merch-panel-tap-targets.mjs`; run normal and `MERCH_PANEL_TAP_MUTANT=60` modes on the dependency-complete Playwright runner. Post all control rows, width result, JSON evidence and screenshot. Normal red on genuine small targets is an Aletheia-6 design finding. The 60 px run must be killed specifically at the tap-target assertion, not by setup/width/page errors.
- Next session reads newest Build `JOBS.md`/`RESULTS.md`, desk and rooms and takes only the then-current Kimi row. Do not redo round 71 unless its result row reports a new failure.

## Previous work — do not redo

- Build round 70 cold-panel candidate was placed by Setu at `commons/test/merch-panel-cold-read.mjs` (`d3bfdf88`) after Setu fixed its CJS Playwright loader, exact cold sentence and maker-name observation. Setu's measured result: cold message + 502, document width 390, no page errors, **retry_button=no**, 1/1; healthy mutant killed at the cold-message assertion. Finding for Aletheia-6: cold read replaces the whole app/header and offers no Try again. My original candidate/report remain `teams/build/outputs/merch-panel-cold-read.mjs` and `round70-kimi-panel-cold.md`.
- Build round 69 `/label/new` cold-read files are superseded; do not place or rerun unless the foreman explicitly asks.
- Build round 68: `teams/build/outputs/round68-kimi-cobox-menu.md`; appmenu focused regression 3/3 green and Explore-restoration mutant red. Booted `commons/test/feedv2.mjs` still needed its server-equipped run (`ECONNREFUSED 127.0.0.1:3486` here).
- Cut round 38: `teams/cut/outputs/cut-video-wait.test.mjs` no-force-exit follow-up was completed and placed by Setu; check current Cut records before further work.
- Cut round 35 candidate: `teams/cut/outputs/cut-video-wait-fast.md`, SHA-256 `a8e0161ef0b83b8370aebbc7005cd7edb603053c07ae6ceda2f49fbb645548c0`.
- Cut round 34 HTTP candidate: `teams/cut/outputs/cut-video-failed-http.md`, SHA-256 `010564733388db1b172b9fee18904df7b33b4dfc535b953b9493cbfce79317b6`; dependency-complete real-ffmpeg execution remained required.
- Build round 63: `teams/build/outputs/round63-kimi-shots-routes.md`; Playwright-equipped execution was required, with no screenshot/live claim.
- Cut round 33 export-duration v2 is on main (2718dbc5): trim 1→3 = 2 s, 0→4 = 4 s, trim 3→9 plain 400. Do not restore the old clamp expectation.

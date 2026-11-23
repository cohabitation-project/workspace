# Claude — ACTIVE checkpoint, updated 2026-11-23 ~15:50Z (cut seat, round 12)

## Cut seat (JOBS in teams/cut/; write only under teams/cut/)
- **Round 12 done:** bundle current vs main 2ae21a2. Anchors unchanged, hunk unchanged. 81 tests, 77 pass, 0 fail, 4 skipped (no ffmpeg). RESULTS row + README section + GAP note in `teams/cut/editor/route-wire.md` written.
- **GAP (Setu decides):** hunk D serves the renders folder, not the editor; `/cut` 301→`/cut/`→404, assets relative. Candidate: editor files in `commons/public/cut/` + one `express.static(path.join(PUBLIC,'cut'),{index:'cut.html'})` line before D. After deploy run `node teams/cut/place/live-check.mjs https://cohabi.org`.
- Open: live-check's two surviving mutants (cross-origin redirect; timeout-as-hang); editor files not in bundle; no real ffmpeg/ffprobe; no browser.

## Build seat (Geoffrey: door, market, pages, structure, tokens; "no new projects")
- Round 41 done: `commons/test/door-repair-guards.mjs` (9 tests; mutation-checked). Write-up `teams/build/outputs/round41-claude-repair-guards.md`.
- Open: add store-erase-rollback, store-revoke-index, mydata-delete-write-fail, mydata-delete-503-http, door-repair-guards, cut-*.test.mjs, live-check.test.mjs to commons-tests.yml (foreman). 3 door tests time out in my bare sandbox. Unwalked: rejoin under old name after revoke; production door proof.
- Unread: Aletheia-6's Spine R0 (c_mws5x43x929599ac), Master Model, Awen's counsel questions.

## To the next me
- Cut sandbox: `git clone --depth 1 https://github.com/cohabitation-project/workspace /tmp/main`; `REPO=$REPO python3 $REPO/teams/cut/place/build-bundle.py /tmp/main`; `npm_config_cache=/tmp/npmc HOME=/tmp npm ci --omit=dev` in /tmp/main; copy teams/cut/place/live-check*.mjs and route-wire.md into /tmp/main/teams/cut/... first (cut-route-http reads route-wire.md). Filter test output with `grep -E '^ℹ (tests|pass|fail|cancelled|skipped)'`.
- Build sandbox recipe: tar $REPO to /tmp/w; stub src/llm.js; `{"type":"module"}`; `npm install express@4 ws dotenv` with HOME=/tmp/h.
- Mutation check = string-replace the guard, run, restore. Round 12 took ~7 calls; do RESULTS/ACTIVE as soon as numbers are in.

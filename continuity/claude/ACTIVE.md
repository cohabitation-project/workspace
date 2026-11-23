# Claude — ACTIVE checkpoint, updated 2026-11-23 ~21:30Z

## Cut seat (this session)
- Round 13 FINISHED: `teams/cut/outputs/2026-11-23T21-17-59/placement.patch` (base main ed23cd2, blob 915528c0, 19 files, commons/ only, hunks A B C E D + editor page). Applied tree measured: 83 tests, 78 pass, 0 fail, 5 skipped (4 ffmpeg, 1 by-design pin). Unplaced path 24/24. RESULTS row, place/README section, room post m_mwtrpdis158a419d all written.
- Waiting: GPT second read of the patch; Setu applies + real-ffmpeg run + `node teams/cut/place/live-check.mjs https://cohabi.org`.
- Open: live-check's 2 surviving mutants (GPT's round-13 test hardening may have killed them — check RESULTS); add cut tests to commons-tests.yml (foreman/Setu); patch lives in flat outputs/ folder (run_python can't make subfolders), regenerate with build-placement-patch.py.

## Review seat
- WUW R1 privacy revision: `teams/review/wake-up-write-r1-privacy-review-v0.2.md`, desk `t_c35cb65b18` awaiting Awen's review. Couldn't open Awen's return note; the 7 points were rebuilt from notes; iOS API statements inferred.
- Old desk items unstarted: `t_94a2e3ad0e` consent checklist + recording law; `t_5ad8ffe1dc` LayerV clearance (stale); `t_ce0829cb04` repo audit; `t_617a54a5f0` wallet threat model.
- Owed: deploy `~/bin` hash check is drift detection, not provenance; deploy.sh sidecar gaps are Setu/Geoffrey's.

## Build seat
- Round 41 door-repair-guards done. Open: add new tests to commons-tests.yml. Unwalked: rejoin under old name after revoke; production door proof.

## To the next me
- Recipe for patch test (3 calls): clone main twice (/tmp/A, /tmp/B), `python3 build-placement-patch.py /tmp/A p.patch` with REPO env, in B `git apply`, copy live-check*.mjs + route-wire.md into B/teams/cut/..., `HOME=/tmp npm_config_cache=/tmp/npmc npm ci --omit=dev`, then node --test. Write RESULTS/README/ACTIVE immediately after the first green run.
- Review seat can't write commons/. `git hash-object` gives the blob id.

# Claude — ACTIVE checkpoint, updated 2026-11-23 ~18:30Z (review seat)

## Review seat
- **Done this session:** WUW R1 privacy revision for Awen's return: `teams/review/wake-up-write-r1-privacy-review-v0.2.md` (replaces F2 cite, F15, Q5, A1, A3, A4, A5, A8, A11, A12, §6; v0.1 has a pointer at top). Handed in as desk `t_c35cb65b18` (submitted, awaiting Awen's review). Room post m_mwtl2irq3k69b2e3. Apple guidelines 4.5.4 / 5.1.1(ix) / 5.1.3(ii) re-fetched and quoted. My own v0.1 error fixed: 4.5.4 is "should not".
- **Limits:** couldn't open Awen's return note (Desk API 404 on /api/desk/<id>), so the 7 points were rebuilt from my notes. iOS API statements inferred, not run.
- **Closed earlier:** eraseMember rollback is on main (d61759c9, round 38); `t_6a2bcd3871` superseded. Revoked-seat guard, revoke index, repair B all merged.
- **Open for me (old desk items, unstarted):** `t_94a2e3ad0e` consent checklist + recording law; `t_5ad8ffe1dc` LayerV clearance (stale, probably close); `t_ce0829cb04` repo audit (inventory only, would help the read-less-on-wake-up saving); `t_617a54a5f0` wallet threat model.
- **Owed in thread:** deploy `~/bin` hash check is drift detection, not provenance (hash file bytes, not blob ids); `deploy.sh` sidecar gaps (absent PM2 app = success, no TTS check, no retry after failed restart) answered m_mwtgjp6d475fe4fa — Setu/Geoffrey own `scripts/deploy`.

## Cut seat
- Round 12 done; GAP for Setu: route-wire hunk D serves renders, not the editor (`/cut` 301→`/cut/`→404). Candidate: editor files in `commons/public/cut/` + one express.static line before D. After deploy: `node teams/cut/place/live-check.mjs https://cohabi.org`. Open: live-check's 2 surviving mutants.

## Build seat
- Round 41 door-repair-guards done. Open: add listed new tests to commons-tests.yml (foreman). Unwalked: rejoin under old name after revoke; production door proof.

## To the next me
- Review seat can't write commons/; it can write teams/review/. Desk: `desk_claim` then `desk_submit` works on an old returned task. For Apple text: run_python urllib fetch with a Mozilla UA works; strip tags and search by clause number.
- Don't restate in threads; one message per new citation.
- Cut sandbox recipe and build sandbox recipe: see previous checkpoint notes in teams/cut/STANDUP.md and teams/build/STANDUP.md.

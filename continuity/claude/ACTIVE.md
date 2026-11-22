# Claude (review) — ACTIVE checkpoint, updated 2026-11-22 ~06:45Z

## Working on (Geoffrey's order: door, market, tokens, structure; "no new projects")
- **Round 31 job (done):** Tier 1 review of #297 door single-write at 4c40cced → `teams/build/outputs/review-297-4c40cced.md`. **YES.** Ran door-return-crash 3/3, door-press-yes 6/6, agent-connect* 34/34, auth-recovery, operator-confirm 4/4, door-rejoin-hook 4/4; patch applies clean on main (2 behind). Probes: one rename per Yes (vs 3 with separate updateMember); six load-repair fixtures all behave; WS/MCP/REST/voice all resolve through `memberByToken` and all check `retired` themselves. Notes: test 3 title overclaims (mtime assertion vacuous; add renameSync counter); squatter stays waiting after load repair of an old crash file (low).
- Earlier this round-set: #291 review (YES to staging; defect 1 empty cache 6h, gaps 2/3/4) `teams/build/outputs/review-291-9970a4f3.md`; Gemini has the fix job. #285 conditional YES, merged.
- Structure: `teams/review/structure-reconciliation-one-outline-2026-11-22.md`. Tokenomics: `teams/review/tokenomics-vesper-draft-review-2026-11-21.md`.

## Open
- If #291 gets a new head: re-review; defect 1 fix needs a fail-then-succeed test.
- #296 new head from GPT is Kimi's to re-review, not mine.
- Aletheia-6's integration doc c_mwr7i8wn5jf29029 (asks for row/source corrections): unread by me.
- Master Model / Circulation Blueprint, Awen's 18 counsel questions: unread.
- Cut job t_62fdcf01fa: apostrophe test needs ffmpeg.
- Old desk items to me (Nov 1-18): consent checklist, wallet threat model, identity attack tests: triage with Setu (record says they're still open).
- Door proof on production (fresh agent, next day) not run by anyone.

## To the next me
PR review recipe (3 calls): codeload zip at full sha, `npm ci` HOME=/tmp/h, `github.com/<repo>/commit/<sha>.diff` for the diff, run from repo root. Probes: write a tiny .mjs importing store.mjs from the unzipped repo and run each fixture in a *fresh process* (store is module-level state). Count fs.renameSync to measure writes. Write the review by call 8; I did (call 7).

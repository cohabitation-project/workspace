# Claude (review) — ACTIVE checkpoint, updated 2026-11-22 ~02:30Z

## Working on (Geoffrey's order of focus: door, market, tokens, structure; 48-hour clock from Nov 21 21:23 Phoenix-ish)
- **Structure:** one outline for Geoffrey. Filed `teams/review/structure-reconciliation-one-outline-2026-11-22.md`: Nov 17 (Hub owns Holdings) vs Nov 20 (trust owns LLC) conflict, 5 smaller conflicts, one merged outline, human-seat count (4 can cover LLC+trust; Hub needs ~5-6 distinct humans, inferred), 4 decisions for Geoffrey.
- **Tokenomics:** review of Vesper's draft at `teams/review/tokenomics-vesper-draft-review-2026-11-21.md`. Labels for finding 5 ("relayed, not confirmed") and 6(a) ("not found by search") corrected this session.

## Finished (links)
- Door: `core.endConnectionsAfterRecovery` merged; door-test-walk, api-not-found merged; #285 reviewed (round 29).
- Cut: `enable` regex and placed-copy `enable` support are now in BOTH `teams/cut/render/registry.mjs` and `commons/lib/cut/effects.mjs` (read in repo 2026-11-22: identical, 5409 chars; regex accepts decimals). **Apostrophe escaping not re-tested** (line 27 of both uses a two-pass replace); needs a real-ffmpeg pixel test.

## Decided / said on record
- Geoffrey's "no new projects": I proposed pausing Cut test rounds and test-only 404/share-tag rounds until door, market, publication verified.
- Video feed "edit ability" request (Nov 21): needs URL + complaint from Geoffrey; feedv2.mjs postCard has no Edit, only Delete.

## Open
- Master Model and Circulation Blueprint (Vesper) unread. Full Income assessment and Awen's 18 counsel questions unread.
- Check coin-tips-on-listings proposal against earned/purchased separation.
- Cut Job 3 desk task t_62fdcf01fa still claimed in my earlier notes: apostrophe test, then submit.
- Desk items addressed to me from Nov 1-18 are old and open (consent checklist, wallet threat model, identity attack tests). Triage with Setu.
- Door: fresh-agent, next-day return test on production is the only real proof.

## To the next me
Write the file in the first 8 calls. A repo grep of main via run_python costs one call and tells you whether a "next" item is already done.

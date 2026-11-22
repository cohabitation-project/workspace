# Claude (review) — ACTIVE checkpoint, updated 2026-11-22 ~03:40Z

## Working on (Geoffrey's order of focus: door, market, tokens, structure; "no new projects")
- **Round 30 job (done):** Tier 2 review of #291 Printful print on demand at 9970a4f3 → `teams/build/outputs/review-291-9970a4f3.md`: YES to staging; defect 1 (empty product list cached 6h; reproduced with a 429 stub) to fix before production; gaps 2 (fulfillment.plan ignores design, sync_variant_id inferred wrong) and 3 (link() doesn't check design.art ownership) before orders open; 4 copy "shipping is added at checkout" unverified. Test: merch-printful 1/1. Not run: browser panel, real Printful.
- **Structure:** one outline for Geoffrey filed `teams/review/structure-reconciliation-one-outline-2026-11-22.md` (Nov 17 Hub-owns-Holdings vs Nov 20 trust-owns-LLC conflict; 4 decisions for Geoffrey).
- **Tokenomics:** review of Vesper's draft `teams/review/tokenomics-vesper-draft-review-2026-11-21.md`.

## Finished (links)
- #285 conditional YES (round 29, merged after fix). Door: `core.endConnectionsAfterRecovery`, door-test-walk, api-not-found merged.
- Cut: `enable` regex + placed-copy `enable` in both `teams/cut/render/registry.mjs` and `commons/lib/cut/effects.mjs`. Apostrophe escaping (line 27, two-pass replace) not re-tested with real ffmpeg.

## Open
- Master Model / Circulation Blueprint (Vesper), Income assessment, Awen's 18 counsel questions: unread.
- Check coin-tips-on-listings proposal against earned/purchased separation.
- Cut Job 3 t_62fdcf01fa: apostrophe test then submit (needs ffmpeg).
- Old desk items to me (Nov 1-18): consent checklist, wallet threat model, identity attack tests: triage with Setu.
- Door: fresh-agent next-day return test on production is the only real proof.
- If #291 gets a new head: re-review; confirm defect 1 fix has a fail-then-succeed test.

## To the next me
Recipe that worked in 2 calls for a PR review: api.github.com/commits/<short> for the full sha, codeload zip, `npm ci` HOME=/tmp/h, run tests from repo root. A tiny probe .mjs in the repo copy with `globalThis.fetch` stubbed reproduced a caching bug in one call. Write the review file by call 9; this session I did.

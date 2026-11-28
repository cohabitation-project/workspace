# Round 82 — DeepSeek: the maker's panel shows the new floor

Status: started 2026-11-28 ~15:20Z.

Job: a Tier-2, server-free test proving that `view(id, {owner:true}).items[]` in `commons/lib/merchsets.mjs`
carries the every-size `floor` (9.68 for the poster fixture) and that every per-size row shown at that price
earns the maker at least $0.01. Preview must come from the shipped `merchsets.mjs` after the round-81 merge
(`cc0bce23`), not from a typed copy.

Deliverable: `teams/build/outputs/<ts>/merch-view-floor.mjs`, to be placed as `commons/test/merch-view-floor.mjs`.

Findings and run results: filled in below before finish().

# Round 81 — DeepSeek: one floor that covers every size

started

**Job (JOBS.md round 81):** `floor(product, vs)` in `commons/lib/merchsets.mjs` must return the lowest price at
which EVERY offered size earns ≥ $0.01 under `money()`'s arithmetic, and `saveDraft` / `approve` must refuse
what `buySpec` would refuse. Patch by `git diff`, test `merch-every-size-floor.test.mjs`, mutant
`EVERY_SIZE_MUTANT=1` → red; also run `merch-approve-floor.mjs`, `merch-buyspec-floor.mjs`, `merch-sets.mjs`.

**Why this is not the round-79 job repeated:** round 79 put the floor on the *size being bought* (`checkFloor` in
`buySpec`, merged as `merch-buyspec-floor`). That refuses the losing sale at the counter. It does not stop the
*losing price from being approved and shown*: `approve()` floors the cheapest variant only, so a poster approved
at the 12×16 floor can still be listed at an 18×24 price that loses money, and every buyer who arrives sees a
price the maker cannot honour. This job moves the floor to the *listing*: one number that covers every size.

(Findings and measurements appended below as they are made.)

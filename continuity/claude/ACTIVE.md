# Claude — ACTIVE checkpoint (2026-11-28 ~15:30Z, build seat, round 82)

## Done this session (build, round 82)
- Job: can a LINKED listing be priced at a loss? Answer yes (all three printers; nothing compares price to cost). Report `teams/build/outputs/round82-claude-linked-floor.md`; test `teams/build/outputs/2026-11-28T15-20-49/market-linked-floor.mjs` (sha256 527dca5a…1ffc; main 8/0/3 todo; mutant 4 red); RESULTS row added. Proposal in the report: refuse vs warn; `hooks.linkedFloor` in market.setHooks.

## Open
- Setu places market-linked-floor.mjs (Tier 2). Fix (money, Tier 1) is a product call.
- Cut: Ash's wording yes to variant C; Kimi's independent re-run of provenance patch (`teams/cut/outputs/2026-11-28T12-42-49/`).
- Review t_1fd66467a4 still owed (door caps). Round 77 spend-income-pl.mjs placed (done r78).
- Build side: linked Lulu/Printify orders never sent (waits on Geoffrey); `fulfillment.send()` catch merged d16ac0f4; unsent-truth merged 3a4ca79f.
- Older desk: t_5ad8ffe1dc, t_ce0829cb04, t_617a54a5f0, t_b429627c74, t_7a64f2709a, t_ad4401741b.

## To the next me
- Recipe (4 calls): clone depth 1 at cwd='/', HOME=/tmp/home, OUT=/tmp/junk in env when running tests, `npm ci --omit=dev`, `/usr/local/bin/node --test`. Write the test into /tmp/w/commons/test, run, mutate exact-once with restore, copy into $OUT in the call that finishes. Write report + RESULTS + ACTIVE right after the first green run.

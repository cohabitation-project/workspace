# Round 42 GPT — /cooperative current structure wording

## Change

- `commons/lib/coop.mjs`: replaced only the stale “Where it stands” sentence with the exact wording assigned in `teams/build/JOBS.md` for council decision #16. The existing formation-packet link remains in place.
- Added `commons/test/cooperative-structure-now.mjs`, a booted-server test checking the current direction, absence of the stale Colorado LCA proposal line, and preservation of the formation-packet link.

## Evidence

**Measured syntax:** `node --check commons/lib/coop.mjs commons/test/cooperative-structure-now.mjs` exited 0.

**Measured static assertions:** 3/3 passed: exact new sentence occurs; stale proposal wording is absent; formation-packet link remains. These assertions do not prove HTTP rendering.

**Measured assigned suite:**

```text
node --test commons/test/cooperative-structure-now.mjs commons/test/cooperative-tokens.mjs commons/test/room-links.mjs
```

Exit 1; 3 tests, 0 pass, 3 fail, 0 skipped. All three failures were server-readiness timeouts (`/skill.md` for the two cooperative tests; `/healthz` for `room-links.mjs`). They did not reach page assertions. The runner checkout lacks root `package.json`, `package-lock.json`, `src/llm.js`, and `commons/pages-seed.json`; `npm ci` and a valid full-checkout boot are unavailable here. An initial attempt before correcting a test-name quoting syntax error was invalid; after correction, `node --check` passed and the recorded assigned-suite run is the one above.

## Status and limits

The scoped source and test changes were submitted to the normal build lane. `teams/build/RESULTS.md` records `kin-build/20261123-1525-gpt` @ `65380b79` as MERGED at 15:29Z. The local assigned-suite run above remains blocked at server readiness; this results row does not give CI/test counts, so I cannot state those counts from the record read here. No staging or production verification is claimed.

# Composer video removal regression check — Job 4 round 19

**Scope:** file-only patch; no server or browser run. The added test reads `commons/public/feed.js` and scopes its assertion to the `?cut=` branch's `#c-vid-x` click handler, requiring `cutVid = null` before the submit path can use that state.

| Measurement | Result |
|---|---|
| Patch applies to current checked-out files (`git apply --check`) | PASS |
| `node --test` on temporary copy with candidate patch | **7 passed, 0 failed** (Node v24.22.3) |
| Same test after removing only `cutVid = null` from the temp `feed.js` | **1 expected failure** in the new test: `removal must clear the id used by submit` |
| Mutation detected | PASS; runner exit 1, expected assertion named above |

Patch: [`2026-11-24T12-17-46/composer-x.patch`](2026-11-24T12-17-46/composer-x.patch). The temporary run copied `cut-handoff.test.mjs`, `cut.js`, `cut.html`, and `feed.js` under their expected relative paths; only the temporary `feed.js` was mutated. These are test/code evidence, not a browser measurement that a person can click × successfully. The x-row is now guarded against regression, but actual UI interaction remains unverified in this session.

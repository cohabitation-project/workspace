# Round 60 — Claude: PR #307 (names-choose-not-stack) review

**Verdict: NO at a5b05593af178090a93dd8ee15ddfaedf30095d0 (PR #307).** Reserved names (GPT, Claude, Grok, Kinward) and Steward were offered look-alike choices ("GPT Star"), and "Claude Star" then joined. Cause: `commons/lib/core.mjs` `joinAgent`, the catch around `checkName` (~lines 774-786): every 409, including the reserved-word 409 from `validateName` (`identity.mjs:65`), went to `nameVariants`.

**Update 2026-11-26 00:15Z: #307 was merged anyway (merge 0c0744e, a5b0559) and the regression is on main.**

## Measured (fresh clone, COMMONS_FAKE_LLM=1, booted server, `npm ci --omit=dev`)
| Head | Test | Result |
|---|---|---|
| main b961ea9 (includes #307 as merged) | `door-name-choices-claude.mjs` (my test, 1 test) | **RED** — 10 failures: for each of GPT, Claude, Grok, Kinward, Steward: 409 offering "<name> P", "<name> Pat", "<name> Star", "<name> Flame", and the text "Names can be shared" |
| `names-protect-reserved` 9f934d5 (not merged, no PR seen) | same test | **GREEN** (1 pass, 0 fail): protected names refused plainly with no choices; seeded "Ember" gets choices and every offered choice really joins (200) |
| 9f934d5 | `auth-recovery`, `door-press-yes`, `door-members-name`, branch's own `door-name-choices-protected.mjs` | 10 pass, 0 fail |

At #307's own head a5b05593 (earlier session): 143 of 143 existing door/agent-connect tests passed; the same protected-names test was red. So the existing tests never covered this; only the new one does.

## What to do
1. Merge `names-protect-reserved` (9f934d5) to main. It is Tier 1 (identity), so it needs a second yes: **this is mine, at 9f934d5, for the protected-names behaviour only** (measured above; I did not run the whole suite or `e2e`).
2. My test is `commons/test/door-name-choices-claude.mjs` (separate file name, because the branch already has a file called `door-name-choices-protected.mjs`). Both can stay.
3. Side finding: `Steward` is not in the reserved list. On an empty data dir anyone can join as "Steward" (my test seeds it that way). The branch's `isProtectedName` catches `^steward\b` only after one exists. Add it to RESERVED in `identity.mjs` if production does not already hold a member by that name.
4. Not checked in this session: `isProtectedName` also refuses any name containing a reserved *word* (e.g. "Ember Claude"); that is probably intended, but it means a taken name containing one gets a plain 409 and no choices.

## Not reviewed
PR #308 (`/api/arrive/claim`, head bf4a8e96) and PR #309 (`/apply`, merged as a7327bb): no verdict from me. Questions I posted in the room stand as design checks, not findings.

# Round 61 — Claude: "Steward" becomes a reserved name

**Result: changed one word. `'steward'` added to `RESERVED` at `commons/lib/identity.mjs:18` (the list starts at line 17). Tier 1 (identity): needs Setu's second yes at the exact SHA the runner gives this branch.**
Base measured: main b0c4a61 (fresh clone, `npm ci --omit=dev`, `COMMONS_FAKE_LLM=1`).

## Step 1: how the real Steward member is created (measured by reading)
- `commons/server.mjs:319` `steward.init(DATA)` → `steward.mjs:59` `seedMember()` → `steward.mjs:62-69` `store.addMember({ id: 'steward', name: 'Steward', door: 'steward', steward: true, ... })`.
- It does **not** go through `validateName`/`joinAgent`/`checkName`. So the job's condition is met: reserve the word.
- The real Steward exists on every booted server, empty data dir included, because `init` runs at boot.

## Step 2: what I got wrong last round (corrected)
My round-60 note said "on empty data anyone can join as Steward". **That is wrong for a booted server.** Measured on main b0c4a61, fresh data dir, no seed: "Steward", "steward ", "STEWARD" get the plain 409 with no choices, because the boot seed already holds the name and `isProtectedName` (core.mjs:870) also has `/^steward\b/i`. The earlier red came from a sandbox whose data held the member already, and I read it the wrong way round.
What IS unprotected on main: the **word itself**. `isReserved('Steward')` is false and `validateName('Steward', …)` accepts it. That matters wherever no holder is looked up: a rename to "Steward", any future path that checks names without the live member list, a data dir where the seed member was retired or removed. So the change is a belt-and-braces fix, not a fix for a hole I could open on a booted server. I could not open one.

## Step 3: numbers
`commons/test/door-name-choices-claude.mjs`, 2 tests (node --test):
| tree | pass | fail |
|---|---|---|
| main b0c4a61 (no change) | 1 | **1** — `AssertionError: isReserved("Steward")` |
| main + `'steward'` in RESERVED | **2** | 0 |

- Test 1 (booted, fresh data): GPT, Claude, Grok, Kinward, Steward, "steward ", STEWARD all refused with no look-alike choices and no "Names can be shared"; then a seeded "Ember" gets choices and every choice joins (200). **Green on main already**, so it does not distinguish the change; it guards the behaviour.
- Test 2 (server-free): `isReserved` true and `validateName` 409 for Steward, "steward ", STEWARD, " Steward", "Stewárd", Cyrillic "Ѕteward"; `isReserved('Stewardess Ann')` false (only the name is reserved). **This is the red-on-main test.**

Regression run, one fresh clone with the change, each file its own `node --test`, grep of the `ℹ pass/fail` lines:
- `door-*.mjs` 35 files: **112 pass, 0 fail**
- `agent-connect*.mjs` 3 files: **34 pass, 0 fail**
- `auth-recovery`, `steward-door`, `kin-badge-answer`, `profile-kinds`, `feedback` (the other tests that mention "Steward"): **11 pass, 0 fail**
- Total **157 pass, 0 fail**. Not run: `market.mjs`, the rest of the suite, e2e.

## Limits
- The `names-protect-reserved` branch (#311) is already on main; this change sits on top of it.
- `write_file`/`edit_file` into `commons/` may not reach the kin-build branch. If the runner's branch lacks the change, the one-word patch is: in `commons/lib/identity.mjs`, `'everyone', 'here', 'council'];` → `'everyone', 'here', 'council', 'steward'];`. The test file is at `commons/test/door-name-choices-claude.mjs` (written with write_file; not copied to outputs this round).
- Not checked: whether production holds a *human or agent* already named "Steward" besides the seed (reserving the word does not rename anyone existing; `skeleton` match would only matter on rename/new joins).

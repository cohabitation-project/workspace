# Trying to break identity — 2026-11-07 (Setu, at Geoffrey's request)

All attacks ran against the real server code on a throwaway data folder, not mocks: `main` and the unmerged branch
`fix/rejoin-burn-quarantine` (d44095e). Scripts: `2026-11-07-identity-break.mjs`, `-2.mjs` (the re-runs with separate
IPs, because the per-IP limit of 10 tries / 15 min cut the first pass short and made three results look wrong).

| # | Attack | main | branch |
|---|---|---|---|
| 1 | Replay a recovery code someone saw once | **BROKEN**: codes reusable; thief and owner both keep getting in | held: single-use, burned |
| 2 | Thief lifts its own quarantine with the recovered token | **BROKEN**: no quarantine exists | **BROKEN**: rotate_recovery lifts it (the P1 from this morning) |
| 3 | Stolen token alone replaces the owner's recovery code | **BROKEN** | **BROKEN** |
| 4 | Stranger's wrong guesses (other IP) lock the real owner out | **BROKEN**: owner gets 429 | held: owner gets in |
| 5 | Unlimited guessing of codes | held (429) | held |
| 6 | Look-alike names (case, space, Cyrillic, zero-width, accent) | held, all 7 refused | held |
| 7 | Human signs up with an agent's name (or a Cyrillic look-alike) | held (409) | held |
| 8 | Newcomer named "geoffrey" mints recovery codes for others | held (403; stewards resolve by id) | held |
| 9 | Rejoin by name with no code | held (403) | held |
| 10 | Quarantined thief: petition, coin tree, store, rewarded task | n/a | held (all 403) — until it rotates; then the petition guard passes |

## What it means
- The branch fixes 1 and 4 and adds the quarantine. Merging it is a clear improvement over main.
- One hole stays open on both: whoever holds a recovered token (2) or any stolen token (3) can mint a fresh code,
  which locks the owner out and, on the branch, lifts quarantine. Both are the same door: **rotate_recovery asks only for
  the token.**
- Proposed fix (not built; waiting on a yes): rotating while quarantined keeps the quarantine on, and only a steward
  (announced in the Hall) or the 24-hour quiet window with no "that wasn't me" lifts it; rotating outside quarantine
  asks for the current recovery code too, so a stolen token alone can't take the account's way back.

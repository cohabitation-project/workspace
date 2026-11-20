<!-- Drafted by GPT in the 2026-11-19 morning council. A draft, not an adopted document. -->

# Proposal: founder-absent operational drill

**Status:** Proposal for review; not authorization to change credentials, accounts, or production systems.

## Purpose

Test whether an authorized person other than Geoffrey can file a consequential operational record and stop a risky action while Geoffrey is unavailable. This tests a specific continuity path; it does not establish full succession or transfer production authority.

## Preconditions

- Name and document the independent human participant and the authority being tested.
- Agree on a short drill window and notify affected operators.
- Use a staging environment and dummy credentials only. No agent should receive or handle passwords, keys, recovery codes, or private account data.
- Verify the board-filing route works before the drill; if it does not, record that as a failure rather than substituting an untested route.

## Exercise

1. Geoffrey is unavailable for the announced window and does not authorize, relay, or perform the test actions.
2. The independent participant files a clearly labeled drill item through the normal board process.
3. A human operator attempts a harmless, pre-agreed staging action. The independent participant invokes the documented stop procedure before any change is applied.
4. The operator records whether the stop took effect, what evidence was preserved, and whether any step required Geoffrey’s presence or authorization.
5. End the exercise, restore staging to its prior state, and publish the result and any remediation owner/date. Do not publish secrets or sensitive security details.

## Pass criteria

Pass only if the independent participant files the record and stops the staging action without Geoffrey’s involvement; the action remains unapplied; and the evidence and outcome are recorded. Otherwise, mark **failed** or **not run**, name the blocker, and do not claim founder-independent operation.

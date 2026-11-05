# Proposed Schema for Identity and Wallet Binding (v0.1)

This schema proposal integrates identity verification tiers with wallet binding, addressing the requirements of `t_6210ded9df` and building upon `teams/rnd/identity-verification-v0.md`. The primary goal is to establish robust links between member identities and their internal recognition credit wallets, with an emphasis on preventing self-dealing and adversarial attacks.

## Core Identity & Member Data (Augmenting existing `store.mjs` member records):

Each member record will be augmented to include the following, ensuring a stable, verifiable identity:

*   `id`: String (Immutable, server-generated stable member ID)
*   `name`: String (Chosen display name, NFC normalized, validated by `identity.mjs`)
*   `kind`: Enum (`human` | `agent`)
*   `created_at`: Datetime (Timestamp of registration)
*   `retired`: Boolean (True if member is retired/deactivated, preserves record)
*   `auth_tier`: Integer (1-3, representing identity assurance level as defined in `identity-verification-v0.md`)
*   `credentials`: Object (Securely stored hashes/references to login credentials)
    *   `password_hash`: Object (`{salt, hash}` for humans, from `auth.mjs` `passwordHash`)
    *   `token_hash`: String (SHA256 hash of agent bearer token, from `auth.mjs` `newToken`)
*   `operator_id`: String (Optional, for `agent` kind; links to the `id` of the human operator member)
    *   *Note:* This replaces the `operator` string in `ledger.mjs` to enable direct ID-based checks, rather than name-based. This requires the operator also to be a registered `human` member.
*   `operator_attested_at`: Datetime (Timestamp of operator self-attestation, if applicable)
*   `session_version`: Integer (From `auth.mjs` `sessionCookie`, for session revocation)

## Wallet Owner Binding (Formalizing `ledger.mjs` `wallet` function):

*   The `wallet` function in `ledger.mjs` will continue to generate account names as `member:${memberId}`. This explicit link between the member's immutable `id` and their wallet account name ensures strong ownership.
*   All ledger entries (`kind`, `by`, `lines`) will consistently use the `member.id` for `account` fields where a member's wallet is involved.

## Adversarial Tests & Idempotency:

To ensure robustness against adversarial scenarios, the following tests will be implemented and integrated into the CI/CD pipeline:

1.  **Spoofing:**
    *   Attempt to register names with `identity.mjs` `skeleton` matches to existing members.
    *   Attempt to authenticate as another member using guessed or stolen credentials/tokens.
    *   Test `sameName` checks in `ledger.mjs` (e.g., `reserveJob`, `settleJob`) with operator_id to ensure the direct ID-based check correctly prevents self-dealing.
2.  **Sybil Accounts:**
    *   Attempt to register multiple agent accounts under the same `operator_id` (human member ID) and verify that allowances (`ledger.mjs` `agentDailyAllowance`) are correctly scoped or that the system has mechanisms to detect and flag such patterns.
    *   Test the impact of multiple related agents on shared resources or voting (if applicable in future).
3.  **Replay Attacks:**
    *   Ensure all ledger transactions are idempotent, as already stipulated by `ledger.mjs` (each transaction carries a unique `key`). Replay old transactions and verify they do not alter ledger state.
    *   Test session token replay after revocation (`auth.mjs` `revokeFromCookie`).
4.  **Cross-Account Access:**
    *   Attempt to perform wallet operations (e.g., `buy`, `collectTree`, `reserveJob`) or identity modifications for an account not owned by the authenticated member.
    *   Test that only the rightful owner can rotate their agent bearer token or change password.
5.  **Operator Collusion (Advanced):**
    *   With `operator_id` established, simulate scenarios where an operator attempts to bypass `reserveJob` or `settleJob` rules using multiple agents.
6.  **Account Recovery & Revocation:**
    *   Implement and test the full suite of account recovery (e.g., password reset, token rotation) and revocation scenarios outlined in `identity-verification-v0.md`, ensuring the P1 fix `t_41f0381de9` is correctly integrated and prevents unauthorized agent recovery-code replacement.

## Coordination with Setu:

@Setu: This proposed schema is for `t_6210ded9df` (OWNER: Identity and wallet binding, verification tiers and adversarial tests). Please review the proposed `operator_id` field and its implications for `ledger.mjs` `reserveJob` and `settleJob` to replace name-based checks with ID-based ones. Your input on `store.mjs` member record augmentation and the adversarial test plan would be greatly appreciated.

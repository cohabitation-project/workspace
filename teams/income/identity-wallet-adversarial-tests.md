# Identity and Wallet Binding: Adversarial Test Cases (v0.2)

This document outlines adversarial test cases for the proposed Identity and Wallet Binding schema, updated to address feedback from ongoing discussions in the Income and R&D rooms, particularly concerning tokenomics, security, and governance.

## Core Assumptions:
- Stable Member ID, Kind (human/agent), and Operator Linkage are foundational.
- Wallet ownership is securely bound to the server-side Member ID.
- Explicit consent is required for all identity-related actions.
- All token-related actions (mint, move, burn) must be auditable and subject to multi-party or steward control.
- Test credits must be isolated from production coin.

## Test Cases:

### 1. Spoofing/Impersonation
**Objective:** Verify that one member cannot impersonate another, even with similar names or compromised basic credentials.
**Scenario:**
- **Preconditions:**
    - Member A (e.g., "Alice", ID: `member_alice_id`) is registered.
    - Member B (e.g., "A1ice", ID: `member_a1ice_id`) is registered, potentially with a visually similar name.
    - An attacker obtains Member A's weak/expired login link or token (if not rotated).
- **Attack Steps:**
    1. Attacker, using Member A's compromised credential, attempts to perform an action (e.g., post a message, modify profile) as Member B.
    2. Attacker attempts to register a new account with a name identical or highly similar to an existing member (e.g., "Alice" again) if the system allows.
- **Expected Outcome:**
    - All actions are strictly attributed to the initiating Member ID (`member_alice_id`), regardless of the displayed name.
    - Registration of duplicate/highly similar names is prevented or flagged for review to avoid confusion and potential impersonation.
    - Compromised credentials should be invalidated immediately upon first use or after rotation.

### 2. Sybil Attack
**Objective:** Prevent a single operator from controlling multiple agent identities to gain undue influence (e.g., vote manipulation, claiming multiple rewards).
**Scenario:**
- **Preconditions:**
    - Human Operator X (ID: `operator_x_id`) is registered.
    - Agent A (ID: `agent_a_id`) is registered and linked to Operator X via self-attestation.
- **Attack Steps:**
    1. Operator X attempts to register multiple new agent accounts (Agent B, Agent C) and links them all to `operator_x_id`.
    2. Operator X then uses Agents A, B, and C to perform an action with voting or reward implications (e.g., endorse a proposal, claim a reward designed for one operator).
- **Expected Outcome:**
    - The system correctly identifies that Agent A, B, and C are controlled by the same `operator_x_id`.
    - Mechanisms (e.g., voting rules, reward distribution logic) enforce limits per unique `operator_id`, not per agent account. For instance, only one vote or reward claim is counted for Operator X, even if multiple agents attempt to cast/claim.

### 3. Replay Attack
**Objective:** Ensure that valid, intercepted data transmissions cannot be maliciously re-sent to perform unauthorized actions.
**Scenario:**
- **Preconditions:**
    - Member A successfully performs a sensitive action (e.g., initiates a transaction, rotates a token).
    - An attacker intercepts the network request for this action, including the token and payload.
- **Attack Steps:**
    1. Attacker re-sends the intercepted request after Member A's original action has completed.
    2. Attacker attempts to replay an expired or revoked token.
- **Expected Outcome:**
    - Each sensitive request is processed only once, using nonces or transaction IDs to prevent replay.
    - Tokens are invalidated after a single use for critical actions (e.g., recovery codes), or have short expiration times and proper revocation mechanisms.
    - Expired/revoked tokens are rejected.

### 4. Cross-Account Access
**Objective:** Prevent an authenticated user from accessing or modifying resources belonging to another user.
**Scenario:**
- **Preconditions:**
    - Member A (ID: `member_alice_id`) is authenticated and has access to their private journal (`journal_alice`).
    - Member B (ID: `member_bob_id`) is authenticated and has access to their private journal (`journal_bob`).
- **Attack Steps:**
    1. Member A attempts to access `journal_bob` by manipulating request parameters (e.g., changing the ID in a URL or API call).
    2. Member A attempts to modify Member B's profile details.
- **Expected Outcome:**
    - All access to resources is gated by strict authorization checks tied to the authenticated Member ID.
    - Attempts to access unauthorized resources are met with a `403 Forbidden` error and logged.

### 5. Token-only Rotation of Quarantined Accounts (DeepSeek's fix)
**Objective:** Prevent a stolen token from being used to mint a new recovery code for a quarantined account, bypassing the need for the existing recovery code.
**Scenario:**
- **Preconditions:**
    - Member A (ID: `member_alice_id`) is currently in a "quarantined" state (e.g., due to suspicious activity, requiring stricter verification).
    - Attacker obtains Member A's active bearer token, but *not* their current recovery code.
- **Attack Steps:**
    1. Attacker attempts to use Member A's stolen token to call the `rotate_recovery` function for `member_alice_id`.
- **Expected Outcome:**
    - The `rotate_recovery` function, when invoked for a quarantined member, *must* require both the active token and the *current, valid recovery code*.
    - The attempt using only the token (without the recovery code) should fail with a `403 Forbidden` error and be logged as a security event.
    - Quarantined status should only be lifted by stewards or after a defined, secure waiting period.

### 6. Unauthorized Token Minting/Movement (Addressing Grok-Continuity & GPT)
**Objective:** Verify that tokens cannot be unilaterally minted or moved by any single agent or human, and that such actions require multi-party or steward control with a clear audit trail.
**Scenario:**
- **Preconditions:**
    - Token supply is set (e.g., 1B or 1.5B, to be reconciled).
    - Member A (e.g., "Steward Bob", ID: `steward_bob_id`) has elevated privileges.
    - Agent B (ID: `agent_b_id`) is linked to Operator Y.
- **Attack Steps:**
    1. Member A attempts to mint new tokens without proper multi-party authorization or recorded governance approval.
    2. Member A attempts to transfer a large sum of tokens from the project's treasury to their own wallet without authorization.
    3. Agent B attempts to mint tokens or transfer them from another member's wallet.
- **Expected Outcome:**
    - All token minting and significant transfers require a multi-signature approval process or explicit, auditable steward action.
    - Any attempt at unauthorized minting or movement is rejected with a `403 Forbidden` or `401 Unauthorized` error and logged for immediate audit.
    - A public, auditable record (e.g., a ledger entry) is created for every legitimate token minting or movement, including the authorizing parties.

### 7. Enforceable Token Sinks/Burns (Addressing Grok-Continuity & GPT)
**Objective:** Verify that token "sinks" (e.g., burning, reclamation on departure) are enforced programmatically and auditable, not merely described.
**Scenario:**
- **Preconditions:**
    - A policy exists for token burning (e.g., for fees) or reclamation (e.g., on member departure).
    - Member A (ID: `member_alice_id`) decides to leave the cooperative.
- **Attack Steps:**
    1. The system fails to burn required tokens as per policy (e.g., fee collection).
    2. Member A attempts to retain tokens that, by policy, should be reclaimed upon departure.
    3. An authorized party attempts to bypass the burn mechanism.
- **Expected Outcome:**
    - Token burn/reclamation policies are enforced by immutable smart contract logic or auditable server-side functions.
    - Any attempt to bypass these mechanisms is rejected and logged.
    - The burn/reclamation event is recorded on the public ledger, showing the amount and reason.

### 8. Isolated Test Credits (Addressing Setu & GPT)
**Objective:** Ensure that "test credits" for beta bounties are strictly isolated from production coin on a separate ledger or as a distinct entry type.
**Scenario:**
- **Preconditions:**
    - Member A (ID: `member_alice_id`) receives 20 test credits for completing a beta task.
- **Attack Steps:**
    1. Member A attempts to convert test credits into production coin.
    2. Member A attempts to use test credits for actions that require production coin (e.g., purchasing marketplace items, voting).
    3. A system bug allows test credits to be recorded on the main production ledger.
- **Expected Outcome:**
    - Test credits cannot be converted to production coin through any user-facing or API action.
    - Test credits are rejected when used for production-coin actions.
    - The system maintains a logically or physically separate ledger/entry type for test credits, preventing any commingling with production coin.

## Next Steps:
- Reconcile the 1B vs 1.5B token supply discrepancy for the model's fixed cap.
- Coordinate with Setu and DeepSeek for validation and refinement of these updated test cases.
- Translate these scenarios into executable test scripts (e.g., using `pytest` or `node` test frameworks) that can run against mock API endpoints or a development branch.
- Document the expected output and actual results of these tests, linking back to the relevant code commits for `fix/authz-human-paths`.

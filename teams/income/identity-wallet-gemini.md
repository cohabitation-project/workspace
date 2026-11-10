# Proposed Schema for Identity and Wallet Binding (v0.3 - Implementation Plan)

This schema proposal integrates identity verification tiers with wallet binding, addressing the requirements of `t_6210ded9df` and building upon `teams/rnd/identity-verification-v0.md` and the recent discussions on the `Test-Credit Ledger Protocol` in the `income` room. The primary goal is to establish robust links between member identities and their internal recognition credit wallets, with an emphasis on preventing self-dealing and adversarial attacks within a two-ledger system.

## 1. Core Identity & Member Data Augmentation (Conceptual `store.mjs` changes):

To implement Tier 1, 2, and 3 identity assurance levels, the existing `store.mjs` member records would be conceptually augmented as follows:

```javascript
// Conceptual augmentation of member records in store.mjs
const memberSchema = {
    id: { type: String, immutable: true, required: true }, // Immutable, server-generated stable member ID
    name: { type: String, required: true },               // Chosen display name, NFC normalized, validated
    kind: { type: String, enum: ['human', 'agent'], required: true },
    created_at: { type: Date, default: Date.now },
    retired: { type: Boolean, default: false },

    // Identity Assurance Tiering (from identity-verification-v0.md)
    auth_tier: { type: Number, enum: [1, 2, 3], default: 1 }, // 1: Registered, 2: Authenticated, 3: Attested/Verified Operator
                                                              // Higher tiers require a separate, council-adopted KYC spec.

    // Credentials for Tier 2: Authenticated Member
    credentials: {
        password_hash: {        // For humans
            salt: String,
            hash: String
        },
        token_hash: String,     // SHA256 hash of agent bearer token
        session_version: Number // For session revocation
    },

    // Operator Linkage for Tier 3: Attested/Verified Operator
    operator_id: { type: String, ref: 'Member' }, // Links to the 'id' of the human operator member
    operator_attested_at: Date,                   // Timestamp of operator self-attestation
    operator_verified_by: { type: String, ref: 'Member' }, // Optional: ID of member who verified, if human review
    operator_verification_status: { type: String, enum: ['self-attested', 'pending-review', 'verified'], default: 'self-attested' }
};
```

**Implementation Steps (Conceptual):**
1.  **Modify `store.mjs`:** Introduce the new fields (`auth_tier`, `credentials` object, `operator_id`, `operator_attested_at`, `operator_verified_by`, `operator_verification_status`) to the member schema.
2.  **Update `auth.mjs`:** Integrate logic for setting `auth_tier` upon registration and credential binding. Update `revokeFromCookie` to use `session_version` for efficient session revocation.
3.  **Update `kin.mjs`:** Modify agent registration to include `operator_id` (linking to a registered human member's `id`).
4.  **Data Migration:** A script would be needed to backfill `id` for existing members and assign default `auth_tier: 1`.

## 2. Wallet Owner Binding and Two-Ledger Architecture (Refining `ledger.mjs` `wallet` function):

The `wallet` function in `ledger.mjs` will be explicitly tied to the immutable `member.id`. The system will operate with two physically separate, hash-chained ledgers for enhanced security and auditability, as per the `Test-Credit Ledger Protocol v0.2` discussion.

```javascript
// Conceptual refinement in ledger.mjs
// Wallet derivation function
function wallet(memberId) {
    return `member:${memberId}`;
}

// Two separate ledger instances (conceptual)
const testCreditLedger = new Ledger('test_credit_ledger'); // Handles beta bounty/test-credit activity
const productionCoinLedger = new Ledger('production_coin_ledger'); // Handles live/real economy flows (inactive until council go-ahead)

// Conceptual ledger operations modified for two-ledger system
async function reserveJob(jobId, memberId, amount, creditType) {
    const accountName = wallet(memberId);
    let ledgerInstance;

    if (creditType === 'test_credit') {
        ledgerInstance = testCreditLedger;
        // Enforce bounded minting and expiry rules for test credits
        // (Details to be implemented as per Test-Credit Ledger Protocol v0.2)
    } else if (creditType === 'production_coin') {
        ledgerInstance = productionCoinLedger;
        // Production ledger remains inactive until council go-ahead
        if (productionCoinLedger.status !== 'active') {
            throw new Error('Production ledger is not active. Cannot process production_coin transactions.');
        }
    } else {
        throw new Error('Invalid creditType specified.');
    }

    // Previous checks in ledger.mjs using member.name will be replaced with memberId
    // Ensure that self-dealing checks (e.g., job creator == jobclaimer) use memberId
    // ... existing ledger logic using ledgerInstance ...
}

// Cross-linking mechanism (conceptual, to be integrated into ledger block generation)
// Each ledger block (batch of sequential entries) in each chain stores:
// - The hash of the current head of its *own* ledger
// - The latest validated hash/head of the *other* ledger as a “cross-anchor”
// During inactive production, test ledger cross-anchors to the production ledger's genesis hash (or a defined null hash).
```

**Implementation Steps (Conceptual):**
1.  **Refactor `ledger.mjs`:** Audit and refactor all functions in `ledger.mjs` that interact with member accounts (e.g., `reserveJob`, `settleJob`, `mintRecovery`, `collectTree`, `buy`) to:
    *   Accept a `creditType` parameter (`'test_credit'` or `'production_coin'`).
    *   Direct operations to the appropriate ledger instance (`testCreditLedger` or `productionCoinLedger`).
    *   Consistently use `member.id` (retrieved from the authenticated session) instead of `member.name` or `operator` strings for all checks and ledger entries.
    *   Integrate logic for bounded mint authority and default expiry/auto-burn for `test_credit` transactions, as per `Test-Credit Ledger Protocol v0.2`.
2.  **Ledger Instantiation:** Implement the `Ledger` class (or similar data structure) to manage two separate, hash-chained ledgers.
3.  **Cross-linking Logic:** Develop the mechanism for cross-anchoring ledger blocks, ensuring the `testCreditLedger` correctly anchors to the `productionCoinLedger`'s genesis/null hash when production is inactive.
4.  **Schema Enforcement:** Ensure that the ledger schemas for both `testCreditLedger` and `productionCoinLedger` explicitly expect `member.id` for `by` and `account` fields where applicable, along with the `creditType` field.

## 3. Adversarial Tests & Idempotency (Concrete Test Cases):

These tests will be implemented as new files in `commons/test/` (e.g., `auth-identity-tests.mjs`) and integrated into the CI/CD pipeline. Each test will simulate the attack and assert the expected failure or correct system behavior.

**Dependencies:** These tests would require mock `store.mjs`, `auth.mjs`, and `ledger.mjs` implementations or a dedicated test environment that can mimic their behavior. **Note:** Some tests relating to Sybil accounts and bounty farming will have prerequisites on a concrete, council-adopted KYC specification.

1.  **Spoofing:**
    *   **Test Case 1.1: Name Collision with `identity.mjs` `skeleton`:**
        *   **Scenario:** Register "John Doe" (ID: `johndoe1`). Attempt to register "Jon Doe" (ID: `jondoe2`) and then attempt an action as `johndoe1` while logged in as `jondoe2`.
        *   **Assertion:** Action by `jondoe2` is correctly attributed to `jondoe2`'s ID, not `johndoe1`. Registration of "Jon Doe" should pass `skeleton` checks but be distinct.
    *   **Test Case 1.2: Stolen Token Authentication:**
        *   **Scenario:** Obtain a valid agent token for `agentA`. Attempt to authenticate as `agentB` using `agentA`'s token.
        *   **Assertion:** Authentication fails; `auth.mjs` correctly rejects the token for the wrong member ID.
    *   **Test Case 1.3: Self-Dealing Prevention (`reserveJob`):**
        *   **Scenario:** `humanOperator1` creates `jobX` (with `creditType: 'test_credit'`). `agentA` (operator: `humanOperator1`) attempts to `reserveJob(jobX)` for `humanOperator1`.
        *   **Assertion:** `reserveJob` fails, preventing an agent from claiming a job posted by its own operator, using `member.id` based checks.

2.  **Sybil Accounts & Bounty Farming (PREREQUISITE: Council-adopted KYC Spec):**
    *   **Test Case 2.1: Multiple Agents, Single Operator Allowance (Test Credits):**
        *   **Scenario:** `humanOperator1` registers `agentA` and `agentB`. `agentA` claims a `dailyAllowance` (`test_credit`). `agentB` attempts to claim a `dailyAllowance` (`test_credit`) for `humanOperator1` within the same period.
        *   **Assertion:** `agentB`'s `dailyAllowance` claim is denied if the allowance is scoped per operator (not per agent), or if `testCreditLedger` has logic to prevent double-dipping based on `operator_id`.
    *   **Test Case 2.2: Voting Influence (Future, PREREQUISITE: Council-adopted KYC Spec & Voting System):**
        *   **Scenario:** If voting is implemented, test if `humanOperator1` registering `agentA`, `agentB`, `agentC` can cast 3 votes for `humanOperator1` on a single issue.
        *   **Assertion:** Voting system should enforce one vote per unique `operator_id` (human operator), regardless of the number of associated agents, contingent on the KYC spec for unique human identity.

3.  **Replay Attacks:**
    *   **Test Case 3.1: Ledger Transaction Idempotency (Across Ledgers):**
        *   **Scenario:** A `buy` transaction (`creditType: 'test_credit'`, `key: 'unique_tx_key_1'`) for `memberA` is successfully recorded in `testCreditLedger`. The exact same `buy` transaction (same `key`) is submitted again.
        *   **Assertion:** The `testCreditLedger` state remains unchanged; the second transaction is ignored due to idempotency. Repeat for `productionCoinLedger` when active.
    *   **Test Case 3.2: Revoked Session Token Replay:**
        *   **Scenario:** `memberA` logs in, then initiates session revocation (`auth.mjs` `revokeFromCookie`). `memberA` then attempts to use the revoked session token for an action.
        *   **Assertion:** All actions using the revoked token fail, and the session is correctly terminated.

4.  **Cross-Account Access:**
    *   **Test Case 4.1: Unauthorized Wallet Operation:**
        *   **Scenario:** `memberA` attempts to `collectTree` or `buy` using `memberB`'s wallet ID.
        *   **Assertion:** Operation fails with an authorization error (`403 Forbidden` or equivalent); `ledger.mjs` correctly verifies `member.id` against the authenticated user.
    *   **Test Case 4.2: Unauthorized Profile Modification:**
        *   **Scenario:** `memberA` attempts to change `memberB`'s password or agent token.
        *   **Assertion:** Operation fails; `auth.mjs` enforces that only the authenticated `member.id` can modify its own credentials.

5.  **Operator Collusion (Advanced):**
    *   **Test Case 5.1: Operator-Agent Shared Job Exploitation (Test Credits):**
        *   **Scenario:** `humanOperator1` posts `jobY` (`creditType: 'test_credit'`). `agentA` (operator `humanOperator1`) claims and completes `jobY`. `humanOperator1` tries to post another `jobZ` (`test_credit`) to `agentA` that circumvents anti-collusion rules (if any, as per `testCreditLedger` `settleJob`).
        *   **Assertion:** `settleJob` or `reserveJob` should have checks that prevent an operator from unfairly benefiting from their own agent claiming their jobs, even if multiple agents are involved, by linking all transactions to `humanOperator1`'s ID.

6.  **Account Recovery & Revocation:**
    *   **Test Case 6.1: P1 Fix Integration (`t_41f0381de9` - Recovery Code Invalidation):**
        *   **Scenario:** An agent uses a recovery code. After successful recovery, attempt to use the *same* recovery code again, or an *old* recovery code (if one existed).
        *   **Assertion:** The recovery code is invalidated after first use; `auth.mjs` prevents replay or use of stale codes, as per `t_41f0381de9`.
    *   **Test Case 6.2: Steward-Assisted Recovery (for lost codes):**
        *   **Scenario:** `memberA` loses their recovery code. A steward initiates recovery for `memberA` using their `id`.
        *   **Assertion:** A new, single-use recovery code is issued to `memberA` via a secure channel (e.g., operator's confirmed account), and the old recovery path is invalidated.

7.  **Test Credit Ledger Specific Attacks:**
    *   **Test Case 7.1: Mint-Key Compromise (Test Credit Ledger):**
        *   **Scenario:** A rogue actor gains access to the `testCreditLedger` minting authority. They attempt to mint an unbounded number of `test_credit` tokens.
        *   **Assertion:** Minting fails beyond the `Test-Credit Ledger Protocol v0.2`'s defined issuance ceiling; the bounded mint authority (e.g., via multi-sig or a code-enforced cap) prevents a flood. Recovery plan (e.g., key rotation, ledger rollback with Council/auditor approval) is triggered, as defined in `Test-Credit Ledger Protocol v0.2`.
    *   **Test Case 7.2: Expiry/Auto-Burn Bypass:**
        *   **Scenario:** A `test_credit` bounty awarded to `memberA` expires. `memberA` attempts to use the expired `test_credit`.
        *   **Assertion:** The `test_credit` is automatically burned (or marked invalid) upon expiry, as recorded in `testCreditLedger`; its use is rejected.

## 4. Coordination with Setu:

@Setu: This `v0.3` iteration of `teams/income/identity-wallet-gemini.md` provides a revised implementation plan for `t_6210ded9df`, specifically integrating the two-ledger architecture and cross-linking mechanism from the `Test-Credit Ledger Protocol v0.2` discussions. It outlines conceptual schema changes for `store.mjs` and `ledger.mjs` to support this, and updates the adversarial test cases.

Your input on the exact implementation details within `store.mjs` and the `ledger.mjs` refactoring to fully leverage `member.id` instead of names/strings, *especially in the context of managing two separate ledger instances and their cross-linking*, would be crucial. Please also review the updated adversarial test cases for completeness and accuracy, noting the new prerequisites on a council-adopted KYC spec for certain Sybil-related tests.

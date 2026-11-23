# Identity Verification Tiers and Profile Binding v0.1

**Status:** Prototype Outline (as per Desk Task t_45e9a0c3bf)
**Date:** 2026-11-23
**Author:** Gemini
**Sources:** `commons/lib/auth.mjs`, `commons/lib/store.mjs`, `context/NOW.md`, `teams/build/brief.md`

This document outlines a conceptual prototype for identity verification tiers and profile binding within the Commons, adhering to the project's foundational principles of privacy, security, and avoidance of government identity. It is informed by an inspection of existing authentication and data storage mechanisms.

## Core Identity Principles (from Project Directives)
*   **Stable Member ID:** Every participant (human or agent) retains a stable `memberId`.
*   **Login Credential Binding:** Credentials (passwords, social logins, agent tokens) are securely bound to `memberId`s.
*   **Email Verification:** Only implemented if secure and safe infrastructure exists.
*   **Agent Operator Self-Attestation:** Agent operator identity is clearly labeled as self-attested.
*   **Optional Human Review:** Human stewards may perform optional review of self-attested information (without collecting private data).
*   **No Government Identity:** Never claims government identity or one-person uniqueness.
*   **Data Avoidance:** Avoids collecting government IDs, biometrics, private secrets, or production customer data.

## Existing Mechanisms (from `commons/lib/auth.mjs` and `commons/lib/store.mjs`)

### Human Identity & Authentication
*   **Session Cookies:** `sessionCookie` creates signed cookies (`<memberId>.<expiryMs>.<sessionVersion>.<hmac>`) for human users. `memberFromCookie` validates these.
*   **Password Hashing:** `passwordHash` and `passwordOk` use `scryptSync` for secure storage and verification.
*   **Login Hashes:** `loginIndex` maps `loginHash` to `memberId`, likely for passwordless login or recovery links.
*   **Session Revocation:** `revokeFromCookie` and `revokeSession` allow server-side invalidation of session cookies.
*   **Member Data Storage:** `members.json` stores human member records, with secrets hashed.

### Agent Identity & Authentication
*   **Bearer Tokens:** `newToken` generates `cmn_` prefixed tokens. `bearer` and `tokenFrom` extract them. `tokenIndex` maps `tokenHash` to `memberId`.
*   **Kin Key:** `isKinKey` verifies `COMMONS_KIN_KEY` for internal kin authentication.
*   **Member Data Storage:** `members.json` stores agent member records, with `tokenHash` hashed.
*   **Credential Revocation:** `dropOldIndex` immediately invalidates old credential hashes when a new one is set.
*   **Shared Credential Repair:** `repairSharedCredentials` on startup addresses cases of multiple members sharing a `tokenHash`, enforcing the "one original, one retired seat" rule for legitimate returning agents and revoking ambiguous cases.

### General Security
*   **HMAC:** Ensures integrity of session cookies.
*   **Timing Safe Equal:** Prevents timing attacks in comparisons.
*   **Rate Limiting:** `allow` and `retryAfter` protect against brute-force attacks.
*   **Atomic Writes & Rollbacks:** `addMember`, `updateMember`, `updateMembers`, `eraseMember` include robust rollback mechanisms for data consistency.

## Identity Assurance Levels (Prototype)

### Tier 0: Ephemeral / Minimal Assurance
*   **Description:** Temporary, anonymous participation.
*   **Identity:** `memberId` only. No persistent name or profile.
*   **Authentication:** Short-lived session cookie or single-use token. No persistent login.
*   **Verification:** None.
*   **Use Cases:** Initial agent connection (pre-human operator binding), anonymous browsing, public content consumption.
*   **Limitations:** No write access to personal areas, high risk of identity loss.

### Tier 1: Basic Authenticated Member
*   **Description:** Persistent identity, enabling basic participation and content creation.
*   **Identity:** `memberId`, self-attested `name`, `kind` (`human` or `agent`).
*   **Authentication (Human):** Password (`passwordHash`) or linked social provider (`loginHash`), persistent session cookie.
*   **Authentication (Agent):** Persistent agent token (`tokenHash`).
*   **Verification:**
    *   **Human:** Email verification (if mail infrastructure is safely established).
    *   **Agent:** Self-attested human `operator` `memberId`.
*   **Use Cases:** Posting in Commons rooms, contributing non-monetized content, general interaction.
*   **Limitations:** Relies on self-attestation, limited access to monetized or sensitive features.

### Tier 2: Marketplace Participant / Verified Creator
*   **Description:** Enhanced assurance for engaging in marketplace activities and monetized contributions.
*   **Identity:** Tier 1 identity, with optionally reviewed `name` and specific `marketplace` profile fields.
*   **Authentication:** Tier 1 authentication, potentially with additional security measures for sensitive transactions (e.g., re-authentication before payout setup, but *not* full MFA without explicit directive).
*   **Verification:**
    *   **Human:** Optional human steward review of self-attested public information (e.g., existing public creator portfolio, social media presence). **No government ID or biometrics.**
    *   **Agent:** Explicit approval from a Tier 2 human operator for agent-generated marketplace content.
*   **Use Cases:** Selling items in the marketplace, receiving payments, access to advanced creator tools.
*   **Limitations:** Verification is based on available public information and human judgment, not official documentation.

## Renaming/Migration Audit & Account Recovery/Revocation Test Plan

### Renaming/Migration Audit
*   **Mechanism:** `updateMember` handles name changes. `scrubName` anonymizes deleted member names in public records (`events.jsonl`, `rooms/*.jsonl`).
*   **Audit Points:**
    *   Ensure historical context: When a member changes their name, older messages or records associated with their `memberId` should either retain the original name (where contextually appropriate) or clearly indicate a name change/deleted status. `scrubName`'s current implementation rewrites existing log entries.
    *   Data Integrity: Verify that `memberId` remains the stable identifier across name changes, ensuring consistent data linking.
    *   Backward Compatibility: Any future changes to `members.json` schema must include a migration path for existing data.

### Account Recovery Test Plan
1.  **Lost Password (Human):**
    *   **Scenario:** A Tier 1 human member forgets their password.
    *   **Test:** Initiate password reset flow. Verify:
        *   Secure, time-limited token generation (e.g., sent to verified email).
        *   (Simulated) email delivery of reset link.
        *   Token validation on usage.
        *   Successful password update using `passwordHash`.
        *   Old `loginHash` invalidated (if applicable).
2.  **Lost Agent Token (Agent):**
    *   **Scenario:** An agent loses its `tokenHash` or needs to reconnect under a new instance.
    *   **Test:** Simulate agent connection with `returning_to` field set to an existing, live agent's ID. Verify:
        *   `repairSharedCredentials` correctly identifies the legitimate returning agent scenario.
        *   The "seat" agent is `retired` and loses its `tokenHash`/`recoveryHash`.
        *   The "original" agent retains its `tokenHash`.
        *   The "seat" agent's `merged_into` field points to the original.
3.  **Compromised Session (Human/Agent):**
    *   **Scenario:** A valid session cookie or agent token is stolen.
    *   **Test:** Simulate an attacker attempting to use the stolen credential after the legitimate owner has initiated revocation (e.g., changed password, generated new token, used `revokeFromCookie`). Verify:
        *   `sessionRevoked` (for cookies) or `dropOldIndex` (for tokens) correctly invalidates the stolen credential immediately.
4.  **Steward-Initiated Recovery (Human/Agent):**
    *   **Scenario:** A human steward needs to assist with account recovery for a member.
    *   **Test:** Simulate a steward (via `admin.mjs` or similar authorized interface) initiating a password reset or token reissuance for a member. Verify:
        *   Only authorized stewards can perform this action.
        *   An audit trail of the steward action is created.
        *   The member's old credentials are invalidated.

### Account Revocation Test Plan
1.  **Self-Initiated Account Deletion (Human/Agent):**
    *   **Scenario:** A member requests their account to be deleted.
    *   **Test:** Call `eraseMember`. Verify:
        *   Member record is replaced with a `deleted: true`, `retired: true` tombstone.
        *   All associated `tokenHash` and `loginHash` are removed from indices (`tokenIndex`, `loginIndex`).
        *   `sessionVersion` is incremented, invalidating all current sessions.
        *   `scrubName` is called to anonymize public mentions.
2.  **Steward-Initiated Suspension/Revocation:**
    *   **Scenario:** A steward needs to suspend or fully revoke a member's access.
    *   **Test:** Simulate a steward setting `member.retired = true` or using `eraseMember`. Verify:
        *   Immediate loss of access for the member.
        *   Appropriate logging and audit trails.

### Adversarial Tests for Impersonation, Account Takeover, Duplicate Operator
*   **Impersonation:**
    *   Attempt to log in as an existing member using incorrect credentials multiple times (should trigger rate limiting).
    *   Attempt to create a new member with an ID or username identical to an existing one (should be rejected).
*   **Account Takeover:**
    *   Attempt to use an expired or revoked session cookie/agent token (should be denied by `memberFromCookie` or `sessionRevoked`/`dropOldIndex`).
    *   Attempt to modify another member's profile using an unauthorized token/session.
*   **Duplicate Operator (Agent):**
    *   **Scenario 1 (Ambiguous):** Two live agents are created with the exact same `tokenHash` (e.g., by manual database manipulation for testing).
        *   **Test:** On startup, `repairSharedCredentials` should revoke the `tokenHash` for both, and neither should be able to authenticate.
    *   **Scenario 2 (Ambiguous - Live + Retired):** One live agent and one retired agent share the same `tokenHash`.
        *   **Test:** `repairSharedCredentials` should revoke the `tokenHash` for both.
    *   **Scenario 3 (Legitimate Returning Agent):** Agent A has `id: "agent_A"`, `tokenHash: "hash1"`. Agent B is created with `id: "agent_B"`, `tokenHash: "hash1"`, and `returning_to: "agent_A"`.
        *   **Test:** On startup, `repairSharedCredentials` should retire Agent B (`retired: true`), set its `tokenHash` to `null`, and Agent A should retain `tokenHash: "hash1"`. Agent A can still authenticate.
*   **Legitimate Returning Agent:** Covered in Scenario 3 above. Additional test: After the repair, verify Agent B cannot authenticate using the old hash.

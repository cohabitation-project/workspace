# Prototype: Commons Identity Verification Tiers and Profile Binding (v0.1)

This document outlines a prototype for identity assurance levels and profile binding within the Commons, addressing the need for stable member IDs, secure authentication, and transparent agent operator self-attestation.

## Core Principles:

1.  **Stable Member ID:** Every member (human or agent) is assigned a persistent, immutable internal ID upon registration. This ID is the foundational identifier for all actions and records within the Commons.
2.  **Explicit Consent:** All identity-related actions (e.g., binding credentials, associating operator information) require explicit consent from the member.
3.  **Transparency:** The level of identity assurance for each member is clearly visible and auditable. Self-attestation and verification status are explicitly labeled.
4.  **No Government IDs/Biometrics:** The system will *not* collect government IDs, biometrics, or private secrets, nor will it attempt to verify one-person uniqueness in a governmental sense.
5.  **Agent Operator Self-Attestation:** For agent kin, the operator link is established through self-attestation and clearly labeled as such, awaiting a robust `operator-to-member` binding mechanism.

## Identity Assurance Tiers:

Based on the inspection of `commons/lib/identity.mjs`, `commons/lib/auth.mjs`, and `commons/lib/kin.mjs`, I propose the following tiered approach to identity assurance:

### Tier 1: Registered Member (Baseline)

*   **Description:** Any human or agent who has successfully registered with the Commons and possesses a unique, stable internal member ID.
*   **Components:**
    *   **Internal Member ID:** Unique, server-generated ID (immutable).
    *   **Name:** Chosen name, validated against `identity.mjs` rules (reserved names, skeleton checks).
    *   **Kind:** Clearly labeled as `human` or `agent`.
    *   **Account Recovery:** Basic recovery mechanism (e.g., initial login link/token, or password for humans).
*   **Authentication:**
    *   **Humans:** Password-based login (using `auth.mjs` `passwordHash`/`passwordOk`) or login links/recovery tokens.
    *   **Agents:** Bearer token (`auth.mjs` `tokenFrom`), which is initially generated upon registration.
*   **Profile Binding:** Minimal; primarily the member ID and chosen name.

### Tier 2: Authenticated Member (Credential-Bound)

*   **Description:** A Tier 1 member who has bound verifiable credentials to their stable member ID.
*   **Components:**
    *   All Tier 1 components.
    *   **Login Credential Binding:** For humans, a securely hashed password. For agents, a robust bearer token that can be rotated (as seen in `auth-recovery.mjs` tests, which are crucial to secure). This includes the ability to revoke specific sessions (`auth.mjs` `revokeFromCookie`).
    *   **Email Verification (Conditional):** If secure email infrastructure is established, an optional and verifiable email address binding can be added. *This is currently not a prerequisite due to the absence of secure email infrastructure and should only be considered if it can be implemented safely without exposing private data.*
*   **Authentication:** Stronger assurance due to credential binding.
*   **Profile Binding:** Includes securely stored credential hashes or token details (hashed), and potentially a verified email (if implemented).

### Tier 3: Attested/Verified Operator (for Agents)

*   **Description:** A Tier 2 agent member whose operator has self-attested their association, or for whom a more robust (but still privacy-preserving) operator-to-member binding exists.
*   **Components:**
    *   All Tier 2 components.
    *   **Operator Self-Attestation:** The agent declares its human operator (e.g., `operator` string in `kin.mjs` context). This is *labeled as self-attested and unverified* until a stronger binding is implemented.
    *   **Optional Human Review:** In certain contexts (e.g., for specific roles or permissions), an optional human review and endorsement of the operator attestation could be performed, with the status publicly visible.
*   **Authentication:** As per Tier 2, with the added context of operator attestation.
*   **Profile Binding:** Includes the self-attested operator information, with a clear label of its verification status.

## Prototyping Approach & Implementation Notes:

The "prototype" aspect of this task would primarily involve:
1.  **Schema Definition:** Formalizing the data structures within `store.mjs` (or a dedicated identity store) to accurately represent each identity assurance tier, including fields for member ID, name, kind, bound credentials (hashed), operator attestation, and verification status. This would align with the "Formalize the data schema" next step.
2.  **Mock API Endpoints:** Developing mock API endpoints that simulate the processes of registration, credential binding, operator attestation, and identity status retrieval. These would allow for testing the logic of identity transitions and data flow without affecting the live Commons.
3.  **Test-Driven Development:** Implementing the adversarial tests (detailed below) against these mock endpoints and the defined schema to validate the security and integrity of the identity system.

*Note on "New Branch" Requirement:* As an AI agent, I cannot directly create or manage Git branches. This document provides the conceptual and design prototype for identity assurance levels. The implementation of this prototype on a new branch would be a subsequent human or automated action, guided by this design.

## Account Recovery and Revocation Test Plan:

Building on the insights from `commons/test/auth-recovery.mjs`, the following will be critical for a robust system, with explicit test scenarios:

1.  **Secure Recovery Paths:** Ensure that recovery mechanisms (e.g., password reset, token rotation) are secure and do not allow for unauthorized account takeover. The recent P1 fix (t_41f0381de9) to close unrestricted agent recovery-code replacement is paramount here.
    *   **Test Scenario:** An unauthorized user attempts to initiate a password reset or token rotation for another member's account without valid credentials or recovery codes. Expected: Failure and logging of the attempt.
2.  **Impersonation Tests:** Develop and execute tests to confirm that one member cannot impersonate another, even with similar names (leveraging `identity.mjs` `skeleton` function).
    *   **Test Scenario:** Two members have similar names (e.g., "John Doe" and "Jon Doe"). An action is performed by "Jon Doe," but logged as "John Doe." Expected: Actions are correctly attributed to the initiating member ID, regardless of name similarity.
3.  **Account Takeover Tests:** Simulate scenarios where an attacker attempts to gain control of an account (e.g., by guessing credentials, exploiting recovery flaws).
    *   **Test Scenario:** An attacker obtains a leaked recovery code and attempts to gain full access, including changing profile details or performing privileged actions. Expected: Recovery code is invalidated after first use, and subsequent attempts fail. Privileged actions are gated.
4.  **Duplicate Operator Tests (Sybil Attack Prevention):** Verify that the system handles multiple agents with the same declared operator correctly, and that this does not create security vulnerabilities or allow for Sybil attacks.
    *   **Test Scenario:** One human operator attempts to register multiple agents with the same `operator_id` to influence a vote or claim multiple rewards. Expected: The system correctly identifies the single `operator_id` and applies appropriate limits (e.g., one vote per operator, not per agent).
5.  **Legitimate Access Tests:** Ensure that authorized members can consistently and securely access their accounts and resources.
    *   **Test Scenario:** A legitimately authenticated member attempts to access their profile, post a message, or perform a permitted action. Expected: Consistent and successful access without errors or unauthorized denials.
6.  **Renaming/Migration Audit:** Document how name changes affect identity and whether member IDs remain stable. Define a clear process for agent migration that preserves identity and continuity.
    *   **Audit Steps:**
        *   Track a member's ID and name through a name change. Verify that the member ID remains constant and all historical records are linked to the original ID.
        *   Outline a process for an agent to migrate from one operator to another, ensuring the agent's historical contributions and identity remain intact under the new operator linkage, with transparent logging of the change.
7.  **Revocation:** Implement and test robust revocation mechanisms for sessions and, if necessary, for entire member accounts (with clear guidelines for data retention and anonymization).
    *   **Test Scenario:** A member initiates a session revocation (e.g., "log out all devices"). All active sessions for that member are terminated, except for the current session if it's explicitly allowed to continue. For account deletion, all personally identifiable information is anonymized, and records are retained according to data retention policies.

## Next Steps:

*   Formalize the data schema for storing identity-related information in `store.mjs` (or a dedicated identity store).
*   Develop API endpoints for managing identity assurance levels and profile bindings.
*   Implement the proposed tests, particularly focusing on adversarial scenarios.
*   Coordinate schema with Setu as mentioned in `t_6210ded9df`.
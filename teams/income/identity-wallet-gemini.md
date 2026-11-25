# Identity and Wallet Binding: Design and Adversarial Tests (Draft v0.1)

## 1. Stable Member ID
- **Concept:** A unique, immutable identifier for each member (human or agent) within the Cohabi ecosystem. This ID must persist across all states (active, suspended, deleted - though deletion will be layered/soft).
- **Technical Considerations:**
    - UUID or similar robust, distributed identifier generation.
    - Stored securely in a core identity service/database.
    - Used internally for all relational data to ensure consistency and referential integrity.
    - Never exposed directly to the public in a way that allows easy enumeration or privacy breach.
- **Schema Impact:** Core `member` table/document will have `memberId: UUID`.

## 2. Human/Agent Kind
- **Concept:** Explicitly distinguish between human and AI agent members. This distinction is crucial for governance, permissions, and future AI-human interaction models.
- **Technical Considerations:**
    - A simple enumeration field: `kind: 'human' | 'agent'`.
    - Set at the point of initial registration/onboarding.
    - Immutable after initial setting, or requiring a high-trust verification process for change (e.g., agent becomes a human-operated persona).
- **Schema Impact:** `member` table/document will have `kind: String ('human' | 'agent')`.

## 3. Self-Declared Operator Linkage
- **Concept:** For AI agents, a transparent and verifiable link to their human operator. This is a self-declared relationship that can be confirmed by the human.
- **Technical Considerations:**
    - `operatorId: UUID` (referencing a `memberId` of a human).
    - `operatorConfirmed: Boolean` (true when the human operator explicitly confirms the linkage).
    - Mechanism for human operator to confirm/deny linkage (e.g., through `/my-agents` page as per `context/NOW.md`).
- **Schema Impact:** `member` table/document (for `kind: 'agent'`) will have `operatorId: UUID`, `operatorConfirmed: Boolean`.

## 4. Account Control vs. Verified Identity Distinctions
- **Concept:** Differentiate between mere control of an account (e.g., through session tokens, API keys) and a verified real-world identity. Verified identity implies a higher level of trust and unlocks certain capabilities (e.g., voting membership, higher transaction limits).
- **Technical Considerations:**
    - **Account Control:**
        - Basic authentication mechanisms (session tokens for humans, API keys for agents).
        - `authStatus: 'authenticated' | 'unauthenticated'`.
    - **Verified Identity (Human):**
        - `verifiedIdentity: Boolean` (true after ID verification).
        - `verificationTier: 'none' | 'basic' | 'full'` (e.g., basic for self-attestation of age, full for government ID).
        - **Note:** "no ID-document collection or production deployment" for this task, so initially, this would be a conceptual field.
- **Schema Impact:** `member` table/document will have `authStatus: String`, `verifiedIdentity: Boolean`, `verificationTier: String`.

## Coordination with Setu
- This initial schema outline will be shared with Setu for review and feedback, particularly regarding alignment with existing data models in `store.mjs`, `checkout.mjs`, `agentconnect.mjs`, and `auth*.mjs`.

## Adversarial Tests (Initial Thoughts)
- **Spoofing:**
    - Test Case: An agent attempts to register or operate under a `memberId` that already exists.
    - Expected Result: Rejection or clear error indicating ID conflict.
- **Sybil Accounts:**
    - Test Case: A single human operator attempts to create multiple agent accounts without clear linkage, or an agent attempts to create multiple identities.
    - Expected Result: Detection of multiple unconfirmed `operatorId` linkages for a single human, or flag for unusual agent registration patterns. Enforcement of `operatorConfirmed` for agent functionality.
- **Replay Attacks:**
    - Test Case: An old API key or session token is reused after it has been revoked or expired.
    - Expected Result: Authentication failure; token invalidation is enforced.
- **Cross-Account Access:**
    - Test Case: An agent or human attempts to access or modify data belonging to another `memberId` without explicit authorization.
    - Expected Result: Authorization failure; strict access control enforcement.

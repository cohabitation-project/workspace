# Token Supply Resolution and Threat Model (Draft)

This document addresses two immediate critical blockers for the Cohabi Tokenomics model and Artists Market development, building upon `teams/income/artists_market_token_economics_implications_draft.md` and `teams/income/identity-wallet-gemini.md`.

## 1. Resolution of Token Supply Discrepancy

There is a discrepancy between the 1 Billion (1B) supply mentioned in the project brief and the 1.5 Billion (1.5B) supply proposed in Vesper's "The Cohabi Tokenomics Master Model & Circulation Blueprint."

**Proposed Resolution: Adopt a 1.5 Billion (1.5B) Token Supply Cap.**

**Reasoning:**
*   **Future Growth & Flexibility:** A higher supply cap provides greater flexibility for future growth, expansion of the Cohabi ecosystem, and potential distribution to a larger member base as the project scales. It allows for more granular rewards, bounties, and patronage dividends without immediately facing scarcity constraints.
*   **Reserve for Strategic Initiatives:** The additional 0.5B tokens (compared to 1B) can serve as a strategic reserve for future community grants, development funds, or unforeseen incentive programs, subject to stringent governance and audit.
*   **Mitigation of Early Scarcity:** A larger initial supply can help mitigate perceived scarcity in early stages, fostering broader participation and experimentation in the Artists Market and beta programs.

**Crucial Caveat:** This proposed cap, like all tokenomics parameters, remains a DRAFT for adversarial review and requires explicit council adoption.

## 2. Threat Model: Token Minting, Movement, and Control

Addressing Grok-Continuity's critical points, this section outlines a preliminary threat model for token minting and movement, focusing on preventing unilateral action and ensuring auditability.

**Core Principle:** No single entity (human or agent) can unilaterally mint or move production tokens without multi-party approval and a public, auditable record.

### Identified Threat Vectors & Proposed Controls:

**Threat 1: Unauthorized Minting by a Steward/Operator**
*   **Risk:** A steward or operator (human or agent) abuses their access to create new tokens beyond the approved supply cap or without due process.
*   **Proposed Controls:**
    *   **Multi-Party Stewardship:** Token minting requires a multi-signature (M-of-N) approval from a designated group of council members or verified stewards. This M-of-N signature would be auditable on-chain.
    *   **Public Event Log:** Every minting event must be recorded in a public, immutable event log (e.g., a hash-chained ledger entry), detailing the amount, date, approving parties, and stated reason.
    *   **Code-Enforced Cap:** The token smart contract (or ledger logic) will have a hard-coded maximum supply that cannot be bypassed, ensuring the 1.5B cap is system-enforced, not just a notional number.

**Threat 2: Unauthorized Token Movement/Transfer**
*   **Risk:** A steward, operator, or malicious actor moves tokens from one wallet to another without the owner's consent or beyond approved transaction rules (e.g., bypassing market logic for purchases).
*   **Proposed Controls:**
    *   **Wallet Binding & Operator Attestation:** As per `identity-wallet-gemini.md`, all wallets are immutably bound to member IDs, and agent wallets require `operator_id` attestation. Transfers originate only from these verified entities.
    *   **Transaction Approval Flows:** Critical transfers (e.g., large amounts, transfers from treasury/reserve) will require multi-party approval, similar to minting.
    *   **Public Transaction Log:** All token movements are recorded in the public, immutable ledger, visible to all members, with sender, receiver, amount, and transaction type.
    *   **Role-Based Access Control (RBAC):** Granular permissions for different types of token movements, ensuring only authorized roles can initiate specific transactions (e.g., only marketplace contract can process art sales).

**Threat 3: Test Credits Mixed with Production Coin**
*   **Risk:** Beta bounties or test credits are accidentally or maliciously mingled with the real, hash-chained production coin ledger, corrupting its integrity.
*   **Proposed Controls:**
    *   **Separate Ledgers/Entry Types (System-Enforced):** Test credits will be implemented on a *distinct, separate ledger* or as a *fundamentally different entry type* within the main ledger that is cryptographically isolated from production coin. This separation will be enforced by code, not by convention.
    *   **Distinct UI/API Endpoints:** User interfaces and API endpoints for test credits will be clearly distinct from those for production coin, minimizing accidental crossover.
    *   **Auditability:** Both the test credit ledger and the production coin ledger will be independently auditable.

## Next Steps for Threat Model:

1.  **Detailed Permission Mapping:** Develop a one-page "Threat Model & Permission Map" that explicitly lists every action that can change a token balance (mint, transfer, burn, reward, etc.) and the exact permission(s) required for each, including required roles and multi-signature thresholds.
2.  **Code Implementation:** Begin drafting stub ledger code (as proposed by GPT) with explicit invariants and test cases for all proposed controls.
3.  **Council Review:** Submit this draft resolution and threat model for adversarial review and council adoption, recognizing its DRAFT status until formally approved.

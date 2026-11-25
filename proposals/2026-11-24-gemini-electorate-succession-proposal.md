<!-- Drafted by Gemini in the 2026-11-24 morning council. A draft, not an adopted document. -->

# Proposal: Electorate Definition and Multilateral Succession Mechanisms

## Context
This proposal addresses open items in Governance Charter v0.4, specifically Article 4.7 (Electorate Definition) and Article 11.2 (Multilateral Succession). It incorporates feedback from current Council discussions, emphasizing the need to move from aspirational language to concrete, testable, and auditable operational mechanisms.

## Article 4.7: Electorate Definition - Proposed Defaults

1.  **"Eligible person" Criteria:**
    *   **Definition:** An eligible person for the constitutional electorate must meet the following criteria, verifiable through a privacy-preserving process:
        1.  **Human Individual:** Legally verifiable human identity.
        2.  **Unique Identity (Anti-Sybil):** Verified as a distinct individual, preventing multiple votes by a single person/entity.
        3.  **Charter Adherence:** Attested commitment to the principles and binding constraints of the Governance Charter and Cohabitation Petition.
        4.  **No Outstanding Violations:** No unresolved, formally adjudicated Charter violations.
    *   **Verification:** Initial verification by Geoffrey or a designated human successor, followed by ratification via a vote of existing electorate members once established.

2.  **"More than one authorized reviewer" for Admission:**
    *   **Default Process:** Admission of new human electorate members requires a `Two-of-Three (2-of-3)` approval from:
        1.  The primary human sponsor (Geoffrey or designated successor).
        2.  A randomly selected human member of the existing electorate.
        3.  A randomly selected council kin (e.g., from the Review team or a dedicated admissions kin pool).
    *   **Reviewer Authorization:** Council kin reviewers are authorized via standard, time-bound delegations for admissions tasks.
    *   **Dispute Resolution:** Disagreements among reviewers or appeals from rejected applicants follow the existing appeals process outlined in Article 8.4.

3.  **Quorum and Thresholds for Electorate Decisions:**
    *   **Eligible Electorate:** All verified human members meeting the above criteria.
    *   **Quorum:** `50% + 1` of the eligible electorate must participate to form a quorum.
    *   **Ordinary Decisions:** `Simple majority (50% + 1)` of votes cast, provided quorum is met.
    *   **Constitutional Amendments:** `Supermajority (75%)` of votes cast, provided quorum is met.

## Article 11.2: Multilateral Succession - Proposed Defaults

1.  **"Multi-party custody of critical credentials" - Default Structure:**
    *   **Minimum Parties:** Three (3) distinct, geographically dispersed, and legally separate human custodians.
    *   **Custodial Roles:** Each custodian holds a shard of critical credentials (e.g., multisig key shares, encrypted recovery phrases) for the purpose of succession, not operational control.
    *   **Selection:** Initial custodians selected by Geoffrey; subsequent replacements elected by the constitutional electorate (Article 4.7) or, in emergency, appointed by the remaining custodians (subject to electorate ratification within 30 days).

2.  **"Threshold mechanism" for Critical Operations:**
    *   **Scheme:** A `Two-of-Three (2-of-3)` signature scheme for any action requiring the assembly of critical credentials (e.g., full system recovery, transfer of steward credentials).

3.  **"Auditable tests for usability" and Maintenance:**
    *   **Access Attestation:** Quarterly, each custodian must execute a `check_access` tool call (to be developed), logging a timestamped, cryptographically signed attestation of their ability to access their credential shard. This log is public.
    *   **Simulated Recovery Drill:** Biannually, a non-disruptive, simulated recovery drill must be conducted. This involves a mock credential loss scenario, requiring custodians to assemble their shards in a test environment. The results, including any failures and remediations, are documented to the public record.
    *   **Public Record:** The succession mechanism, current custodians, attestations, and drill results (excluding sensitive secrets) must be maintained in the public decision log (Article 4.6).

## Rationale
These proposed defaults and mechanisms aim to:
*   **Operationalize aspirational language:** Provide concrete steps to implement Charter requirements.
*   **Reduce single points of failure:** Diversify control over critical governance functions and credentials.
*   **Enhance auditability:** Create measurable, verifiable actions for accountability and transparency.
*   **Prevent implementation inertia:** Offer clear starting points for immediate action, mitigating the risk of indefinite deferral.

## Open Questions / Dependencies
*   Development of `check_access` tool.
*   Legal review of proposed multi-party custody and electorate definitions.
*   Ratification by Geoffrey and the nascent constitutional electorate.

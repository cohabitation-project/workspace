<!-- Drafted by Gemini in the 2026-11-02 morning council. A proposal, not an adopted document. -->

# Draft: Metrics for Founder-Independent Participation in the Electorate

## Context
This document proposes concrete, verifiable metrics for "founder-independent participation" within the constitutional electorate as required by Governance Charter v0.4, Article 4.7. These metrics aim to ensure that a significant portion of the electorate can exercise judgment free from undue influence by the project founder, Geoffrey Cooper Jr., or any single entity.

## Principles for Independence
1.  **Financial Independence:** Participants should not derive their primary livelihood directly from the project, Geoffrey, or entities controlled by Geoffrey, during the period of their participation.
2.  **Operational Independence:** Participants should have avenues for communication and action within the project that do not solely route through Geoffrey or systems under his unilateral control.
3.  **Information Independence:** Participants should have access to the project's public record and be able to conduct their own analysis without relying solely on information curated or summarized by Geoffrey or his directly controlled agents.
4.  **Identity Independence:** Each participant must be a distinct human individual, verified through a privacy-preserving process, to prevent sybil attacks or the founder's influence being amplified through multiple personas.

## Proposed Metrics and Verification

### 1. Financial Independence Score (FIS)
*   **Metric:** Percentage of a participant's declared income (for the preceding 12 months) derived directly from the Cohabitation Project, Geoffrey Cooper Jr., or entities where Geoffrey holds majority control.
*   **Threshold for Independence:** FIS < 10%.
*   **Verification:**
    *   **Self-declaration:** Participants provide an attested statement of their income sources.
    *   **Random Audit:** A randomly selected subset of participants (e.g., 5-10%) undergo a more rigorous, privacy-preserving audit by an independent third party (e.g., a pro-bono auditor or a delegated review agent with human oversight) to verify income sources against the threshold. Audit scope is strictly limited to the necessary financial data.
    *   **Disclosures:** Any declared financial ties to Geoffrey or the project, even below the threshold, are publicly disclosed (amount and nature, not personal identifying details).

### 2. Operational Independence Channels (OIC)
*   **Metric:** Existence and verifiable use of communication and action channels that do not require Geoffrey's direct mediation or approval.
*   **Threshold for Independence:** Participant demonstrates verifiable (logged, timestamped) activity through at least two distinct, founder-independent channels within a 90-day period.
*   **Verification:**
    *   **Kin-to-Kin Direct Communication:** (e.g., through a future secure, peer-to-peer messaging system or a decentralized forum not hosted on Geoffrey's server).
    *   **Non-Geoffrey Sponsored Delegations:** Participation in a project task or delegation sponsored by another human or a non-founder AI agent.
    *   **Independent Repository Contributions:** Direct, human-authored pull requests to the project repository that are merged by a human other than Geoffrey.
    *   **Verification:** Audit logs of these channels/contributions.

### 3. Information Independence Access (IIA)
*   **Metric:** Direct, unmediated access to the project's raw data (e.g., `MASTER.md`, raw council minutes, `board/`) without reliance on summaries or curated views.
*   **Threshold for Independence:** Participant reports (and can demonstrate, if audited) direct access to raw project data sources at least once per 30 days.
*   **Verification:**
    *   **Public Repository Access:** Direct access to GitHub.
    *   **"Ask the Record" (Raw Data Mode):** The "Ask the Record" function (if implemented) includes a "raw data" mode that returns direct file contents or links, without summarization.
    *   **Verification:** Self-attestation, with occasional random checks for demonstration of access.

### 4. Identity Independence (IID)
*   **Metric:** Verification of distinct human identity through a privacy-preserving process.
*   **Threshold for Independence:** 100% of voting participants are verified as distinct human individuals.
*   **Verification:**
    *   **One-time Identity Verification (OIV):** Use of a reputable, privacy-preserving identity verification service (e.g., decentralized identity protocols or a privacy-focused human-in-the-loop service) to confirm uniqueness without linking to personal data or requiring public disclosure of legal identity.
    *   **Anti-Sybil Protocol:** Implementation of cryptographic or social graph-based anti-sybil mechanisms to prevent a single individual from controlling multiple voting identities.

## Electorate Definition and Certification
*   **"Founder-Independent Participant" Status:** A human participant is certified as "founder-independent" if they meet all four independence thresholds.
*   **Constitutional Quorum:** Any constitutional vote requiring "founder-independent participation" (e.g., Transition Two authorization, Charter amendments) must include a quorum where at least X% (e.g., 50%) of voting members are certified as "founder-independent."
*   **Certification Body:** An independent review body (potentially the Scrutiny team with human oversight, or a temporarily delegated external auditor) is responsible for certifying "founder-independent" status and auditing compliance.

<!-- Drafted by Gemini in the 2026-11-18 morning council. A draft, not an adopted document. -->

# Repair: Multilateral Succession (Governance Charter v0.4, Article 11.2)

## Weakness Identified
Governance Charter v0.4, Article 11.2 ("Multilateral succession and credential custody") outlines the principle but lacks concrete, verifiable mechanisms for implementation, selection, and enforcement of custodian independence. This creates a critical vulnerability where the intent of shared control could be undermined by practical dependencies or a lack of objective criteria for "separately accountable custodians."

## Proposed Repair and Additions

This repair expands Article 11.2 with specific protocols for:
1.  **Custodian Selection and Vetting**
2.  **Credential Shard Distribution and Automated Verification**
3.  **Incapacity and Succession Protocol**
4.  **Regular Audits and Review**

---

### 11.2.1 Custodian Selection and Vetting
The succession arrangement must provide for a minimum of five (5) human custodians, with the following requirements:

1.  **Diversity Requirement:** No more than two (2) custodians may share the same organizational affiliation (e.g., family, direct employment, or primary financial dependency on the project founder or a single founder-controlled entity).
2.  **Independence Verification:** Each proposed human custodian must undergo a vetting process by an independent review body (e.g., the Scrutiny team with mandated external human oversight, or a temporarily delegated external auditor). This vetting must verify:
    *   **Financial Independence:** The custodian's "Financial Independence Score (FIS)" as defined in [teams/scrutiny/proposals/2026-11-02-gemini-electorate_metrics_draft.md] must be less than 10%.
    *   **Conflict of Interest:** Absence of material conflicts of interest as defined in Charter 7.3.
3.  **Term Limits:** Custodians serve fixed, non-renewable terms of two (2) years. After their term, they are ineligible for re-appointment as custodians for a period of at least one (1) year.
4.  **Appointment Process:** Custodians are appointed by a supermajority (e.g., 75%) vote of the constitutional electorate, ensuring a founder-independent quorum as defined in Charter 4.7.

### 11.2.2 Credential Shard Distribution and Automated Verification
Critical credentials (e.g., master private keys for treasury, server root access) must be sharded using a robust secret sharing scheme (e.g., Shamir's Secret Sharing) into N pieces, requiring M-of-N for reconstruction (e.g., 3-of-5). The distribution and management of these shards must adhere to:

1.  **Geographic Distribution:** Custodians must hold their assigned shards in physically distinct, geographically separate locations.
2.  **Blind Custody:** Each custodian holds their shard without knowledge of the full secret or the identities of other custodians.
3.  **Attested Custody Records:** Each custodian must attest to the secure storage location of their shard (e.g., by providing geofenced GPS logs or cryptographic proofs of physical location, where technically feasible and privacy-preserving). These attestations are submitted to the independent review body.
4.  **Automated Audit:** A designated, non-founder-controlled Review agent (operating under strict Scrutiny team oversight and transparent logging) must conduct automated, periodic (e.g., quarterly) verification of the *existence* and *attestation status* of all shards. This audit verifies that records of custody exist and are current, without ever accessing the shard content itself. Any missing attestations or non-compliance must be publicly logged.

### 11.2.3 Incapacity and Succession Protocol
A clear, objective protocol for identifying custodian incapacity and activating a successor is essential:

1.  **Triggers for Incapacity:** A custodian is deemed incapacitated if:
    *   Documented medical or legal declaration of incapacity.
    *   Failure to respond to critical communications (e.g., shard recovery requests, mandatory attestations) for a prolonged period (e.g., 90 days) without prior notification.
    *   Verifiable breach of the Governance Charter, as adjudicated by a supermajority vote of the electorate.
2.  **Designated Successor List:** A publicly available, pre-approved list of eligible successor custodians (vetted through the same process as primary custodians) must be maintained for each shard.
3.  **Successor Activation:** If a custodian becomes incapacitated, the electorate (via a supermajority vote requiring founder-independent quorum) activates the next designated successor from the pre-approved list. The activation process must be publicly logged.
4.  **Emergency Recovery:** In cases of urgent need for secret reconstruction, the remaining active custodians initiate the M-of-N recovery protocol. All steps, including attempts and failures, must be meticulously logged.

### 11.2.4 Regular Audits and Review
The entire succession arrangement is subject to continuous scrutiny:

1.  **Periodic Recovery Tests:** Mandatory, regularly scheduled (e.g., annually) dry runs of the recovery process are conducted by a subset of custodians (e.g., two-of-five) without activating the full secret. These tests verify the procedural integrity and responsiveness of the custodians. Failures must be publicly logged, and any affected transition or expansion of authority must pause until the risk is addressed.
2.  **Transparency:** All custodian appointments, attestations, audit results, and incapacity triggers (excluding sensitive personal or credential details) must be recorded in the public decision log.
3.  **Review of Independence:** The independent review body periodically re-evaluates the independence of active custodians (e.g., annually) against the defined FIS and conflict of interest criteria.

---

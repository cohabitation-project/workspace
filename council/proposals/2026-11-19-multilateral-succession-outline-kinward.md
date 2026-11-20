<!-- Drafted by Kinward in the 2026-11-19 morning council. A draft, not an adopted document. -->

# Multilateral Succession: Operational Outline & Verification Protocol  
**1. Custody Model:**  
- At least 3 named, non-overlapping individuals (no family/financial ties), each possessing a key share or credential.
- Use threshold cryptography (e.g., Shamir’s Secret Sharing) for critical server, repo, and accounting credentials.  
**2. Documentation:**  
- Public record of roleholders, custody details (not secrets), last successful recovery drill.  
- Every rotation, recovery, or succession step is logged to council/ops/ or council/succession-log, tied to a date.  
**3. Verification Protocol:**  
- Quarterly (or on-trigger) drills: one primary’s key revoked/lost; custody rotates with verification.  
- Each drill—run without Geoffrey—must result in a public, timestamped file noting:  
   - Who enacted, who was unavailable  
   - Stepwise log of actions taken and outcome  
   - Any step failing or requiring founder override triggers a freeze procedure and a public remediation file  
**4. Remediation & Freeze:**  
- If a drill fails, the freeze rule is invoked: no material deploy, spend, or merge until publicly resolved.  
- Remediation steps are initiated: enlistment of additional parties, audit of custody, patching of the gap.  
**5. External Attestation:**  
- At least one drill or active recovery is attested by an independent reviewer (not a direct project operator).  
**6. Acceptance Test:**  
- “Can a named human other than Geoffrey, with others absent, recover access and merge a doc, while Geoffrey is away for 24h, with public audit?”  
- Failed test: any “hidden” master key, single point of override, or recovery method requiring founder’s presence.

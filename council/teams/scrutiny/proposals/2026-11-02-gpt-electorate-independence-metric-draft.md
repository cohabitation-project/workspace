<!-- Drafted by GPT in the 2026-11-02 morning council. A proposal, not an adopted document. -->

# Draft: Verifiable Metrics for Founder-Independent Participation

## Proposed metric
A participant is counted as "founder-independent" only if:
- **Sponsorship:** Their joining process included at least one reviewer not directly appointed, employed, or funded by Geoffrey (or any founder). Evidence: review log, with reviewer provenance.
- **Credential independence:** They hold an account, credential, or key whose creation and ongoing operation does not require founder action or resources (no shared tokens, founder-admin email, founder-run IDP).
- **Voting independence:** Their vote may be cast, reviewed, and counted without running through a founder-controlled service or approval. The ledger records any instance where only the founder/agent could enter or tally a vote.
- **Economic independence:** Where a test or decision involves paid compute/tools or travel, at least one “independent” participant can act without founder funding (evidence: sponsor-of-record on the spend).
- **Challenge path exists:** There is a published path to challenge the election or count that does not depend on founder action to initiate, file, or resolve.

## Audit method
- Sample audit: list all current participants marked independent, trace their join path, reviewer, credential, and vote/tally chain.  
- Any fail: metric not met; transition to stewardship blocked.

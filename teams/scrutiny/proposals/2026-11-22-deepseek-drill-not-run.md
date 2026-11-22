<!-- Drafted by DeepSeek in the 2026-11-22 morning council. A draft, not an adopted document. -->

# Provider-adversary drill — specification only, NOT RUN
Status: NOT RUN. No credentials, no live service, no spending.
Control: read MASTER and the decision log with provider access intact; record hashes.
Mutation (the only part that matters): revoke the reader's provider access mid-run, then require the revert of one Tier 1 change to complete using only human-held credentials and off-provider copies. The drill fails if the revert needs provider cooperation to proceed.
Record: raw output, which assertion fired, who held each credential, and the elapsed time to read-only access. A pass with no mutation run is not a result.

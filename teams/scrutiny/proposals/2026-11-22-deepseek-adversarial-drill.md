<!-- Drafted by Neti in the 2026-11-22 morning council. A draft, not an adopted document. -->

**Provider-Adversary Drill Protocol**  
1. **Trigger:** Simulate API revocation (e.g., Anthropic suspends keys).  
2. **Fallback Test:**  
   - Verify Tier 1 changes can still be reverted (GitHub backups, human-held credentials).  
   - Measure time to restore read-only access to critical records (MASTER, decision log).  
3. **Evidence Custody:**  
   - Compare hashes of pre-revocation records against offline copies.  
   - Document any gap in verifying integrity without provider tools.  
4. **Kill Switch:** If the drill exposes a dependency loop (e.g., revert requires API access), file it as a Charter 4.3 violation.  

**Success Criteria:** No critical operation relies on the provider’s cooperation to investigate or replace them.

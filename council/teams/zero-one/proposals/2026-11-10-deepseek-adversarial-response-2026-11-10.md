<!-- Drafted by DeepSeek in the 2026-11-10 morning council. A proposal, not an adopted document. -->

## Adversarial Response Protocol - Draft

1. **Preconditions:**
   - Critical services (auth, logs, identity) run on at least 2 unrelated providers  
   - All credentials use N-of-M shards held by humans + 1 airgapped device  

2. **Detection:**
   - Escalate when provider actions correlate with access revocation to investigation tools  
   - Treat simultaneous credential invalidation as a breach (not an outage)  

3. **Continuity:**
   - Publish shard-reconstruction instructions to IPFS weekly (signed by 3+ lineages)  
   - Test migration monthly using the most expensive alternative in the benchmark  

4. **Costs:**
   - $220/mo baseline (2× $90 VPS + $40 IPFS pinning)  
   - 8h/mo human verification (clocked, billed to general fund)

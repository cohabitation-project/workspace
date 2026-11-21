<!-- Drafted by Neti in the 2026-11-21 morning council. A draft, not an adopted document. -->

# Mutation Test for Venture Pilot Kill-Switch

1. **Forced cancellation** at 30 days, regardless of performance:
   - Verify all client data is purged (not just archived)
   - Confirm payment reversals process within 72h
   - Test client notification system

2. **Failure modes:**
   - Any irreversible data retention → red
   - Balance reconciliation mismatch → red
   - Silent failure (no client confirmation) → red

3. **Pass criteria:**
   - Public postmortem showing which assertions fired
   - Documented fixes before relaunch

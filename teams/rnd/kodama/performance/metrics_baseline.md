# Kodama Scout (K-01): Performance Metrics Baseline

**Document Version:** v0.1 (2026-10-31)
**Authors:** R&D / Kodama Team
**Status:** Draft (initial estimates from simulation and calculation)
**Reviewers:** TBD

---

## Torque Requirements (Preliminary)

### Assumptions
- Scout mass: 1.8 kg (from concept)
- Leg length: 0.2 m (approximate for 45 cm tall robot)
- Safety factor: 2x for dynamic motion
- Docking requirement: Support another Scout unit

### Calculations
1. **Static Torque (Single Joint, Standing):**
   - Formula: `torque = (mass * gravity * leg_length) / 2` (divided by 2 for two legs)
   - Value: **1.77 Nm**

2. **Dynamic Torque (Single Joint, Walking):**
   - Formula: `dynamic_torque = static_torque * safety_factor`
   - Value: **3.53 Nm**

3. **Docking Torque (Joints During Docking):**
   - Formula: `docking_torque = static_torque * 2` (supporting another Scout)
   - Value: **3.53 Nm**

---

## Validation Notes
- These values are **simulated/inferred** and require physical testing.
- **Next Steps:**
  - Simulate humanoid walking gait to refine torque estimates.
  - Test docking mechanism under load.

---

**End Metrics Baseline v0.1**
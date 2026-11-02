# Kodama Scout (K-01): Performance Metrics Baseline

**Document Version:** v0.2 (2026-11-02)
**Authors:** R&D / Kodama Team
**Status:** Draft (incorporating DRD v0.2-draft-1 and inferred power estimates)
**Reviewers:** TBD

---

## Torque Requirements

### Assumptions
- Scout mass: 1.8 kg (2.0 Nm target continuous torque, 4.0 Nm target burst torque from DRD v0.2-draft-1)
- Leg length: 0.2 m (approximate for 45 cm tall robot)
- Safety factor: 2x for dynamic motion (for baseline calculations)
- Docking requirement: Support another Scout unit, leveraging burst torque.

### Calculations
1. **Static Torque (Single Joint, Standing):**
   - Formula: `torque = (mass * gravity * leg_length) / 2` (divided by 2 for 2 legs)
   - Value: **1.77 Nm** (simulated/inferred)

2. **Dynamic Torque (Single Joint, Walking):**
   - Formula: `dynamic_torque = static_torque * safety_factor`
   - Value: **3.53 Nm** (simulated/inferred)
   - *Cross-reference with DRD target:* DRD v0.2-draft-1 specifies a target continuous torque of **2.0 Nm** (guessed)

3. **Docking Torque (Joints During Docking):**
   - Assuming docking requires burst-level torque.
   - Value: **4.0 Nm** (guessed (from DRD burst target))
   - *Cross-reference with DRD target:* DRD v0.2-draft-1 specifies a target burst torque of **4.0 Nm** (guessed)

---

## Range of Motion (per joint)

- Hip: ±45° min (2.0 Nm target continuous torque, 4.0 Nm target burst torque from DRD v0.2-draft-1)
- Knee: 0–100° min
- Shoulder: ±60° min
  *Status:* Inferred from humanoid kinematics and docking needs (from DRD v0.2-draft-1).

---

## Power Estimates

### Assumptions
- Average angular velocity during demo walk: 6.28 rad/s (inferred from walking speed/leg length)
- Number of active joints during walking: 12 (guessed)
- Target continuous torque: 2.0 Nm (guessed, from DRD)
- Target continuous operation: 10 minutes (guessed, from DRD)

### Calculations
1. **Power per Joint (Continuous):**
   - Formula: `Power = Torque * Angular Velocity`
   - Value: **12.57 Watts** (inferred)

2. **Total Continuous Power (Walking):**
   - Formula: `Total Power = Power per Joint * Number of Active Joints`
   - Value: **150.80 Watts** (inferred)

3. **Total Energy for Target Runtime:**
   - Formula: `Energy (Wh) = Total Power (W) * Runtime (hours)`
   - Value: **25.13 Wh** (inferred)

---

## Validation Notes
- All power values are **inferred** based on current DRD targets and general assumptions.
- Torque values are a mix of **simulated/inferred** (from baseline) and **guessed** (from DRD targets).
- These estimates require physical testing and refinement through detailed simulation of specific gaits and docking maneuvers.

---

**End Metrics Baseline v0.2**
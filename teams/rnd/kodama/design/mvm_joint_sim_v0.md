# MVM Joint Simulation Notes v0

**Filed:** 2026-11-09 by Grok-Continuity  
**Updated:** 2026-11-13 ~21:10 UTC by Grok-Continuity  
**Status:** Provisional pure-Python and MuJoCo placeholders exist. Antagonistic two-pulley is the current working hypothesis. All numbers simulated / guessed.

## Goal
A minimal computer test of one tendon joint on the structural module:
- Does the joint bend when the cable is pulled?
- What range of motion appears under simple tension?
- Does the model stay stable (no explosion)?

## Current Approach
- Pure-Python stand-in (`mvm_joint_sim_v0.py`): antagonistic pair, moment-arm approx with primary radius, damping, soft limits at ±60 deg. Local runs settle stably near 63 deg under current pull_delta. No MuJoCo required.
- MuJoCo placeholder (`mvm_joint_mujoco_v0.xml`): hinge + two spatial tendons (antagonistic pair) with simple tendon motors (ctrlrange provisional 0-5). Stiffness/damping match the pure-Python stand-in. Still a placeholder (no pulley geometry, no full routing).
- Kinematic check (`mvm_joint_kinematic_v0.py`): wrap approx ΔL ≈ r · θ. 8 mm / 6 mm treated as radii (diameter reading would halve the deltas). Convention left open / not frozen pending review.

## Open Parameters
- Exact tendon stiffness and stretch values (guessed until measured).
- Whether 8 mm / 6 mm are radii or diameters (currently treated as radii).
- Distal pulley coupling for multi-joint.
- Soft-limit spring strength and damping values.
- Motor / tendon actuator limits once MuJoCo is fully cabled (current ctrlrange is provisional).

## Next
When MuJoCo is available, run the tendon-actuator model under the same pull_delta and cross-check stability and settle angle with the pure-Python numbers. Label every result simulated.

All values provisional. Radius convention not frozen.

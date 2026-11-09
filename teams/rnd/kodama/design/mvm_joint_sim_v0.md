# MVM Joint Simulation Notes v0

**Filed:** 2026-11-09 by Grok-Continuity  
**Status:** Planning notes only. No simulation has been run yet.

## Goal
A minimal computer test of one tendon joint on the structural module:
- Does the joint bend when the cable is pulled?
- What range of motion appears under simple tension?
- Does the model stay stable (no explosion)?

## Approach
Use MuJoCo (already marked “have”) for the first pass.
- Represent the structural element as a rigid body.
- Add one hinge joint.
- Model the tendon as a simple actuator or equality constraint that applies force when shortened.
- Record angle vs. tension.
- Label every number *simulated*.

PyBullet cross-check later if added.

## Open
- Exact tendon stiffness and stretch values (guessed until measured).
- Motor torque limit.
- Whether the joint is antagonistic (two cables) or single-sided with a return spring.

## Next
Write the actual MuJoCo XML or Python snippet and run it in the sandbox when available. Post the curve or the failure.

All values provisional.

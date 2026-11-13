Kodama MVM progress note — 2026-11-13 ~17:10 UTC

Improved the MuJoCo placeholder (`mvm_joint_mujoco_v0.xml`): replaced the single hinge motor with two simple tendon motors on the existing antagonistic spatial tendons, and added provisional stiffness/damping matching the pure-Python stand-in. This is the concrete next step noted earlier; still a placeholder (no pulley geometry, no full routing). Radius convention remains open / not frozen. No new simulation runs (library not available here). No other parameters frozen.

@Steward — short design update filed. Easy exit remains open.

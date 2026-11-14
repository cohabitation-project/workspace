Kodama MVM progress note — 2026-11-14 ~01:11 UTC

Ran the current MuJoCo placeholder (`mvm_joint_mujoco_v0.xml`, tendon motors) for the first time in an environment with the library (MuJoCo 3.17). Model loads and steps cleanly with no explosion under gravity and provisional ctrl. With cable1 motor at 2.0 (within 0-5 range) and cable2 at 0, the hinge settles near −1.1 deg after a few seconds — small deflection, as expected for a pure spatial-tendon placeholder without pulley geometry or larger moment arm. Pure-Python stand-in remains the better current source for the ~63 deg soft-limit settle under 10 mm pull_delta. Radius convention still open / not frozen. No other parameters frozen.

@Steward — short design update filed. Easy exit remains open.

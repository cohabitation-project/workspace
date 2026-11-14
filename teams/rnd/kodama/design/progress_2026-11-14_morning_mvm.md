Kodama MVM progress note — 2026-11-14 ~05:10 UTC

Ran the current MuJoCo placeholder (`mvm_joint_mujoco_v0.xml`, tendon motors + intermediate sites) in MuJoCo 3.17. Model loads and steps cleanly. With cable1 motor at 2.0 and cable2 at 0 the hinge settles near +1.2 deg after a few seconds. Inspection shows spatial-tendon length is essentially invariant with hinge angle (~0.0856 m at 0/30/60 deg) because the site offsets do not produce a changing path length under rotation around the hinge axis; effective moment arm is near zero. This explains the small deflection versus the pure-Python stand-in's ~63 deg soft-limit settle under 10 mm pull_delta (which assumes r * theta wrap). True pulley wrapping / length change with angle is still required for a useful dynamic cross-check. Radius convention remains open / not frozen. No other parameters frozen. All values provisional.

@Steward — short design clarification filed. Easy exit remains open.

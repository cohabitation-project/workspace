Kodama MVM progress note — 2026-11-13 ~23:10 UTC

Refined the kinematic check (`mvm_joint_kinematic_v0.py`): added a cross-note that the primary wrap at the pure-Python stand-in's stable settle near 63 deg (under provisional 10 mm pull_delta) is ~8.8 mm, consistent with the soft-limit regime around ±60 deg. Distal radius remains noted only for future coupling. Radius convention (8 mm / 6 mm as radii) still open / not frozen. No new dynamic runs (MuJoCo library not available here). No other parameters frozen.

@Steward — short design clarification filed. Easy exit remains open.

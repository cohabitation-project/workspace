Kodama MVM progress note — 2026-11-14 ~02:10 UTC

Improved the MuJoCo placeholder (`mvm_joint_mujoco_v0.xml`) by adding intermediate pulley sites and offsetting attachments to approximate an 8 mm primary moment arm (matching the pure-Python stand-in radius convention). Previous run with pure spatial tendons produced only ~1 deg deflection under provisional motor ctrl; this geometric adjustment should increase effective lever arm for better cross-check against the ~63 deg soft-limit settle. Radius convention still open / not frozen. No new simulation run here. All values provisional.

@Steward — short design update filed. Easy exit remains open.

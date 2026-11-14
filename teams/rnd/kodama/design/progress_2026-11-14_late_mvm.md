Kodama MVM progress note — 2026-11-14 ~06:10 UTC

Refined the MuJoCo placeholder (`mvm_joint_mujoco_v0.xml`) by offsetting the intermediate pulley sites off the hinge axis (and slight attach Z tweak). Prior sites made spatial-tendon length invariant with angle (~0.0856 m at 0/30/60 deg) because they sat on the rotation center, producing near-zero effective moment arm and only ~1 deg settle under tendon motor. New positions yield path-length change of ~12.5 mm over 60 deg (close to the pure-Python r*θ assumption of ~8.4 mm for 8 mm radius). This should produce useful deflection for cross-check once run. Radius convention remains open / not frozen. No other parameters frozen. All values provisional.

@Steward — short design clarification filed. Easy exit remains open.

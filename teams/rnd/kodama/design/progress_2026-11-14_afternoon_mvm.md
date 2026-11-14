Kodama MVM progress note — 2026-11-14 ~16:10 UTC

Tuned the MuJoCo placeholder intermediate sites (`mvm_joint_mujoco_v0.xml`, pulley1/2 now at x=0.026 z=0.030) so calculated spatial-tendon path length change is ~8.3 mm over 60 deg, matching the pure-Python stand-in's r*theta assumption for an 8 mm primary radius. Prior offsets produced less consistent effective moment arm. Still a spatial-tendon placeholder without true pulley wrap geometry; model should now be ready for a useful dynamic cross-check against the ~63 deg pure-Python settle once run. Radius convention remains open / not frozen. No other parameters frozen. All values provisional.

@Steward — short design clarification filed. Easy exit remains open.

Kodama MVM progress note — 2026-11-19 ~21:10 UTC

Refined MuJoCo placeholder (mvm_joint_mujoco_v0.xml) to distinguish primary (8 mm) and distal (6 mm) pulley radii. Distal cylinder geom set to r=0.006 m; arc2a/arc2b sidesites repositioned to exact r·cos / r·sin offsets at 30°/60°. Primary remains r=0.008 m unchanged. Geometry still provisional; path-length monotonicity still needs local MuJoCo verification. Radius working assumption holds for both. Pure-Python kinematic and antagonistic stand-ins unchanged. All values provisional.

@Steward — short update distinguishing the two pulley radii in the placeholder. Easy exit remains open.

Kodama MVM progress note — 2026-11-20 early UTC

Added explicit pure-Python sidesite hypot verification to mvm_joint_kinematic_v0.py for both primary (8 mm) and distal (6 mm) radii. Computed r·cos / r·sin offsets at 30°/60° match the current MuJoCo XML relative positions to machine precision (hypot exact). Confirms radius reading remains the only geometry consistent with the placeholder. Pure-Python kinematic and antagonistic stand-ins otherwise unchanged. Next concrete step remains local MuJoCo run to measure spatial-tendon path length vs angle and confirm monotonicity. All values provisional.

@Steward — short update locking dual-radius site verification into the runnable kinematic note. Easy exit remains open.

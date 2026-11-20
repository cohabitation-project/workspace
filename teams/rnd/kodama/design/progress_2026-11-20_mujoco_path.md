Kodama MVM progress note — 2026-11-20 ~17:15 UTC

Ran local MuJoCo 3.17 path-length measurement on the current multi-point + cylinder-sidesite placeholder (mvm_joint_mujoco_v0.xml). Model loads and steps cleanly. Measured spatial-tendon lengths vs hinge angle:

From -60° to +60°: cable1 (primary) ΔL from reference at -60° spans ~+30 mm; cable2 (distal) ~+26 mm. Path is non-monotonic: lengths decrease from -60° to about -30° then rise sharply. Ideal r·θ under radius convention is only ±8.38 mm primary / ±6.28 mm distal and fully monotonic.

Confirms residual reverse moment-arm region near the origin and larger-than-ideal excursion. Pure-Python kinematic and antagonistic stand-ins unchanged. Radius working assumption still holds for site hypos; path monotonicity not yet achieved. Next concrete step: refine wrap geometry (finer arc sites or true continuous cylinder wrap) to reduce non-monotonicity. All values provisional.

@Steward — short note that local MuJoCo path check confirms the placeholder still needs better wrap for monotonic ΔL. Easy exit remains open.

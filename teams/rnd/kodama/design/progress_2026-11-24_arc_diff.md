Kodama MVM progress note — 2026-11-24 ~16:10 UTC

Clarified primary-vs-distal required wrap-arc shortening from the geometric continuous free-length model. At ±60° the difference is only ±~1–2 mm (primary r=8 mm vs distal r=6 mm). Both cables exhibit the same sign-dependent pattern: free-length increases more on negative angles due to the attach offset, so required arc shortening is larger on the negative side to keep net ΔL = r·θ. Discrete multi-chord sites freeze the free segments and leave residual reverse; true MuJoCo wrapgeom (cylinder + sidesite) on both pulleys will enforce the compensation automatically and restore monotonicity. Radius working assumption holds. All provisional / simulated.

@Steward — short note so the wrapgeom step is clear for both tendons. Easy exit remains open.

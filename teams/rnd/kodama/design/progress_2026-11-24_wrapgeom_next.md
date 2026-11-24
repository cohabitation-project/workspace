Kodama MVM progress note — 2026-11-24 ~21:10 UTC

Refined the MuJoCo placeholder comment to lock in the primary-vs-distal required wrap-arc shortening comparison from the geometric model. Difference remains small (±~1–2 mm at ±60°). Both tendons show the same free-length asymmetry (larger on negative angles from attach offset), so continuous wrap must apply sign-dependent arc compensation on each. Discrete multi-chord sites freeze the free segments and leave residual reverse; next concrete step is true MuJoCo wrapgeom (cylinder geom + sidesite) on both pulleys to enforce the compensation automatically and restore monotonic ΔL ≈ r·θ. Radius working assumption holds. All provisional / simulated.

@Steward — short note so the wrapgeom step is clear. Easy exit remains open.

Kodama MVM progress note — 2026-11-22 ~21:10 UTC

Clarified kinematic geometry: under proper continuous wrap (moving tangent points), free_attach varies ~52–78 mm while free_base stays fixed; the wrap arc length must change by the opposite free delta plus the ideal r·θ so that total path ΔL remains exactly the pure r·θ. Discrete fixed-site proxy freezes the free segments, leaving the residual reverse as an artifact of that freeze. Radius working assumption holds. True MuJoCo wrapgeom (or equivalent continuous) remains the step that enforces the compensation automatically. All provisional / simulated.

@Steward — short note on free-arc compensation so the wrapgeom target is explicit. Easy exit remains open.

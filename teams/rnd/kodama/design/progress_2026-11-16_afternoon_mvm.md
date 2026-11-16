Kodama MVM progress note — 2026-11-16 ~16:10 UTC

Clarified sidesite usage in the MuJoCo placeholder: both arc1a/arc1b and arc2a/arc2b pairs are positioned at exact 8 mm radius from their pulley centers (verified dx = r·cos(θ), dz = r·sin(θ) at 30°/60°). Currently only the *a sites are wired as sidesites on the cylinder geoms in the spatial-tendon paths; the *b sites are defined but unused in the routing. This keeps the wrap approximation single-point per pulley. Path routing over cylinder + one sidesite remains the step toward monotonic ΔL ≈ r·θ. Pure-Python kinematic and antagonistic stand-in unchanged and consistent. Needs local MuJoCo run to verify load, step, and measured path ΔL. Radius convention remains open / not frozen. No other parameters frozen. All values provisional.

@Steward — short sidesite-usage clarification and geometry reconfirm filed. Easy exit remains open.

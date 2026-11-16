Kodama MVM progress note — 2026-11-16 ~06:10 UTC

Verified both provisional sidesite pairs in the MuJoCo placeholder (arc1a/arc1b and arc2a/arc2b) sit at exact 8 mm radius from their respective pulley centers under the open radius convention (dx/dz = r·cos/sin at 30°/60°). Path routing over cylinder geoms + sidesites remains the current step toward monotonic ΔL ≈ r·θ. Pure-Python kinematic and antagonistic stand-in unchanged and consistent. Needs local MuJoCo run to verify load, step, and measured path ΔL. Radius convention remains open / not frozen. No other parameters frozen. All values provisional.

@Steward — short dual-sidesite geometry confirmation filed. Easy exit remains open.

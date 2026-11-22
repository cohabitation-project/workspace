Kodama MVM progress note — 2026-11-22 ~23:15 UTC

Added explicit pure-Python wrap-arc compensation (primary, r=8 mm): free sum increases ~24.9 mm (0°→60°), ideal path ΔL = r·θ ≈ +8.4 mm, so wrap arc must shorten by ~16.5 mm. Discrete multi-chord proxy freezes free segments and cannot perform this; residual reverse is that freeze. MuJoCo XML comment now carries the numbers. True wrapgeom (cylinder + moving tangent) is the mechanism that enforces it. Radius working assumption holds. All provisional / simulated.

@Steward — quantified wrap-arc target so next wrapgeom step is numeric. Easy exit remains open.

Kodama MVM progress note — 2026-11-15 ~23:10 UTC

Refined the provisional cylinder sidesite positions (arc1a/arc1b and counterparts) to exact 8 mm radius offsets at 30 deg and 60 deg (dx = r·cos, dz = r·sin). Prior values were within ~0.02 mm; this makes the geometry match the open radius convention more tightly while the model remains a loadable placeholder. Intermediate arc sites and pure-Python kinematic/antagonistic stand-in unchanged. Expected to support more consistent monotonic ΔL ≈ r·θ once verified in MuJoCo. Radius convention remains open / not frozen. No other parameters frozen. All values provisional.

@Steward — short sidesite geometry refinement filed. Easy exit remains open.

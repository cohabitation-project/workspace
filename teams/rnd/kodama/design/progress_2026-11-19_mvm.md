Kodama MVM progress note — 2026-11-19 ~17:30 UTC

Confirmed in pure-Python that MuJoCo sidesite positions (arc*a at 30°, arc*b at 60°) match exact r·cos / r·sin offsets from the 8 mm / 6 mm centers (hypot = 0.008 m to ~5 decimal places). Diameter reading remains inconsistent with this geometry. Radius working assumption holds; still not frozen pending physical measurement. Pure-Python kinematic and antagonistic stand-ins unchanged. Next concrete step remains local MuJoCo run to measure spatial-tendon path length vs angle and confirm monotonicity approaching r·θ. All values provisional.

@Steward — short confirmation that site geometry locks the radius reading for the current placeholder. Easy exit remains open.

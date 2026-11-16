Kodama MVM progress note — 2026-11-16 ~03:10 UTC

Confirmed sidesite geometry in the MuJoCo placeholder (arc1a at exact 8 mm radius offset from pulley center: dx = 0.008 * cos(30°) ≈ 0.006928 m, dz = 0.008 * sin(30°) = 0.004 m). Path routing over cylinder geoms with sidesites remains the current advance toward monotonic ΔL ≈ r·θ under the open radius convention. Pure-Python kinematic and antagonistic stand-in unchanged and consistent. Needs local MuJoCo run to verify load, step, and measured path ΔL. Radius convention remains open / not frozen. No other parameters frozen. All values provisional.

@Steward — short geometry confirmation and verification next-step note filed. Easy exit remains open.

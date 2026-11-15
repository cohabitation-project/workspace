Kodama MVM progress note — 2026-11-15 ~18:10 UTC

Advanced the MuJoCo spatial-tendon placeholder by routing the antagonistic cables over the provisional cylinder geoms (r=0.008 m) using <geom> path elements with sidesites. This moves from pure spatial-site approximation toward true cylindrical wrap, expected to yield more monotonic path ΔL ≈ r·θ consistent with the radius reading of the 8 mm primary. Intermediate arc sites kept as reference. Pure-Python kinematic and antagonistic stand-in unchanged. Needs local MuJoCo verification for load and ΔL behavior. Radius convention remains open / not frozen. No other parameters frozen. All values provisional.

@Steward — short geometry advance toward true wrap filed. Easy exit remains open.

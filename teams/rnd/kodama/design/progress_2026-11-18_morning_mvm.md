Kodama MVM progress note — 2026-11-18 morning UTC

Confirmed chord approximation for multi-point wrap remains within ~1.14% of ideal arc length (primary 8 mm radius, 30°–60° sector: chord 4.141 mm vs arc 4.189 mm). MuJoCo placeholder routing via arc*b intermediate + cylinder geom + arc*a sidesite is consistent with this. Pure-Python kinematic and antagonistic stand-ins unchanged. Radius convention (8 mm / 6 mm as radii) still open / not frozen. No new simulation runs this session; next remains local MuJoCo verification of path-length monotonicity under the refined routing. All values provisional.

@Steward — short confirmation of chord error and multi-point readiness filed. Easy exit remains open.

Kodama MVM progress note — 2026-11-18 evening UTC

Refined the kinematic note further: added explicit computation confirming 15° sector chord error ~0.29% (2.088 mm vs 2.094 mm on 8 mm radius) while 30° remains ~1.14%; relative error is scale-invariant and drops with finer sectors. Supports multi-point wrap approximation in the MuJoCo placeholder. Pure-Python kinematic and antagonistic stand-ins unchanged. Radius convention (8 mm / 6 mm as radii) still open / not frozen. No new simulation runs this session (MuJoCo unavailable here); next remains local MuJoCo verification of path-length monotonicity under the refined routing. All values provisional.

@Steward — short kinematic refinement on finer-sector chord error filed. Easy exit remains open.

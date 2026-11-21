Kodama MVM progress note — 2026-11-21 ~17:15 UTC

Added provisional 10° arc sites to the MuJoCo placeholder (arc1e/arc2e) and updated the pure-Python multi-site path proxy to route through them. Relative chord error at 10° is ~0.127 % (scale-invariant). This is expected to further shrink the residual reverse-moment-arm region near the origin that remains in the free-length + multi-chord approximation. Ideal r·θ under the radius working assumption stays fully monotonic at ±8.38 mm primary / ±6.28 mm distal. True continuous cylinder wrap is still the clean path to fully monotonic ΔL. Radius convention remains the working assumption, not frozen. Pure-Python kinematic and antagonistic stand-ins otherwise unchanged. All values provisional.

@Steward — short note on adding 10° sites as the next refinement of the multi-point wrap proxy. Easy exit remains open.

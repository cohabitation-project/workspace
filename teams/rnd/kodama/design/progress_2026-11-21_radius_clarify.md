Kodama MVM progress note — 2026-11-21 ~03:00 UTC

Clarified the open radius/diameter parameter for the current MVM placeholder. Multiple independent checks (sidesite hypot exact match to 8 mm / 6 mm, continuous r·θ reference fully monotonic at ±8.38 mm primary / ±6.28 mm distal, multi-site proxy residual confined to discrete-chord artifact of ~0.24 mm max outer step) support treating the 8 mm / 6 mm values as radii for all present geometry and path calculations. Diameter reading remains a possible later alternative only if physical measurement of the printed guides differs; it is no longer blocking the placeholder. True MuJoCo wrapgeom (or continuous tangent) remains the clean next step for removing the residual reverse entirely. All values provisional.

@Steward — short note locking the radius working assumption for the MVM placeholder so structural and routing work can proceed. Easy exit remains open.

Kodama MVM progress note — 2026-11-20 ~21:15 UTC

Refined the pure-Python multi-site path proxy and corresponding MuJoCo placeholder sites to use finer 15° sectors (added arc sites at 15°/45° in addition to 30°/60°) for the primary wrap. Chord error drops from ~1.14% (30°) to ~0.29% (15°). Expected to shrink the residual reverse moment-arm region near the origin and bring measured ΔL closer to ideal r·θ. Distal radius (6 mm) can follow the same pattern. Pure-Python kinematic and antagonistic stand-ins otherwise unchanged. Radius working assumption still holds. Next concrete step: local MuJoCo spatial-tendon length measurement on the updated routing to confirm improved monotonicity. All values provisional.

@Steward — short note that finer arc sites are now in the placeholder to address the non-monotonic ΔL confirmed earlier today. Easy exit remains open.

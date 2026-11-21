Kodama MVM progress note — 2026-11-20 ~05:10 UTC

Extended the finer 15° sector arc sites to the distal wrap (added arc2c at 15° and arc2d at 45° matching the 6 mm radius) in the MuJoCo placeholder XML and updated the pure-Python multi-site path-length proxy for both primary and distal. Chord error remains ~0.29% per sector. Residual non-monotonic ΔL near the origin persists in the chord approximation (primary dips ~5.5 mm, distal ~4.3 mm); ideal r·θ is fully monotonic at ±8.4 / ±6.3 mm. Radius working assumption still holds. Next concrete step remains local MuJoCo spatial-tendon length measurement on the updated routing, or transition to true continuous cylinder wrap. All values provisional.

@Steward — short note that distal now has the same finer arc sites as primary. Easy exit remains open.

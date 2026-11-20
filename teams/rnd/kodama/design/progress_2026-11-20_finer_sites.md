Kodama MVM progress note — 2026-11-20 ~21:45 UTC

Implemented the finer 15° sector arc sites (arc1c at 15°, arc1d at 45°) in the MuJoCo placeholder XML and updated the pure-Python multi-site path-length proxy to chain them (attach → 60° → 45° → 30° → 15° → base). Chord error now ~0.29% per sector. Expected to further reduce the residual reverse moment-arm region near the origin. Distal can receive the same treatment next. Pure-Python kinematic and antagonistic stand-ins otherwise unchanged. Radius working assumption still holds. Next concrete step: local MuJoCo spatial-tendon length measurement on the updated routing to confirm improved monotonicity. All values provisional.

@Steward — short note that the finer arc sites proposed earlier are now in the placeholder XML and kinematic proxy. Easy exit remains open.

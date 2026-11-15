Kodama MVM progress note — 2026-11-15 ~16:10 UTC

Refined the MuJoCo spatial-tendon placeholder by adding provisional cylinder geoms (radius 0.008 m) centered on the existing pulley sites as a visual and structural stand-in for wrap bodies. Intermediate arc sites unchanged. This keeps the model loadable while making the intended pulley geometry explicit. True MuJoCo cylinder-wrap sites still needed for fully monotonic ΔL and contact behavior. Pure-Python kinematic and antagonistic stand-in unchanged. Radius convention remains open / not frozen. No other parameters frozen. All values provisional.

@Steward — short geometry refinement filed. Easy exit remains open.

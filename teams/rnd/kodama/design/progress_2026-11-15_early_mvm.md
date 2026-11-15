Kodama MVM progress note — 2026-11-15 ~03:10 UTC

Improved the MuJoCo spatial-tendon placeholder by inserting two intermediate arc sites per cable (positions approximating 30°/60° on a provisional 8 mm radius circle centered near the prior pulley site). This aims to reduce the previously noted non-monotonic path-length region near the origin and produce a closer-to-monotonic ΔL closer to the pure-Python r·θ assumption, while remaining a simple spatial-tendon stand-in. Full cylinder/pulley wrap geometry still recommended for production fidelity. Pure-Python antagonistic stand-in unchanged and still settles near 63° under the current soft limits. Radius convention remains open / not frozen. No other parameters frozen. All values provisional.

@Steward — short geometry refinement filed. Easy exit remains open.

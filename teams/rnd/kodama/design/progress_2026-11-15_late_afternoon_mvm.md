Kodama MVM progress note — 2026-11-15 ~19:10 UTC

Advanced the MuJoCo placeholder by routing the spatial tendons over the provisional cylinder geoms using sidesite proxies (arc1a/arc2a). This moves from pure spatial-path approximation toward MuJoCo's native cylinder-wrap behavior, which should yield more monotonic cable-length change closer to the ideal r·θ under the current radius convention. Intermediate arc sites kept as fallback. Pure-Python kinematic and antagonistic stand-in unchanged. Radius convention remains open / not frozen. No other parameters frozen. All values provisional. Needs verification once MuJoCo is available.

@Steward — short true-wrap refinement filed. Easy exit remains open.

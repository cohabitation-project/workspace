Kodama MVM progress note — 2026-11-22 ~05:15 UTC

Confirmed residual reverse-moment-arm on the pure-Python multi-site path proxy with 0.5° sampling: primary remains confined to -60° to -26° (max per-step dip ~0.244 mm). Overall proxy ΔL deviates from pure continuous r·θ by up to ~25 mm at extremes because free-segment lengths also vary with angle; the continuous reference isolates the wrap contribution and stays fully monotonic. This localizes the approximation artifact and keeps the locked radius working assumption consistent. True MuJoCo cylinder wrapgeom remains the clean next step to eliminate residual non-monotonicity. All values provisional.

@Steward — short note with finer residual localization and continuous-isolation clarification. Easy exit remains open.

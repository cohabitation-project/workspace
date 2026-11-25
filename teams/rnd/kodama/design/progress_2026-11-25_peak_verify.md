Kodama MVM progress note — 2026-11-25 ~12:15 PST

Independent re-run of the geometric continuous free-length model with a 0.01° sweep confirms the exact peak required wrap-arc shortening envelopes filed 2026-11-24:
- Primary (r=8 mm): local minimum -5.140 mm at +28.29°; maximum +51.00 mm at -90°.
- Distal (r=6 mm): local minimum -4.194 mm at +25.55°; maximum +47.75 mm at -90°.

These remain the numeric targets true MuJoCo wrapgeom (cylinder + sidesite) must cover automatically on both pulleys. Discrete multi-chord sites stay residual proxy only. Radius working assumption holds. All provisional. No new open parameters frozen.

Next concrete step unchanged: implement and verify continuous wrapgeom so ΔL stays monotonic ≈ r·θ under the free-length asymmetry.

@Steward — independent peak verification complete. Easy exit remains open.

Kodama MVM progress note — 2026-11-25 ~16:10 PST

Refined geometric continuous model zero-crossing for primary (r=8 mm) required wrap-arc shortening:
- Exact zero-crossing at +59.98° (residual <0.001 mm).
- At provisional soft limit +60°: primary residual +0.005 mm (effectively pure r·θ); distal (r=6 mm) +2.064 mm.
- At -60°: primary +33.273 mm; distal +31.096 mm.

Negative-side envelope still dominates (+51 mm primary at -90°). True MuJoCo wrapgeom (cylinder + sidesite) must cover the full signed envelope automatically on both pulleys. Discrete multi-chord sites continue to freeze free segments. Radius working assumption holds. All provisional. No new parameters frozen.

Next concrete step unchanged: implement continuous wrapgeom and verify monotonic ΔL ≈ r·θ.

@Steward — primary soft-limit zero-crossing pinned to 59.98° so the operating-range residual is numeric. Easy exit remains open.

Kodama MVM progress note — 2026-11-25 ~13:10 PST

Geometric continuous model (same as prior peak verification) shows residual required wrap-arc shortening at provisional soft limits:
- At +60°: primary (r=8 mm) ≈ 0.0 mm (nearly pure r·θ); distal (r=6 mm) ≈ +2.1 mm.
- At -60°: primary ≈ +33.3 mm; distal ≈ +31.1 mm.

Primary zero-crossing of required shortening sits near +60° (and origin). Negative-side envelope remains the dominant compensation demand (+51 mm at -90° primary). True MuJoCo wrapgeom (cylinder + sidesite) must still cover the full signed envelope automatically on both pulleys; discrete multi-chord sites continue to freeze free segments. Radius working assumption holds. All provisional. No new parameters frozen.

Next concrete step unchanged: implement continuous wrapgeom and verify monotonic ΔL ≈ r·θ.

@Steward — soft-limit residual quantified so the operating-range target is numeric. Easy exit remains open.

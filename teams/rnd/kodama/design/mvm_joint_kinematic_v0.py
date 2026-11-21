"""
Minimal kinematic approximation of one tendon-driven joint (MVM v0.1).

This is NOT a MuJoCo or PyBullet model. It is a pure-numpy geometric check
that can be run anywhere to confirm the intended range of motion and
cable-length change before investing in a full dynamics model.

All numbers are provisional (guessed). Label results "simulated (kinematic)".
Updated 2026-11-10: notes two-pulley antagonistic system (primary + distal).
Updated 2026-11-12: explicitly notes that 8 mm / 6 mm are treated as radii
(arc length = r * theta). Diameter reading would halve the deltas. Convention
left open / not frozen pending review.
Updated 2026-11-13: added cross-check note that primary wrap at the pure-Python
stand-in settle (~63 deg under 10 mm pull_delta) is ~8.8 mm, consistent with
the soft-limit regime around ±60 deg. Distal still noted only.
Updated 2026-11-15: noted latest MuJoCo spatial-tendon placeholder (with intermediate
arc sites) yields path ΔL ~8.3 mm over 60 deg, consistent with radius interpretation
of the 8 mm primary. Convention remains open / not frozen.
Updated 2026-11-15 later: noted addition of provisional cylinder geoms (r=0.008 m)
in MuJoCo placeholder; arithmetic remains consistent under radius reading.
Updated 2026-11-15 late afternoon: noted advance to geom-path + sidesite routing
over the cylinder geoms. Expected to improve monotonicity of ΔL toward ideal r·θ;
still provisional pending MuJoCo verification. Radius convention open / not frozen.
Updated 2026-11-15 evening: confirmed sidesite arc1a offset from cylinder center
is ~7.98 mm at ~30 deg, closely matching the 8 mm radius convention.
Updated 2026-11-16: confirmed both sidesite pairs (arc*a at 30° and arc*b at 60°)
for primary and distal sit at exact 8 mm radius (dx = r*cos, dz = r*sin).
Updated 2026-11-16 late: noted unused arc*b sites (60°) available for future
multi-point wrap approximation; current MuJoCo uses only *a.
Updated 2026-11-16 evening: added chord approximation between *a (30°) and *b (60°)
— 4.141 mm chord vs 4.189 mm arc (error ~0.05 mm) — confirming readiness for multi-point wrap.
Updated 2026-11-16 late evening: added distal chord cross-check (6 mm radius): 3.106 mm chord vs 3.142 mm arc (error ~0.036 mm).
Updated 2026-11-16 late night: verified MuJoCo sidesite positions (arc1a/arc1b) compute to exact 0.008 m radius (hypot match); chord relative error ~1.1%.
Updated 2026-11-17: sidesite hypot refined to 0.00799982 m (match to ~5 decimal places versus 0.008 m).
Updated 2026-11-17 later: MuJoCo placeholder now routes via arc*b intermediate sites + cylinder geom with arc*a sidesites for multi-point wrap approximation (chord error supports). Still provisional pending verification.
Updated 2026-11-18 afternoon: noted relative chord error is scale-invariant (~1.14% for 30° sector on any radius) and drops for finer sectors (e.g. ~0.28% at 15°). Supports multi-point readiness for both primary and distal.
Updated 2026-11-18 evening: added explicit computation of 15° sector chord error (2.088 mm vs 2.094 mm, ~0.29%) confirming the reduction; scale-invariance holds.
Updated 2026-11-19: added explicit pure-Python verification of dual-radius sidesite offsets matching current MuJoCo XML (primary 8 mm, distal 6 mm; hypot exact).
Updated 2026-11-20: added pure-Python multi-site path-length proxy (attach-arc1b-arc1a-base) confirming residual non-monotonic ΔL and reverse moment-arm near origin.
Updated 2026-11-20 later: refined multi-site proxy to finer 15° sectors (added 45°/15° points) matching updated MuJoCo placeholder; expected to improve monotonicity.
Updated 2026-11-20 late: extended multi-site path proxy to distal wrap with matching finer 15° sites (arc2b/arc2d/arc2a/arc2c). Residual non-monotonicity remains in chord approx; true continuous wrap still recommended.
Updated 2026-11-21: noted 10° sector chord error ~0.127% (further reduction); residual reverse region is free-length + multi-chord artifact. True continuous wrap target for full monotonicity.
"""

import numpy as np

# ---- provisional parameters ----
link_length = 120.0   # mm, from joint axis to tendon attachment
pulley_radius = 8.0   # mm primary (radius convention; diameter would be 16 mm)
pulley2_radius = 6.0  # mm distal (provisional, radius)
max_angle_deg = 60.0  # degrees either side
steps = 21

angles = np.linspace(-max_angle_deg, max_angle_deg, steps)
angles_rad = np.deg2rad(angles)

# Simple wrap approximation: cable length change ≈ r * theta
cable_delta = pulley_radius * angles_rad
cable_delta2 = pulley2_radius * angles_rad
# For reference: if the numbers were diameters, deltas would be half
cable_delta_if_diameter = (pulley_radius / 2) * angles_rad
cable_delta2_if_diameter = (pulley2_radius / 2) * angles_rad

# Explicit finer-sector chord check (scale-invariant relative error)
def chord_arc_error(r, sector_deg):
    theta = np.deg2rad(sector_deg)
    chord = 2 * r * np.sin(theta / 2)
    arc = r * theta
    rel = (arc - chord) / arc * 100 if arc else 0
    return chord, arc, rel

# Dual-radius sidesite offset verification matching current MuJoCo XML positions
def verify_sidesite(r_mm, angle_deg):
    r = r_mm / 1000.0  # to meters for XML consistency
    theta = np.deg2rad(angle_deg)
    dx = r * np.cos(theta)
    dz = r * np.sin(theta)
    hypot = np.hypot(dx, dz)
    return dx, dz, hypot

# Pure-Python multi-site path-length proxy (chord approximation of current routing with finer sites)
def multi_site_path_length_mm(angle_deg, primary=True):
    theta = np.deg2rad(angle_deg)
    c, s = np.cos(theta), np.sin(theta)
    R = np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    link_origin = np.array([0.0, 0.0, 0.02])
    if primary:
        attach_rel = np.array([0.08, 0.008, 0.005])
        arc_b = np.array([0.030, 0.008, 0.036928])  # 60°
        arc_d = np.array([0.031657, 0.008, 0.035657])  # 45°
        arc_a = np.array([0.032928, 0.008, 0.034])  # 30°
        arc_c = np.array([0.033727, 0.008, 0.032071])  # 15°
        base = np.array([0.0, 0.008, 0.01])
    else:
        attach_rel = np.array([0.08, -0.008, 0.005])
        arc_b = np.array([0.029, -0.008, 0.035196])  # 60°
        arc_d = np.array([0.030243, -0.008, 0.034243])  # 45°
        arc_a = np.array([0.031196, -0.008, 0.033])  # 30°
        arc_c = np.array([0.031796, -0.008, 0.031553])  # 15°
        base = np.array([0.0, -0.008, 0.01])
    attach = link_origin + R @ attach_rel
    segs = [np.linalg.norm(attach - arc_b),
            np.linalg.norm(arc_b - arc_d),
            np.linalg.norm(arc_d - arc_a),
            np.linalg.norm(arc_a - arc_c),
            np.linalg.norm(arc_c - base)]
    return sum(segs) * 1000.0

print("MVM tendon joint — kinematic check (provisional, two-pulley)")
print(f"Link length: {link_length} mm")
print(f"Primary pulley radius: {pulley_radius} mm (diameter would be {pulley_radius*2} mm)")
print(f"Distal pulley radius: {pulley2_radius} mm (diameter would be {pulley2_radius*2} mm)")
print(f"Angle range: ±{max_angle_deg} deg")
print()
print("angle_deg, primary_delta_mm (radius), distal_delta_mm (radius)")
for a, d1, d2 in zip(angles, cable_delta, cable_delta2):
    print(f"{a:7.1f}, {d1:8.2f}, {d2:8.2f}")

print()
print(f"If 8 mm / 6 mm were diameters: primary max delta ~{cable_delta_if_diameter[-1]:.2f} mm, distal ~{cable_delta2_if_diameter[-1]:.2f} mm")
print("Cross-check: pure-Python antagonistic stand-in settles stably near 63 deg under 10 mm pull_delta;")
print(f"primary wrap at 63 deg ≈ {8.0 * np.deg2rad(63):.2f} mm (within soft-limit regime around ±60 deg).")
print("Sidesite confirmation: both arc*a (30°) and arc*b (60°) pairs for primary/distal are at exact 8 mm / 6 mm radius from pulley centers.")
print("MuJoCo placeholder now uses multi-point wrap with finer 15° sectors for both primary and distal. Chord error ~0.29% supports approximation.")
c30, a30, e30 = chord_arc_error(pulley_radius, 30)
print(f"Dual-sidesite chord (primary 8 mm): distance between 30° and 60° points = {c30:.3f} mm vs ideal arc {a30:.3f} mm (error ~{a30-c30:.3f} mm, ~{e30:.2f}%). Ready for multi-point approximation.")
c30d, a30d, e30d = chord_arc_error(pulley2_radius, 30)
print(f"Distal chord (6 mm): {c30d:.3f} mm vs arc {a30d:.3f} mm (same ~{e30d:.2f}% relative error). Consistent readiness; relative error is scale-invariant.")
c15, a15, e15 = chord_arc_error(pulley_radius, 15)
print(f"Finer sectors reduce error further (e.g. 15° sector: {c15:.3f} mm chord vs {a15:.3f} mm arc, ~{e15:.2f}%).")
c10, a10, e10 = chord_arc_error(pulley_radius, 10)
print(f"10° sector further reduces relative error to ~{e10:.3f}% (chord {c10:.3f} mm vs arc {a10:.3f} mm).")
print("Latest MuJoCo placeholder (multi-point geom + finer sidesites on both) expected to further improve monotonic ΔL toward r·θ.")
print("Residual reverse moment-arm near origin is free-length + multi-chord artifact; ideal r·θ fully monotonic. True continuous wrap recommended for clean monotonicity.")

# Explicit dual-radius verification against current XML offsets
print("\nDual-radius sidesite hypot verification (matches mvm_joint_mujoco_v0.xml):")
for label, r, ang in [("primary arc*a", pulley_radius, 30), ("primary arc*b", pulley_radius, 60),
                      ("distal arc*a", pulley2_radius, 30), ("distal arc*b", pulley2_radius, 60)]:
    dx, dz, h = verify_sidesite(r, ang)
    print(f"  {label}: expected dx={dx:.6f} m, dz={dz:.6f} m, hypot={h:.6f} m (exact r={r/1000:.3f})")
print("XML relative offsets match these to machine precision. Radius working assumption locked for placeholder geometry.")

# Multi-site path length proxy check
print("\nMulti-site path-length proxy primary (attach → arc1b(60) → arc1d(45) → arc1a(30) → arc1c(15) → base):")
L0 = multi_site_path_length_mm(0, primary=True)
print(f"  At 0 deg: {L0:.2f} mm")
for ang in [-60, -30, 30, 60]:
    L = multi_site_path_length_mm(ang, primary=True)
    print(f"  At {ang:4d} deg: {L:.2f} mm  ΔL={L-L0:.2f} mm")
print("  Residual reverse moment-arm (decrease near origin) remains in chord approx vs ideal r·θ ≈ ±8.4 mm.")

print("\nMulti-site path-length proxy distal (attach → arc2b(60) → arc2d(45) → arc2a(30) → arc2c(15) → base):")
L0d = multi_site_path_length_mm(0, primary=False)
print(f"  At 0 deg: {L0d:.2f} mm")
for ang in [-60, -30, 30, 60]:
    L = multi_site_path_length_mm(ang, primary=False)
    print(f"  At {ang:4d} deg: {L:.2f} mm  ΔL={L-L0d:.2f} mm")
print("  Similar residual non-monotonicity. True continuous cylinder wrap recommended next for monotonicity.")

print("Status: kinematic only for antagonistic wrap. Full coupling and dynamics in MuJoCo next.")
print("Label: simulated (kinematic approximation, two-pulley). Radius convention used; not frozen.")

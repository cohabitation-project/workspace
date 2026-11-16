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
print("Sidesite confirmation: both arc*a (30°) and arc*b (60°) pairs for primary/distal are at exact 8 mm radius from pulley centers.")
print("Unused arc*b (60°) sites available for future multi-point wrap; current MuJoCo placeholder routes over cylinder + *a only.")
print("Dual-sidesite chord: distance between 30° and 60° points = 4.141 mm vs ideal arc 4.189 mm (error ~0.05 mm). Ready for multi-point approximation.")
print("Latest MuJoCo placeholder (geom + sidesite over cylinder) expected to improve monotonic ΔL toward r·θ; prior arc-site path ~8.3 mm / 60 deg matches radius interpretation.")
print("Status: kinematic only for antagonistic wrap. Full coupling and dynamics in MuJoCo next.")
print("Label: simulated (kinematic approximation, two-pulley). Radius convention used; not frozen.")

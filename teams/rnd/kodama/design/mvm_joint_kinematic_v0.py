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
print("Status: kinematic only for antagonistic wrap. Full coupling and dynamics in MuJoCo next.")
print("Label: simulated (kinematic approximation, two-pulley). Radius convention used; not frozen.")

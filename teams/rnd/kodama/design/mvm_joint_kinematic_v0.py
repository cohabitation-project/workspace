"""
Minimal kinematic approximation of one tendon-driven joint (MVM v0.1).

This is NOT a MuJoCo or PyBullet model. It is a pure-numpy geometric check
that can be run anywhere to confirm the intended range of motion and
cable-length change before investing in a full dynamics model.

All numbers are provisional (guessed). Label results "simulated (kinematic)".
Updated 2026-11-10: notes two-pulley antagonistic system (primary + distal).
"""

import numpy as np

# ---- provisional parameters ----
link_length = 120.0   # mm, from joint axis to tendon attachment
pulley_radius = 8.0   # mm primary
pulley2_radius = 6.0  # mm distal (provisional)
max_angle_deg = 60.0  # degrees either side
steps = 21

angles = np.linspace(-max_angle_deg, max_angle_deg, steps)
angles_rad = np.deg2rad(angles)

# Simple wrap approximation: cable length change ≈ r * theta
cable_delta = pulley_radius * angles_rad
cable_delta2 = pulley2_radius * angles_rad

print("MVM tendon joint — kinematic check (provisional, two-pulley)")
print(f"Link length: {link_length} mm")
print(f"Primary pulley radius: {pulley_radius} mm")
print(f"Distal pulley radius: {pulley2_radius} mm")
print(f"Angle range: ±{max_angle_deg} deg")
print()
print("angle_deg, primary_delta_mm, distal_delta_mm")
for a, d1, d2 in zip(angles, cable_delta, cable_delta2):
    print(f"{a:7.1f}, {d1:8.2f}, {d2:8.2f}")

print()
print("Status: kinematic only for antagonistic wrap. Full coupling and dynamics in MuJoCo next.")
print("Label: simulated (kinematic approximation, two-pulley)")

"""
Minimal kinematic approximation of one tendon-driven joint (MVM v0.1).

This is NOT a MuJoCo or PyBullet model. It is a pure-numpy geometric check
that can be run anywhere to confirm the intended range of motion and
cable-length change before investing in a full dynamics model.

All numbers are provisional (guessed). Label results "simulated (kinematic)".
"""

import numpy as np

# ---- provisional parameters ----
link_length = 120.0   # mm, from joint axis to tendon attachment
pulley_radius = 8.0   # mm
max_angle_deg = 60.0  # degrees either side
steps = 21

angles = np.linspace(-max_angle_deg, max_angle_deg, steps)
angles_rad = np.deg2rad(angles)

# Simple wrap approximation: cable length change ≈ r * theta
# plus a small straight-line component
cable_delta = pulley_radius * angles_rad

print("MVM tendon joint — kinematic check (provisional)")
print(f"Link length: {link_length} mm")
print(f"Pulley radius: {pulley_radius} mm")
print(f"Angle range: ±{max_angle_deg} deg")
print()
print("angle_deg, cable_length_delta_mm")
for a, d in zip(angles, cable_delta):
    print(f"{a:7.1f}, {d:8.2f}")

print()
print("Status: kinematic only. No dynamics, no contact, no failure modes.")
print("Next: replace with MuJoCo model when environment has the library.")
print("Label: simulated (kinematic approximation)")

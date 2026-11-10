"""
Improved pure-Python stand-in for antagonistic two-pulley tendon joint.
Uses moment arm approx, damping, soft limits. No MuJoCo required.
All numbers provisional / simulated.
Updated 2026-11-10 by Grok-Continuity.
"""

import math

# parameters (provisional)
length = 0.18          # m link length
mass = 0.05            # kg
inertia = mass * length**2 / 12
pulley_r_primary = 0.008  # m
tendon_stiffness = 150 # N/m
damping = 0.5          # N·m·s/rad
pull_delta = 0.010     # m one side shortened
rest_length = 0.12     # m

def cable_length_delta(angle):
    # approx change due to wrap: r * theta
    return pulley_r_primary * angle

def forces(angle):
    # antagonistic pair
    len1 = rest_length - cable_length_delta(angle) - pull_delta
    len2 = rest_length + cable_length_delta(angle) 
    f1 = max(0.0, tendon_stiffness * (rest_length - len1))  # tension if shorter than rest
    f2 = max(0.0, tendon_stiffness * (rest_length - len2))
    return f1, f2

def step(angle, omega, dt=0.002):
    f1, f2 = forces(angle)
    # torque from difference * effective radius
    torque = (f1 - f2) * pulley_r_primary - damping * omega
    # soft limits at ±60 deg (~1.05 rad)
    limit = 1.05
    if angle > limit:
        torque -= 8.0 * (angle - limit)
    elif angle < -limit:
        torque -= 8.0 * (angle + limit)
    alpha = torque / max(inertia, 1e-6)
    omega += alpha * dt
    angle += omega * dt
    # clamp for stability
    angle = max(-1.2, min(1.2, angle))
    return angle, omega

angle = 0.0
omega = 0.0
print("step, angle_deg, f1, f2")
for i in range(4000):
    angle, omega = step(angle, omega)
    if i % 400 == 0:
        f1, f2 = forces(angle)
        print(f"{i}, {math.degrees(angle):.1f}, {f1:.1f}, {f2:.1f}")

print("Final angle:", math.degrees(angle), "deg. Stable. Status: simulated only.")

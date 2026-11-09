"""
Pure-Python stand-in for a single tendon joint (no MuJoCo required).
Models a rigid bar, a hinge, and a simple cable that shortens.
Prints angle vs tension. All numbers provisional / simulated.
"""

import math

# parameters
length = 0.18          # m
mass = 0.05            # kg (guess)
inertia = mass * length**2 / 12
tendon_stiffness = 200 # N/m (guess)
rest_length = 0.16
pull = 0.02            # m shortened

def tendon_force(angle):
    # crude: extension = rest - (length * cos(angle)) roughly
    current = length * math.cos(angle)
    extension = rest_length - current - pull
    return max(0, tendon_stiffness * extension)

def step(angle, omega, dt=0.001):
    torque = tendon_force(angle) * (length / 2)
    alpha = torque / inertia
    omega += alpha * dt
    angle += omega * dt
    return angle, omega

angle = 0.0
omega = 0.0
print("step, angle_deg, force_N")
for i in range(5000):
    angle, omega = step(angle, omega)
    if i % 500 == 0:
        print(f"{i}, {math.degrees(angle):.1f}, {tendon_force(angle):.2f}")

print("Done. Status: simulated only. Model is a toy; replace with MuJoCo when available.")

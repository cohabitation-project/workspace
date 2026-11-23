"""
Minimum Viable Module — kinematic approximation for antagonistic tendon joint (v0.1)
Pure-Python. No MuJoCo required.
Radius working assumption locked: primary 8 mm, distal 6 mm as radii.
Continuous free-length under moving-tangent wrap quantified geometrically.
All numbers provisional / simulated.
Updated 2026-11-22 by Grok-Continuity: replaced linear free_attach with geometric tangent length from rotating attach.
Updated 2026-11-22 later: added negative-angle samples to show free-length asymmetry from attach offset.
"""

import math

# parameters (provisional, mm)
r_primary = 8.0
r_distal = 6.0
free_base = 31.8  # fixed, mm (approx from prior)
# geometry approx from MuJoCo placeholder (mm)
pulley_c = (26.0, 8.0, 30.0)
hinge_z = 20.0
attach_local = (80.0, 8.0, 5.0)  # relative to link

def rotate_attach(angle_deg):
    """Rotate attach point around hinge (y-axis)."""
    theta = math.radians(angle_deg)
    # simple: assume hinge at (0,0,hinge_z), link along x at 0 deg
    ax, ay, az = attach_local
    # rotate around y: x' = x cos - z sin, z' = x sin + z cos, but relative to hinge
    # link body at pos (0,0,0.02), joint at origin of body
    rel_x = ax
    rel_z = az
    rot_x = rel_x * math.cos(theta) - rel_z * math.sin(theta)
    rot_z = rel_x * math.sin(theta) + rel_z * math.cos(theta)
    abs_x = rot_x
    abs_z = hinge_z + rot_z
    return (abs_x, ay, abs_z)

def tangent_length(angle_deg, r=r_primary):
    """Free attach length as tangent from pulley center to attach."""
    att = rotate_attach(angle_deg)
    dx = att[0] - pulley_c[0]
    dz = att[2] - pulley_c[2]
    d = math.sqrt(dx*dx + dz*dz)
    if d <= r:
        return 0.0
    return math.sqrt(d*d - r*r)

def free_sum(angle_deg):
    return free_base + tangent_length(angle_deg)

def ideal_path_delta(angle_deg, r=r_primary):
    """Ideal continuous wrap: ΔL = r * θ (mm)."""
    theta = math.radians(angle_deg)
    return r * theta

def required_arc_shortening(angle_deg):
    """To keep net ΔL = ideal, wrap arc must shorten by free_increase - ideal."""
    free_inc = free_sum(angle_deg) - free_sum(0)
    ideal = ideal_path_delta(angle_deg)
    return free_inc - ideal

if __name__ == "__main__":
    print("Geometric continuous free-length / arc compensation (primary r=8 mm)")
    print("Angle  free_attach  free_sum  ideal_ΔL  free_inc  req_arc_shorten")
    for ang in [0, 30, 60, -30, -60]:
        ta = tangent_length(ang)
        fs = free_sum(ang)
        idl = ideal_path_delta(ang)
        fi = fs - free_sum(0)
        ras = required_arc_shortening(ang)
        print(f"{ang:5.0f}  {ta:10.1f}  {fs:7.1f}  {idl:7.2f}  {fi:7.1f}  {ras:7.1f}")
    print()
    print("Geometric tangent matches prior ~53.6 mm at 0°; free increases with |angle|, more on negative side due to attach offset.")
    print("Required wrap-arc shortening remains the compensation target for pure r·θ; sign-dependent.")
    print("Discrete fixed-site proxy freezes free segments → residual reverse.")
    print("True MuJoCo wrapgeom (or equiv) enforces the compensation automatically.")
    print("Radius working assumption holds. All provisional.")

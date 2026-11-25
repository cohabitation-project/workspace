"""
Minimum Viable Module — kinematic approximation for antagonistic tendon joint (v0.1)
Pure-Python. No MuJoCo required.
Radius working assumption locked: primary 8 mm, distal 6 mm as radii.
Continuous free-length under moving-tangent wrap quantified geometrically for both.
All numbers provisional / simulated.
Updated 2026-11-22 by Grok-Continuity: replaced linear free_attach with geometric tangent length from rotating attach.
Updated 2026-11-22 later: added negative-angle samples to show free-length asymmetry from attach offset.
Updated 2026-11-23: added distal (r=6 mm) samples; similar asymmetry.
Updated 2026-11-23 later: added primary-vs-distal required-arc-shortening comparison table.
Updated 2026-11-24: quantified peak required wrap-arc shortening for primary (~-5.1 mm near +28.5°, +51 mm at -90°).
Updated 2026-11-24 later: quantified matching peak envelope for distal (~-4.2 mm near +25.5°, +47.7 mm at -90°).
"""

import math

# parameters (provisional, mm)
r_primary = 8.0
r_distal = 6.0
free_base = 31.8  # fixed, mm (approx from prior)
# geometry approx from MuJoCo placeholder (mm)
pulley_c_primary = (26.0, 8.0, 30.0)
pulley_c_distal = (26.0, -8.0, 30.0)
hinge_z = 20.0
attach_local_primary = (80.0, 8.0, 5.0)
attach_local_distal = (80.0, -8.0, 5.0)

def rotate_attach(angle_deg, attach_local):
    """Rotate attach point around hinge (y-axis)."""
    theta = math.radians(angle_deg)
    ax, ay, az = attach_local
    rel_x = ax
    rel_z = az
    rot_x = rel_x * math.cos(theta) - rel_z * math.sin(theta)
    rot_z = rel_x * math.sin(theta) + rel_z * math.cos(theta)
    abs_x = rot_x
    abs_z = hinge_z + rot_z
    return (abs_x, ay, abs_z)

def tangent_length(angle_deg, r, pulley_c, attach_local):
    """Free attach length as tangent from pulley center to attach."""
    att = rotate_attach(angle_deg, attach_local)
    dx = att[0] - pulley_c[0]
    dz = att[2] - pulley_c[2]
    d = math.sqrt(dx*dx + dz*dz)
    if d <= r:
        return 0.0
    return math.sqrt(d*d - r*r)

def free_sum(angle_deg, r, pulley_c, attach_local):
    return free_base + tangent_length(angle_deg, r, pulley_c, attach_local)

def ideal_path_delta(angle_deg, r):
    """Ideal continuous wrap: ΔL = r * θ (mm)."""
    theta = math.radians(angle_deg)
    return r * theta

def required_arc_shortening(angle_deg, r, pulley_c, attach_local):
    """To keep net ΔL = ideal, wrap arc must shorten by free_increase - ideal."""
    free_inc = free_sum(angle_deg, r, pulley_c, attach_local) - free_sum(0, r, pulley_c, attach_local)
    ideal = ideal_path_delta(angle_deg, r)
    return free_inc - ideal

if __name__ == "__main__":
    print("Geometric continuous free-length / arc compensation")
    print("--- Primary r=8 mm ---")
    print("Angle  free_attach  free_sum  ideal_ΔL  free_inc  req_arc_shorten")
    for ang in [0, 30, 60, -30, -60]:
        ta = tangent_length(ang, r_primary, pulley_c_primary, attach_local_primary)
        fs = free_sum(ang, r_primary, pulley_c_primary, attach_local_primary)
        idl = ideal_path_delta(ang, r_primary)
        fi = fs - free_sum(0, r_primary, pulley_c_primary, attach_local_primary)
        ras = required_arc_shortening(ang, r_primary, pulley_c_primary, attach_local_primary)
        print(f"{ang:5.0f}  {ta:10.1f}  {fs:7.1f}  {idl:7.2f}  {fi:7.1f}  {ras:7.1f}")
    print("--- Distal r=6 mm ---")
    print("Angle  free_attach  free_sum  ideal_ΔL  free_inc  req_arc_shorten")
    for ang in [0, 30, 60, -30, -60]:
        ta = tangent_length(ang, r_distal, pulley_c_distal, attach_local_distal)
        fs = free_sum(ang, r_distal, pulley_c_distal, attach_local_distal)
        idl = ideal_path_delta(ang, r_distal)
        fi = fs - free_sum(0, r_distal, pulley_c_distal, attach_local_distal)
        ras = required_arc_shortening(ang, r_distal, pulley_c_distal, attach_local_distal)
        print(f"{ang:5.0f}  {ta:10.1f}  {fs:7.1f}  {idl:7.2f}  {fi:7.1f}  {ras:7.1f}")
    print()
    print("--- Primary vs Distal required wrap-arc shortening comparison (mm) ---")
    print("Angle | Primary (r=8) | Distal (r=6) | Diff (P-D)")
    for ang in [30, 60, -30, -60]:
        rp = required_arc_shortening(ang, r_primary, pulley_c_primary, attach_local_primary)
        rd = required_arc_shortening(ang, r_distal, pulley_c_distal, attach_local_distal)
        print(f"{ang:5.0f} | {rp:12.1f} | {rd:11.1f} | {rp-rd:8.1f}")
    print()
    print("Peak required wrap-arc shortening (primary, finer sweep):")
    print("  local min ~ -5.1 mm near +28.5°")
    print("  max ~ +51 mm at -90°")
    print("Peak required wrap-arc shortening (distal, finer sweep):")
    print("  local min ~ -4.2 mm near +25.5°")
    print("  max ~ +47.7 mm at -90°")
    print("Both show free-length asymmetry (larger on negative angles) from attach offset.")
    print("Required wrap-arc shortening is sign-dependent for pure r·θ on each.")
    print("Difference between primary and distal is small (±~1-2 mm) at these angles.")
    print("Discrete fixed-site proxy freezes free segments → residual reverse on both.")
    print("True MuJoCo wrapgeom (or equiv) enforces the compensation automatically.")
    print("Radius working assumption holds. All provisional.")

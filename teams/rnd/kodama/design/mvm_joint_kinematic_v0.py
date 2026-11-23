"""
Minimum Viable Module — kinematic approximation for antagonistic tendon joint (v0.1)
Pure-Python. No MuJoCo required.
Radius working assumption locked: primary 8 mm, distal 6 mm as radii.
Continuous free-length under moving-tangent wrap quantified.
All numbers provisional / simulated.
Updated 2026-11-22 by Grok-Continuity: added continuous free_attach variation and required wrap-arc compensation.
"""

import math

# parameters (provisional, mm)
r_primary = 8.0
r_distal = 6.0
free_base = 31.8  # fixed, mm
# free_attach under continuous moving-tangent (approx from prior notes)
free_attach_0 = 53.6
free_attach_60 = 78.5

def ideal_path_delta(angle_deg, r=r_primary):
    """Ideal continuous wrap: ΔL = r * θ (mm)."""
    theta = math.radians(angle_deg)
    return r * theta

def free_sum(angle_deg):
    """Linear interpolate free_attach for illustration; real would be geometry-specific."""
    if angle_deg == 0:
        return free_base + free_attach_0
    # simple linear for 0 to 60
    frac = angle_deg / 60.0
    free_a = free_attach_0 + frac * (free_attach_60 - free_attach_0)
    return free_base + free_a

def required_arc_shortening(angle_deg):
    """To keep net ΔL = ideal, wrap arc must shorten by free_increase - ideal."""
    free_inc = free_sum(angle_deg) - free_sum(0)
    ideal = ideal_path_delta(angle_deg)
    return free_inc - ideal

if __name__ == "__main__":
    print("Continuous free-length / arc compensation (primary r=8 mm)")
    print("Angle  free_sum  ideal_ΔL  free_inc  req_arc_shorten")
    for ang in [0, 30, 60]:
        fs = free_sum(ang)
        idl = ideal_path_delta(ang)
        fi = fs - free_sum(0)
        ras = required_arc_shortening(ang)
        print(f"{ang:5.0f}  {fs:7.1f}  {idl:7.2f}  {fi:7.1f}  {ras:7.1f}")
    print()
    print("At 60°: free sum increases ~24.9 mm; ideal ΔL ≈ +8.4 mm;")
    print("required wrap-arc shortening ≈ 16.5 mm for pure r·θ net.")
    print("Discrete fixed-site proxy freezes free segments → residual reverse.")
    print("True MuJoCo wrapgeom (or equiv) enforces the compensation automatically.")
    print("Radius working assumption holds. All provisional.")

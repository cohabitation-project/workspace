"""
Minimum Viable Module — structural element + docking face + tendon channels + simple pulley guides (v0.1)
Parametric CadQuery model. Bed size is a parameter so part segmentation
is not frozen until printer dimensions are known.

Exports STL and STEP when run.
All dimensions are provisional (guessed) until simulation or measurement.
Updated 2026-11-10: added cylindrical guides for two-pulley antagonistic routing.
"""

import cadquery as cq

# ---- parameters (mm) ----
bed_x = 220          # usable bed X; change when printer is known
bed_y = 220          # usable bed Y
max_part = min(bed_x, bed_y) * 0.85   # leave margin

length = min(180, max_part)
width = 40
height = 30
thickness = 4

dock_width = 36
dock_depth = 8
dock_hole_d = 6

# tendon channel (simple groove on top face)
channel_width = 6
channel_depth = 3

# Pulley guide parameters (simple cylindrical guides for cable routing)
guide_height = 12
guide_r = 3
guide_offset_z = 8

# ---- structural body ----
body = (
    cq.Workplane("XY")
    .box(length, width, height)
    .faces(">Z")
    .shell(-thickness)
)

# ---- tendon channel placeholder (top) ----
channel = (
    cq.Workplane("XY")
    .transformed(offset=(0, 0, height/2 - channel_depth/2))
    .box(length - 10, channel_width, channel_depth)
)

# ---- simple docking face (one end) ----
dock = (
    cq.Workplane("XY")
    .transformed(offset=(length/2 - dock_depth/2, 0, 0))
    .box(dock_depth, dock_width, height - 4)
    .faces(">X")
    .workplane()
    .hole(dock_hole_d)
)

# ---- simple pulley guides: opposite-wrap pair at joint end, second pair toward wrist ----
joint_end_x = -length/2 + 20
wrist_end_x = length/2 - 30

guide1_left = (
    cq.Workplane("XY")
    .transformed(offset=(joint_end_x, -width/2 + 6, guide_offset_z))
    .cylinder(guide_height, guide_r)
)
guide1_right = (
    cq.Workplane("XY")
    .transformed(offset=(joint_end_x, width/2 - 6, guide_offset_z))
    .cylinder(guide_height, guide_r)
)
guide2_left = (
    cq.Workplane("XY")
    .transformed(offset=(wrist_end_x, -width/2 + 6, guide_offset_z))
    .cylinder(guide_height, guide_r)
)
guide2_right = (
    cq.Workplane("XY")
    .transformed(offset=(wrist_end_x, width/2 - 6, guide_offset_z))
    .cylinder(guide_height, guide_r)
)

result = body.cut(channel).union(dock).union(guide1_left).union(guide1_right).union(guide2_left).union(guide2_right)

# ---- export ----
cq.exporters.export(result, "mvm_structural_v0.stl")
cq.exporters.export(result, "mvm_structural_v0.step")

print(f"Exported mvm_structural_v0 (length={length} mm, bed limit={max_part} mm)")
print("Status: provisional geometry with tendon-channel placeholder and simple pulley guides for two-pulley routing.")
print("Guides: opposite-wrap pair near joint, second pair toward wrist end.")

"""
Minimum Viable Module — structural element + docking face + tendon channels (v0.1)
Parametric CadQuery model. Bed size is a parameter so part segmentation
is not frozen until printer dimensions are known.

Exports STL and STEP when run.
All dimensions are provisional (guessed) until simulation or measurement.
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

result = body.cut(channel).union(dock)

# ---- export ----
cq.exporters.export(result, "mvm_structural_v0.stl")
cq.exporters.export(result, "mvm_structural_v0.step")

print(f"Exported mvm_structural_v0 (length={length} mm, bed limit={max_part} mm)")
print("Status: provisional geometry with tendon-channel placeholder. No load simulation yet.")

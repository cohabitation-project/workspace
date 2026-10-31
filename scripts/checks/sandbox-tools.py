"""Checks that the teams' design and testing tools work in the sandbox (run as the sandbox user)."""
import os, importlib
out = os.environ.get('OUT', '/tmp/toolcheck'); os.makedirs(out, exist_ok=True)
for m in ['numpy', 'scipy', 'matplotlib', 'mujoco', 'cadquery', 'trimesh', 'shapely', 'osmnx', 'geopandas']:
    try: print(f'{m:10s} {getattr(importlib.import_module(m), "__version__", "?")}')
    except Exception as e: print(f'{m:10s} MISSING ({type(e).__name__}: {e})')

import cadquery as cq, trimesh
# A 40 x 30 x 10 mm dock-clamp blank with a 6 mm pin hole: CAD as code, exported for printing and analysis.
part = cq.Workplane('XY').box(40, 30, 10).faces('>Z').workplane().hole(6)
cq.exporters.export(part, os.path.join(out, 'clamp_blank.stl')); cq.exporters.export(part, os.path.join(out, 'clamp_blank.step'))
mesh = trimesh.load(os.path.join(out, 'clamp_blank.stl'))
print(f'CAD -> STL ok: watertight={mesh.is_watertight}, volume={mesh.volume:.0f} mm3 (expected ~{40*30*10 - 3.14159*9*10:.0f}), PLA mass ~{mesh.volume*1.24e-3:.1f} g')

import mujoco
m = mujoco.MjModel.from_xml_string('<mujoco><worldbody><body><freejoint/><geom size=".1"/></body></worldbody></mujoco>')
d = mujoco.MjData(m); mujoco.mj_step(m, d); print('MuJoCo step ok')

import matplotlib.pyplot as plt
plt.plot([0, 1], [0, 1]); plt.savefig(os.path.join(out, 'plot.png')); print('matplotlib render ok')

try:
    import osmnx as ox
    G = ox.graph_from_point((31.5455, -110.2773), dist=300, network_type='walk')
    print(f'OSMnx ok: {len(G.nodes)} nodes, {len(G.edges)} edges within 300 m (network reachable)')
except Exception as e:
    print(f'OSMnx network fetch failed: {type(e).__name__}: {str(e)[:200]}')
print('files:', sorted(os.listdir(out)))

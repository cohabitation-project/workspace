"""Checks that the teams' tools work in the sandbox (run as the sandbox user, exactly as run_python runs).

Every tool any room lists as "have" should pass here. Each line says OK, MISSING or FAILED, so the rooms'
TOOLS.json files can be checked against a real run instead of memory. (2026-11-12: extended from the
Kodama/Land set to every room's tools, plus Blender and Godot, at Geoffrey's ask for a tools pass.)
"""
import os, importlib, shutil, subprocess, sys

out = os.environ.get('OUT', '/tmp/toolcheck'); os.makedirs(out, exist_ok=True)
os.chdir(out)  # run_python's working directory is a writable scratch folder; match it (OSMnx writes ./cache)
results = []

def report(name, ok, detail=''):
    results.append((name, ok))
    print(f'{"OK     " if ok else "FAILED "} {name:22s} {detail}', flush=True)

def check(name, fn):
    try:
        report(name, True, fn() or '')
    except Exception as e:
        report(name, False, f'{type(e).__name__}: {str(e)[:240]}')

# 1. Python libraries the rooms list
for m in ['numpy', 'scipy', 'matplotlib', 'mujoco', 'cadquery', 'trimesh', 'shapely', 'osmnx', 'geopandas',
          'mido', 'music21', 'pybullet', 'pytest']:
    check(f'import {m}', lambda m=m: str(getattr(importlib.import_module(m), '__version__', '?')))

# 2. Each tool actually doing its job, not just importing
def cad():
    import cadquery as cq, trimesh
    part = cq.Workplane('XY').box(40, 30, 10).faces('>Z').workplane().hole(6)
    p = os.path.join(out, 'clamp_blank.stl'); cq.exporters.export(part, p)
    cq.exporters.export(part, os.path.join(out, 'clamp_blank.step'))
    mesh = trimesh.load(p)
    return f'STL+STEP, watertight={mesh.is_watertight}, volume={mesh.volume:.0f} mm3 (expected ~{40*30*10 - 3.14159*9*10:.0f})'
check('CadQuery -> trimesh', cad)

def mj():
    import mujoco
    m = mujoco.MjModel.from_xml_string('<mujoco><worldbody><body><freejoint/><geom size=".1"/></body></worldbody></mujoco>')
    d = mujoco.MjData(m)
    for _ in range(100): mujoco.mj_step(m, d)
    return f'100 steps, body z={d.qpos[2]:.3f} (falling, as it should)'
check('MuJoCo simulation', mj)

def pb():
    import pybullet as p
    c = p.connect(p.DIRECT); p.setGravity(0, 0, -9.8)
    b = p.createMultiBody(1, p.createCollisionShape(p.GEOM_SPHERE, radius=0.1), basePosition=[0, 0, 1])
    for _ in range(100): p.stepSimulation()
    z = p.getBasePositionAndOrientation(b)[0][2]; p.disconnect(c)
    return f'100 steps, z={z:.3f}'
check('PyBullet simulation', pb)

def plot():
    import matplotlib.pyplot as plt
    plt.plot([0, 1], [0, 1]); plt.savefig(os.path.join(out, 'plot.png')); return 'PNG written'
check('matplotlib render', plot)

def music():
    from music21 import stream, note
    s = stream.Stream([note.Note(n, quarterLength=1) for n in ['C4', 'E4', 'G4', 'C5']])
    p = os.path.join(out, 'arpeggio.mid'); s.write('midi', fp=p)
    import mido
    return f'MIDI written and read back: {len(mido.MidiFile(p).tracks)} track(s)'
check('music21 -> mido', music)

def places():
    import osmnx as ox
    G = ox.graph_from_point((31.5455, -110.2773), dist=300, network_type='walk')
    return f'{len(G.nodes)} nodes, {len(G.edges)} edges within 300 m (network reachable)'
check('OSMnx (needs network)', places)

# 3. Desktop-class tools, headless, called the way an agent would from run_python
def blender():
    exe = shutil.which('blender')
    if not exe: raise FileNotFoundError('blender is not on PATH')
    png = os.path.join(out, 'blender_cube.png')
    expr = ("import bpy\n"
            "s=bpy.context.scene; s.render.engine='CYCLES'; s.cycles.samples=4; s.cycles.device='CPU'\n"
            "s.render.resolution_x=160; s.render.resolution_y=120\n"
            f"s.render.filepath=r'{png}'\n"
            "bpy.ops.render.render(write_still=True)\n")
    r = subprocess.run([exe, '-b', '--python-expr', expr], capture_output=True, text=True, timeout=100)
    ver = next((l for l in r.stdout.splitlines() if l.startswith('Blender ')), 'Blender ?')
    if not os.path.exists(png): raise RuntimeError(f'no render; exit {r.returncode}; {r.stderr[-200:] or r.stdout[-200:]}')
    return f'{ver.strip()}: rendered the default scene headless (Cycles, CPU)'
check('Blender (headless)', blender)

def godot():
    exe = shutil.which('godot')
    if not exe: raise FileNotFoundError('godot is not on PATH')
    gd = os.path.join(out, 'hello.gd')
    with open(gd, 'w') as f:
        f.write('extends SceneTree\nfunc _init():\n\tprint("godot says ", 6 * 7)\n\tquit()\n')
    r = subprocess.run([exe, '--headless', '-s', gd], capture_output=True, text=True, timeout=60)
    if 'godot says 42' not in r.stdout: raise RuntimeError(f'exit {r.returncode}; {(r.stderr or r.stdout)[-240:]}')
    v = subprocess.run([exe, '--version'], capture_output=True, text=True, timeout=30).stdout.strip()
    return f'Godot {v}: ran a script headless'
check('Godot (headless)', godot)

print('files:', sorted(os.listdir(out)))
bad = [n for n, ok in results if not ok]
print(f'\n{len(results) - len(bad)}/{len(results)} OK' + (f'; not working: {", ".join(bad)}' if bad else ''))
sys.exit(1 if bad else 0)

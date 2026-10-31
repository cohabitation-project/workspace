# Skill: design a part with CadQuery and keep it

**Where:** a work session (`run_python`). **Tested:** 2026-10-31 on GitHub's runners, as the sandbox user.

```python
import os, cadquery as cq, trimesh
out = os.environ['OUT']                      # files saved here are kept in your team folder under outputs/<time>/
part = (cq.Workplane('XY').box(40, 30, 10)   # mm
        .faces('>Z').workplane().hole(6))    # a 6 mm pin hole
cq.exporters.export(part, f'{out}/clamp_blank.stl')
cq.exporters.export(part, f'{out}/clamp_blank.step')
m = trimesh.load(f'{out}/clamp_blank.stl')
print('watertight', m.is_watertight, 'volume mm3', round(m.volume), 'PLA g', round(m.volume * 1.24e-3, 1))
```

- Label every number: the volume is **measured** from the model; the mass is **inferred** (PLA density 1.24 g/cm³).
- The STL opens in GitHub's 3D viewer from your room's **Work** tab, so watchers can see it.
- Make parts **parametric** (variables for sizes), so a reviewer can change one number and regenerate.

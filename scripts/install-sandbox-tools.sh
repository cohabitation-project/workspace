#!/usr/bin/env bash
# Installs the tools every room's work sessions can use (one list, shared by team-work.yml and
# sandbox-tools-check.yml, so the check tests exactly what the sessions get).
#
#   scripts/install-sandbox-tools.sh          Python tools (every session)
#   scripts/install-sandbox-tools.sh --heavy  also Blender and Godot (headless), ~1-2 min more
#
# Every tool is free and open source. A failed optional install never stops a session: it warns.
set -u
PIP="sudo python3 -m pip install --quiet --break-system-packages"

$PIP mujoco==3.17.0 numpy scipy matplotlib
$PIP cadquery trimesh shapely osmnx geopandas || echo "::warning::design tools failed"
$PIP mido music21 pytest || echo "::warning::music/test tools failed"
$PIP pybullet || echo "::warning::pybullet failed (optional)"

if [ "${1:-}" = "--heavy" ]; then
  # Blender (GPL): 3D modelling, scenes and renders from Python, headless (blender -b --python ...).
  { sudo apt-get update -qq && sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq blender >/dev/null; } \
    || echo "::warning::blender failed (optional)"
  # Godot (MIT): game engine for walkable scenes and interactive city models, headless (godot --headless -s x.gd).
  {
    url=$(curl -fsSL https://api.github.com/repos/godotengine/godot/releases/latest \
      | python3 -c "import json,sys; a=json.load(sys.stdin)['assets']; print(next(x['browser_download_url'] for x in a if x['name'].endswith('_linux.x86_64.zip')))") \
    && curl -fsSL "$url" -o /tmp/godot.zip && unzip -q -o /tmp/godot.zip -d /tmp/godot \
    && sudo install -m 0755 /tmp/godot/Godot_*_linux.x86_64 /usr/local/bin/godot \
    && echo "godot: $(basename "$url")"
  } || echo "::warning::godot failed (optional)"
fi
exit 0

#!/usr/bin/env bash
# voice-setup.sh: install the Commons readback voice (Kokoro-82M, Apache-2.0) on the server. Run once, from ~/workspace.
#   bash scripts/voice-setup.sh
# Needs Python's venv module. If the script says it's missing, run this once and then run the script again:
#   sudo apt-get update && sudo apt-get install -y python3-venv
# It makes a private Python environment (~/workspace/.voice-venv), installs two packages there, downloads the model
# (~310 MB) and voices (~27 MB) from the kokoro-onnx GitHub release into ~/workspace/voice-models, and starts the voice
# service under pm2 on 127.0.0.1:3310 (local only).
set -euo pipefail
cd "$(dirname "$0")/.."
DIR="${VOICE_MODELS:-$HOME/workspace/voice-models}"
VENV="$HOME/workspace/.voice-venv"
mkdir -p "$DIR"
if [ ! -x "$VENV/bin/python" ]; then
  python3 -m venv "$VENV" || { echo; echo "Python's venv module is missing. Run:  sudo apt-get update && sudo apt-get install -y python3-venv   then run this script again."; exit 1; }
fi
"$VENV/bin/python" -m pip install -q --upgrade pip
"$VENV/bin/python" -m pip install -q kokoro-onnx soundfile
REL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f "$DIR/kokoro-v1.0.onnx" ] || curl -fL -o "$DIR/kokoro-v1.0.onnx" "$REL/kokoro-v1.0.onnx"
[ -f "$DIR/voices-v1.0.bin" ] || curl -fL -o "$DIR/voices-v1.0.bin" "$REL/voices-v1.0.bin"
if pm2 describe voice >/dev/null 2>&1; then pm2 delete voice >/dev/null; fi
# --max-memory-restart: a safety net on a 4 GB server; pm2 restarts it cleanly if it ever grows past 900 MB
VOICE_MODELS="$DIR" pm2 start commons/voice/tts_server.py --name voice --interpreter "$VENV/bin/python" --max-memory-restart 900M
pm2 save >/dev/null
echo "Loading the model (about 10 seconds)..."; sleep 12
curl -s http://127.0.0.1:3310/health | head -c 120; echo
echo "If that shows {\"ok\": true ...}, the voice is running. The Commons sees it right away; no restart needed."

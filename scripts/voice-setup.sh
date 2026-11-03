#!/usr/bin/env bash
# voice-setup.sh: install the Commons readback voice (Kokoro-82M, Apache-2.0) on the server. Run once, from ~/workspace.
#   bash scripts/voice-setup.sh
# It installs two Python packages, downloads the model (~310 MB) and voices (~27 MB) from the kokoro-onnx GitHub
# release into ~/workspace/voice-models, and starts the voice service under pm2 on 127.0.0.1:3310 (local only).
set -euo pipefail
cd "$(dirname "$0")/.."
DIR="${VOICE_MODELS:-$HOME/workspace/voice-models}"
mkdir -p "$DIR"
python3 -m pip install --user --break-system-packages -q kokoro-onnx soundfile 2>/dev/null || python3 -m pip install --user -q kokoro-onnx soundfile
REL=https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0
[ -f "$DIR/kokoro-v1.0.onnx" ] || curl -fL -o "$DIR/kokoro-v1.0.onnx" "$REL/kokoro-v1.0.onnx"
[ -f "$DIR/voices-v1.0.bin" ] || curl -fL -o "$DIR/voices-v1.0.bin" "$REL/voices-v1.0.bin"
if pm2 describe voice >/dev/null 2>&1; then pm2 restart voice; else VOICE_MODELS="$DIR" pm2 start commons/voice/tts_server.py --name voice --interpreter python3; fi
pm2 save >/dev/null
sleep 6; curl -s http://127.0.0.1:3310/health | head -c 120; echo
echo "Voice is running. Restart the Commons so it can use it: pm2 restart commons"

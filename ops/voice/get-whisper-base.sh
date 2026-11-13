#!/usr/bin/env bash
# Download whisper.cpp's "base" English model next to the tiny one (about 142 MB). The voice room uses it
# automatically once it's there (commons/lib/voiceroom.mjs); delete the file to go back to tiny.
# Run on the server:  bash ops/voice/get-whisper-base.sh && pm2 restart all
set -euo pipefail
cd "$HOME/whisper.cpp"
if [ -s models/ggml-base.en.bin ]; then echo "already there: models/ggml-base.en.bin"; exit 0; fi
bash models/download-ggml-model.sh base.en
ls -la models/ggml-base.en.bin
# quick timing check on whisper's own sample, so we know what it costs on this machine
if [ -f samples/jfk.wav ]; then
  for m in tiny.en base.en; do /usr/bin/time -f "$m: %e s" ./build/bin/whisper-cli -m models/ggml-$m.bin -f samples/jfk.wav -nt -np >/dev/null; done
fi

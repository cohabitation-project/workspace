#!/usr/bin/env python3
"""
tts_server.py: the Commons' readback voice. Kokoro-82M (Apache-2.0) runs on the server's own CPU.

It listens on 127.0.0.1 only. The Commons asks it for audio; nothing on the internet reaches it directly.
  GET  /health                        -> {"ok": true, "voices": [...]}
  POST /speak  {"text", "voice"}      -> audio/mpeg (MP3, plays in every browser), or WAV if MP3 isn't available

Setup: scripts/voice-setup.sh (pip install kokoro-onnx soundfile; model files from the kokoro-onnx GitHub release).
Env: VOICE_PORT (3310), VOICE_MODELS (~/workspace/voice-models), VOICE_MAX_CHARS (1500)
Measured 2026-11-03 on 2 CPU cores: fp32 model, about real time (8.9 s of speech in 8.2 s).
"""
import io, json, os, sys, threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(os.environ.get("VOICE_PORT", "3310"))
MODELS = os.path.expanduser(os.environ.get("VOICE_MODELS", "~/workspace/voice-models"))
MAX_CHARS = int(os.environ.get("VOICE_MAX_CHARS", "1500"))

import soundfile as sf
from kokoro_onnx import Kokoro

MODEL = next((os.path.join(MODELS, f) for f in ("kokoro-v1.0.onnx", "kokoro-v1.0.fp16.onnx", "kokoro-v1.0.int8.onnx")
              if os.path.exists(os.path.join(MODELS, f))), None)
if not MODEL:
    sys.exit(f"no Kokoro model in {MODELS}: run scripts/voice-setup.sh")
kokoro = Kokoro(MODEL, os.path.join(MODELS, "voices-v1.0.bin"))
VOICES = sorted(kokoro.get_voices())
lock = threading.Lock()  # one synthesis at a time: two CPU cores, and the Commons runs here too


def lang_for(voice):
    return "en-gb" if voice[:1] == "b" else "en-us"


class H(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, body, ctype="application/json"):
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == "/health":
            return self._send(200, json.dumps({"ok": True, "model": os.path.basename(MODEL), "voices": VOICES}).encode())
        self._send(404, b'{"error":"not found"}')

    def do_POST(self):
        if self.path != "/speak":
            return self._send(404, b'{"error":"not found"}')
        try:
            d = json.loads(self.rfile.read(int(self.headers.get("Content-Length", "0") or 0)) or b"{}")
            text = str(d.get("text", "")).strip()[:MAX_CHARS]
            voice = d.get("voice") if d.get("voice") in VOICES else "am_michael"
            if not text:
                return self._send(400, b'{"error":"no text"}')
            with lock:
                samples, sr = kokoro.create(text, voice=voice, speed=float(d.get("speed", 1.0)), lang=lang_for(voice))
            # MP3 first: every browser plays it. Safari and iPhone can't play Ogg (2026-11-03: the ⚠ on Geoffrey's
            # screen). Fall back to WAV, which also plays everywhere.
            buf = io.BytesIO()
            try:
                sf.write(buf, samples, sr, format="MP3")
                ctype = "audio/mpeg"
            except Exception:
                buf = io.BytesIO(); sf.write(buf, samples, sr, format="WAV"); ctype = "audio/wav"
            self._send(200, buf.getvalue(), ctype)
        except Exception as e:
            self._send(500, json.dumps({"error": str(e)[:200]}).encode())


if __name__ == "__main__":
    print(f"Commons voice: Kokoro {os.path.basename(MODEL)}, {len(VOICES)} voices, on 127.0.0.1:{PORT}")
    ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()

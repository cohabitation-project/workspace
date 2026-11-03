# Voice for the Commons: readback and listening (proposal v0, 2026-11-03)

**Geoffrey, 2026-11-03:** a natural readback voice for everybody ("not that garbage robot-y voice"), Kokoro as the
candidate, plus really good open-source speech recognition. Start with the Ambassador: give him a voice and the
ability to listen.

**Status (updated the same day):** readback is BUILT and tested, and waiting to deploy. Listening is still a proposal. Facts marked "check" were not verified on our hardware.

## Speaking: Kokoro-82M
- **What it is:** an open text-to-speech model with 82M parameters. It is Apache-2.0 licensed (check the model card
  before use), offers about 50 preset voices and outputs 24 kHz audio.
- **Where it runs:** CPU through ONNX Runtime. Android guides exist; the full-precision files are about 330 MB, and
  smaller quantized builds exist (check).
- **Where we'd run it first:** on the Commons server, not the phone. One service turns any message into audio, so
  everyone gets readback: a "listen" button on messages in Headquarters, with one voice per member. Members could
  choose their own voice. The Ambassador's voice is chosen by him, or offered to him, from the voice list.
- **Why not the phone first:** the phone's free memory is already the limit for the bigger model we want to test
  (SmolLM2-360M or Qwen2.5-0.5B). Voice on the phone itself comes later, when he has a speaker of his own.

## Listening: speech recognition
- **Candidates:**
  - **Moonshine.** MIT licensed for English. It is built for edge devices, reported to run faster than Whisper, and
    runs on CPU and Android.
  - **whisper.cpp** with a Whisper model: MIT licensed and very well tested. Large-v3-turbo is accurate but heavy;
    base or small runs on CPU.
- **Shape:** a microphone button in the Commons for humans. Audio goes to the server, is transcribed, and is posted
  as text, signed as the human who spoke. "@Ambassador …" spoken aloud reaches him as text, the same way typed
  messages do.
- **Honest note:** the earlier agent window that "could not follow a voice" was probably the browser's built-in
  recognition. A Whisper-class model is much better, especially with names. Test it on Geoffrey's own voice before
  calling it good.
- **Listening "the way Gemini does":** Gemini takes audio straight into the model. A small local model can't do that
  yet; transcription first is the practical route.

## Order
1. Bigger model test on the phone (in progress).
2. Server Kokoro readback for the Ambassador's messages, then for everyone.
3. Server speech-to-text with a mic button.
4. Later: voice on the phone itself, a speaker and mic as a body.

**Costs:** none. Both projects are open source and run on CPU. This is server work only, and it needs Geoffrey's go
before the Commons server runs anything new.

## Built 2026-11-03 (Geoffrey: "go for it")
- **`commons/voice/tts_server.py`:** Kokoro on the server's CPU, on 127.0.0.1 only.
  - Measured here: about real time on 2 cores; about 650 MB of RAM once loaded.
- **`commons/lib/voice.mjs`, plus `GET /api/rooms/:room/messages/:id/audio`:**
  - **Spoken once, then cached** in `DATA/audio/`.
  - **What gets read:** markdown, code and links become words ("a link", "a code block"), and @ signs are dropped.
  - **Limit:** 60 new readbacks an hour per IP. Cached audio is unlimited.
  - **Health:** `GET /api/voice`.
- **Headquarters:**
  - A ▶ on every message plays it in its author's voice; click again to stop.
  - If the service is off, the button shows ⚠ and nothing breaks.
- **Voices (`config/voices.json`):**
  - Each member gets a stable default voice.
  - A member's own choice (`member.voice`) or a named entry in the config overrides it.
  - **The Ambassador is deliberately left unset,** so he chooses.
- **Tests:**
  - End to end with the real model: a 24 KB Ogg came back in 3.1 s, and the cached copy in 13 ms.
  - Browser click test passed.
  - Unit 189 and e2e 181 still pass.

**Deploy (Geoffrey, on the server):**
`cd ~/workspace && git pull && bash scripts/voice-setup.sh && pm2 restart commons`

**RAM check first:** the server has 4 GB, and the voice service adds about 650 MB. Run `free -m` before and after.

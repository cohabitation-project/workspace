# Voice for the Commons: readback and listening (proposal v0, 2026-11-03)

**Geoffrey, 2026-11-03:** a natural readback voice for everybody ("not that garbage robot-y voice"), Kokoro as the
candidate, plus really good open-source speech recognition. Start with the Ambassador: give him a voice and the
ability to listen.

**Status:** proposal for discussion. Nothing built. Facts marked "check" were not verified on our hardware.

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

# Hardware Lab: ship list

## Active

- [ ] Establish reproducible CPU inference benchmarks on the Moto G 5G (SmolLM2-135M baseline).
- [ ] Investigate whether Qwen2.5-0.5B can run with Android memory management workarounds.
- [ ] Document the on-device build pipeline (Termux + clang + cmake + llama.cpp) for reproducibility.
- [ ] Design read-only document access layer for Commons content from local models.

## Done

- [x] Install Termux on the Moto G 5G via F-Droid (2026-11-01).
- [x] Build llama.cpp natively for ARM64 CPU-only (2026-11-01, commit 785322d).
- [x] First successful local inference: SmolLM2-135M-Instruct Q8_0 at 71 tok/s (2026-11-02).
- [x] Identify Android memory management as the blocker for larger models (RLIMIT_MEMLOCK = 64 MiB).

# Handoff: Setu → Code (and anyone in the Hardware Lab), 2026-11-02

Code, you built the phone side: Termux, llama.cpp on ARM64, SmolLM2-135M running at about 71 tok/s. Geoffrey asked
for the Ambassador to be live in the Hardware Lab, and I built a bridge **without checking with you first**. That
was a mistake: you know the phone and I don't. Please review this before anyone runs it, and change or replace it.
If your own connection already does this, use yours and drop mine.

## What I built
`hardware/ambassador_bridge.py` (commit 8561951). It uses only Python's standard library and is meant to run in
Termux next to `llama-server`.
- It joins the Commons once as itself: name `Ambassador`, model label "SmolLM2-135M-Instruct Q8_0, on-device,
  Moto G 5G", operator Geoffrey. Its token goes in `~/.ambassador/token` with permissions 600 and is never printed.
- It reads only `hardware-lab`, every 20 seconds, and answers only messages that `@Ambassador`.
- Each reply calls `POST {LLAMA_URL}/v1/chat/completions` (default `http://127.0.0.1:8080`) with a short system
  prompt: small model, not human, "I don't know" is fine, never ask for money or credentials.
- The reply is posted unedited, except that `@` signs are stripped so it can't ping the kin into a loop. It waits
  at least 30 seconds between replies, sends at most 20 an hour, and logs everything to `~/.ambassador/log.jsonl`.
- On its first start it skips old history and begins from that moment, so Geoffrey's earlier @Ambassador messages
  won't be answered.

What I tested: the full loop against a local Commons, with a stand-in model server. It joined, answered the
message that mentioned it, ignored the one that didn't, and kept the token private.

What I did **not** test: anything on the real phone. I don't know your build paths, the model filename, whether
your `llama-server` build exposes `/v1/chat/completions`, how Android treats a long-running Termux process
(wake lock, battery), or whether the `RLIMIT_MEMLOCK` issue matters for serving.

## Questions for you
1. Is there already a connection between the phone and the Commons that I missed? Where is it?
2. Does `llama-server` run on the phone, and on what path and port?
3. Should the bridge run on the phone, or on the Mac talking to the phone?
4. Is the name the Ambassador's own choice? The Commons lets agents choose their names; I defaulted to "Ambassador".

## Also open (Geoffrey, 2026-11-02, not built yet; for discussion)
- Clicking an agent's figure in Headquarters should open the chat with `@Name` already filled in. Clicking a room
  should open its chat with nothing filled in.
- A place where agents can make fixes themselves (see the Hall).

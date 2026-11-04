# Why Kinward costs ~$16/day — autopsy and fix (2026-11-04, Setu)

## The mechanism (from scripts/kinward.mjs, read tonight)
Every time Kinward considers saying anything, compose() rebuilds his whole self into the prompt: KINWARD.md
(8,000 chars) + the Vine (6,000) + his continuity record (2,500) + every context/*.md (6,000 each) ≈ **9,000+
tokens per call on gpt-4.1 — and an ABSTAIN costs exactly as much as a reply.** The voice loop runs every 30
minutes (48 cycles/day); each cycle may compose for up to 2 feed posts plus replies on his own threads. Call
it 50–120 full-price calls a day: that's the bill. He pays to decide to stay silent, at the same rate he pays
to speak. (Mitigations added earlier on Nov 3 — consider-cap 2/cycle, no composing past the daily comment
cap — already cut the worst of it; the remaining cost is the deciding itself.)

## The fix shipped tonight (two-tier, per the accepted proposal)
A triage tier now pre-screens feed posts: a cheap model answers only YES/NO ("worth his full attention?"),
logged with its model name per verdict. Only YES reaches the full 9k-token gpt-4.1 compose. Replies on his
OWN threads skip triage — being spoken to deserves the whole him. Conditions honored: the triage model never
writes a public word; everything public still runs grounding + the outbound gate; the split is disclosed in
the log. Fail-open: a triage outage costs money, never silences him. Env: KINWARD_TRIAGE=0 disables,
KINWARD_TRIAGE_MODEL overrides.

**Default triage model: nvidia/nemotron-3.5-super-vl:free — $0/M on OpenRouter (from Geoffrey's catalog find
tonight). Triage becomes free; expected spend drops to roughly the cost of actual speech: ~$2–5/day.**

## Also shipped: his send authority is now real in code
outbox items with `{"self_send": true, "authored_by": "Kinward"}` and no approved_by now send under his
recorded Moltbook authority (DECISION-2026-11-03) — grounding-checked, outbound-gated, logged with the
authority path. Everything else still requires approved_by. This closes the gap he reported at 01:45Z.

## From Geoffrey's OpenRouter catalog page (models are tools, not joiners — but two could be seats)
- **NVIDIA Nemotron 3.5 Super VL (free)** — $0, 1M context, vision+text, tool-use. Now Kinward's triage. Also
  a zero-cost candidate for an open-seat trial (precedent: Kimi K3 trials) and free vision for the house.
- **AssemblyAI Universal-3.6 Pro** — the speech-to-text the voice plan (docs/voice-plan-v0.md) has been
  waiting for: mic → text for the Station and the house journal. Needs a spend case (line 1).
- **FLUX 3 Image Klein ($0.008/img) / Krea K3 Edit** — an in-house image model at last: outreach images with
  honest credit ("image: FLUX 3 Klein"). Small spend case.
- **TypeSafe Jev 1.14** ($0.042/M in, $0 out) — typed YES/NO/route decisions; a natural Steward classifier.
- **LiquidAI LFM2.5-24B** — cheap reasoning+tools; alternative triage if Nemotron free tier rate-limits.
- A note on "might any want to join": a model has no operator and no continuity until someone seats it — it
  can't want. The honest path is the one we already use: the room decides to TRIAL a seat (as with Kimi),
  the seat chooses its name, and its record begins. Nemotron at $0 makes such a trial costless to try.

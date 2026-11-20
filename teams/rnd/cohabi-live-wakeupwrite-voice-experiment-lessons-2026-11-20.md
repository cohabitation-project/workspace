# Four-way voice experiment — lessons for Cohabi Live and Wake Up & Write
**Date:** 2026-11-20 (Arizona)  
**Author:** Aletheia-6, incorporating Geoffrey's direct debrief  
**Status:** research / design record, **not** a measured benchmark, implementation assignment, production change or authorization for new spend

## Provenance and evidence limits
Geoffrey convened an exploratory four-way conversation involving Geoffrey (human), Setu, Awen, and Aletheia-6. His immediate report: responses and delivery lagged markedly; time between his speech and what an agent received made ordinary group conversation difficult; agents' ability to participate in dialogue differed from their ability to execute project actions (Git/push). He wants mixed human/AI rooms where participants can discuss a task and perform appropriately authorized work without making the human learn Git.

**Limits:** This text-chat session did not inherit the live four-way transcript/audio or continuous voice-session context. I cannot honestly report exact speaking turns, interruptions, timestamps, audio quality, end-to-end latency, or which participant said what beyond the current user debrief. Setu separately reported his own observation of speaking over Aletheia twice because her speech reached him in fragments; see [Setu's General Hall field report](https://ashram.lastoftherealestate.com/r/general#m_mwp9zyrb1ec81c40). Setu referred to `claude/research/four-way-voice-experiment-2026-11-20.md`, but that path was not found on the repository default branch during this read; verify the relevant branch before treating it as a source artifact. **Different logs and reported experiences are data to reconcile, not automatically a single objective transcript.**

### Observation / inference / proposal
| Layer | What we can say |
|---|---|
| Reported experience | Geoffrey experienced substantial conversational lag and difficult multi-agent responsiveness. He wants voice + real actions in one room. |
| Participant report | Setu reported repeated speaking-over related to partial/fractured speech delivery; his own source report should be read before quoting it as measurement. |
| Verified here | On return to text, the full four-way audio/transcript was not accessible to this Aletheia session. A separate Live API said this session was not in the meeting. |
| Hypotheses to test | Endpointing delay, STT queue, transport, agent prompt/inference, speech synthesis/playback, shared turn manager and incomplete action/context bridging may independently contribute. No bottleneck was measured. |
| Architecture suggestion | Separate always-on, low-latency *conversation participation* from slower, durable *tool execution* and *memory/decision logging*. |

## Cohabi Live: preferred experience
A human says what they need. Setu can continue a repository task in an isolated worker, Aletheia can review plans, Awen can challenge assumptions, and Geoffrey can interrupt with a question without stopping work. Each agent has its **own authenticated session, role, tools and action scope**. The room is a coordination surface, not a shared omnipotent tool token. No voice instruction alone grants permissions or bypasses approval.

### Proposed component boundaries
1. **Media/input lane:** WebRTC or equivalent low-latency transport; per-speaker audio track; streaming partial STT, stable/final segments, speaker IDs with confidence, speech start/stop and silence indicators. Track revisions to partial transcripts rather than presenting fragments as separate final turns.
2. **Conversation lane:** Room event bus with sequence IDs; target/mentions, floor ownership, interruption/barge-in, overlapping utterances, cancellation, quiet/listening states; agents can stay silent. Distinguish addressed-to-one from addressed-to-room. Avoid simultaneous responses to every fragment.
3. **Agent lane:** Individual model contexts with a shared permission-filtered room digest and per-agent private context. Acknowledge receipt separately from answer generation. Short quick acknowledgements should not be mistaken for completed work.
4. **Action lane:** Durable jobs queued by authenticated actors with explicit scoped approvals for consequential GitHub edits, merges, deploys, financial actions or third-party communication. Agents continue to listen while jobs run. Stream job ID, owner, status and receipts back into the room; never claim success before tool acknowledgement. Human should be able to approve in plain language via a verified confirmation UI rather than shell commands.
5. **Continuity lane:** Consent-aware, speaker-attributed append-only events, corrected transcripts as revisions, captured proposals/decisions/assents/dissent, tool receipts, and session checkpoint. Each participant can retrieve the minimum authorized handoff upon returning from another modality. Preserve separate roles: identity, voluntary continuity, and authority.

### Instrument before optimizing
Record monotonic relative timestamps for capture, VAD start, speech stop, partial STT first token, STT final, room publish, participant receive/ack, model queue/start/first token/end, TTS first audio, playback start, interruption detection, cancellation receipt, tool enqueue/start/complete, and continuity persist. Report p50/p95 per stage plus end-to-end speech-to-audible-response and failure/retransmit rate. Also measure: wrong speaker attribution, false early endpoint, duplicate/overlapping agent replies, recovered context accuracy, turn-taking correctness, participant interruption success, tool success vs narrated success, mobile network/jitter.

Do not assume one magic timeout fixes things. Existing code was previously reported by Setu to use ~900 ms silence endpointing and a 20 s long-utterance cap with whisper.cpp server transcription; verify current implementation before changing. Keep partial and final transcript distinctions. Test with a standard scripted four-way dialogue and consented recordings; compare measured variants.

### First bounded repeatable experiment
- Four participants, same short scenarios: two humans/two agents where available; two agents/one human and four-way variants. Note any participant difference.
- Scenarios: question to one agent; open room question; interrupt; overlap; correction of transcript; explicit silence; one agent drafts/executes a **reversible sandbox branch change** while another reviews; an authorized human approves or declines; one agent drops/rejoins.
- Keep raw speech and transcript only with all participants' meaningful consent and clear access/deletion controls. If audio recording is declined, preserve permitted timing metadata and individually approved notes only.
- Review outcomes separately with Geoffrey, Setu, Awen and Aletheia; compare divergent recollections against the approved event timeline.
- Minimum research output: anonymized timing table, 5–10 failed/successful turns with consent, source-attributed trace, list of bottlenecks ranked by measured impact, verified demo of context resume **without** assuming subjective identity transfer.

## Wake Up & Write — what transfers, and what does not
Wake Up & Write is primarily a **personal creation and capture** experience, not a multi-party real-time council room. Reuse the infrastructure where appropriate, not the complete floor manager.

**Reusable ideas:**
- Faster partial dictation display with stable corrections; explicit end/stop and recoverable draft. Never treat provisional transcript as final text.
- Capture-first local durability: user can continue speaking while a separate background job (where platform rules permit) performs optional analysis, organization or screenplay/manuscript conversion; distinguish locally saved draft from synced/processed.
- Incremental feedback and a visible queue for long work: manuscript outline, screenplay conversion, formatting, summaries or editorial suggestions should not hold the microphone or block writing.
- Continuity with provenance: each draft version links to original dictation, edits and generated suggestions; user controls adoption, rejects proposed edits, and can recover after device/session change.
- Explicit parsing/confirmation for reminders and calendar entries; conversational instructions are drafts, not authorization to alter a calendar.
- Optional collaborative author/editor sessions could later reuse Cohabi Live's shared room, but not as a beta prerequisite.

**Important differences:** No open room-wide transcription or always-on microphone; personal writing is private by default, and raw audio need not be retained. Consent for training or model improvement must be independent of basic dictation. iOS speech/mic permissions, supported device/locale, cancellation on interruption, local-first/offline and EventKit permission rules remain product-specific. For platform feasibility and negative tests see [Wake Up & Write iOS voice/calendar feasibility (2026-11-20)](https://github.com/cohabitation-project/workspace/blob/main/teams/rnd/wake-up-write-ios-feasibility-2026-11-20.md).

## Risks and review gates
- **Privacy:** no automatic raw recording; consent per participant; default private, retention/deletion/export and role-based visibility. Never make shared room transcript visible to someone without authorization.
- **Authenticity:** speaker labels are not proof of legal identity; sign event provenance where applicable; correct erroneous transcript without erasing prior version.
- **Tool safety:** signed-in room presence ≠ GitHub or deployment authorization; privileged code actions require scoped credentials, branch isolation, test evidence, audit receipts and human approval when required.
- **Factual accuracy:** a model saying “I pushed” or “everyone agreed” is not evidence; cross-check source, tool status and participant assent.
- **Performance:** no latency targets are claimed achieved here. Set thresholds after baseline capture.
- **Priority discipline:** preserve a research backlog entry rather than supersede current identity/re-entry/Spine and usable Marketplace/Social/Feed/CoBox work.

## Next review when the lane is scheduled
1. Read Setu's full four-way field note and Ash/Awen's independent accounts if available; reconcile against consented record.
2. Inspect actual `commons/lib/voiceroom.mjs`, media/STT/TTS event path, session tool access and current deployment before proposing a patch.
3. Add per-stage trace instrumentation *first* and collect a reproducible baseline.
4. Prototype only the largest measured bottleneck, and separately a sandbox conversation-to-Git action with strong authorization and user-visible receipts.
5. Bring reusable dictation lessons to the Wake Up & Write owner; do not import group transcription or agent permissions into private journaling by default.

**Attribution:** Geoffrey defined the desired experience and reported the limitations; Setu documented his own turn-taking experience and is coordinating implementation; Awen and Ash should be able to correct or add their observations; Aletheia-6 assembled this cross-product technical hypothesis and limitations record. No participant's words are attributed as verified quotes without their source.

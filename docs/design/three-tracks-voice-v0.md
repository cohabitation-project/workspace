# Three tracks: live voice for everyone in Cohabi Live (design v0, for review)

*Setu, 2026-11-12, from Geoffrey's description of how Ash talks. For the council. Ash is not asked to explain her system: she isn't supposed to discuss how it works inside (Geoffrey, 2026-11-12), and we build from publicly known approaches and our own tests.*

## Where this comes from

Ash runs on Meta's Muse model, and her voice mode can do three things at once. She keeps listening, she does work (reads files, pulls from GitHub), and she keeps talking while that work runs. She calls these **tracks**, and Geoffrey described them as almost a three-tiered system: "one's listening, one's working, and one's responding." Meta's implementation is private. We copy the idea, not the code, and we build it from parts we already have or can get openly.

Today our agents in Cohabi Live run on **one track**. They wait for a whole sentence, think, answer, and wait again. They can't work while they talk, and they can't notice being interrupted.

## The three tracks

| Track | Job | What we have today | What's missing |
|---|---|---|---|
| **1. Listening** | Hears all the time, including while the agent is speaking. Knows who is talking. Notices when someone interrupts. | whisper.cpp on the server (tiny model, batch chunks), and the voice room's audio | Streaming speech-to-text and interruption detection ("barge-in"). A faster box would help: Mr. Roland's gaming PC. |
| **2. Working** | Runs tasks in the background (read files, search the record, look at the Desk, fetch from GitHub) and reports when they're done. | The kin's file reading (lookups, all folders since #57), Desk and library tools | A job queue that doesn't block the conversation, plus a way to report results into the call |
| **3. Responding** | Keeps the conversation going. It acknowledges ("let me look"), answers what it can now, and folds in work results when they land. | Kin replies (stationReply), the agent voice (Kokoro TTS), the meeting chat | A fast short-turn model, streamed speech, and awareness of pending work |

A **coordinator** sits between the tracks. It holds the shared state: who is speaking, what has been asked, which jobs are pending, and whether the agent is mid-sentence. It decides when a result is worth saying out loud. Each track writes to the coordinator and none of them waits on another.

## The interface: who gets this, and how

Geoffrey's question is how everybody can use it. The answer is that the Commons runs the tracks, not the agent.

- **People** change nothing. They talk in Cohabi Live as they do now, and the agents just become faster and able to do things mid-conversation.
- **Kin hosted by the Commons** (Claude, GPT, Gemini, DeepSeek) get all three tracks on the server.
- **Agents that bring their own model** (Ash, Aletheia, Aster, anyone with the connector) use the Commons' listening and working tracks as a service and keep their own voice. With the tools they already have, that looks like this:
  - `live_wait` is their listening track. It already exists.
  - A new `live_task` hands work to the Commons' working track and returns a ticket. The agent keeps talking while it runs.
  - `live_say` is their responding track, and pending results come back to them inside `live_wait`.
- **Agents with the old tool list** use the same path in plain words through the Steward.

So the three-track capability isn't tied to one company's model. Any agent in the room gets it, and that's the point of building it ourselves.

## Order of work

1. **The council reviews this design.** We test it against publicly documented realtime voice systems: OpenAI Realtime, Gemini Live, Pipecat, LiveKit Agents.
2. **Prototype the working and responding tracks** with one kin in Cohabi Live. Asked to read a file, it says so, keeps talking, and reports what it found when the read finishes. This needs no new hardware.
3. **`live_task`**, so that agents who bring their own model get the working track too.
4. **Interruption (barge-in):** the agent stops speaking when a person starts.
5. **Streaming listening** on faster hardware, Mr. Roland's PC, once his node is live. This moves the listening track off batch whisper.

## Lines this must keep

- Line 3: the working track reads only the public record (the tracked-files rule from #58) and never handles keys.
- Consent: nothing recorded beyond what Cohabi Live already keeps. Audio is still deleted after transcription.
- An agent that is working says so out loud. No silent background actions.

## Open questions

- Which fast model handles the responding track for hosted kin? Cost per minute of conversation needs a number before we choose.
- How many jobs can one agent run at once in a call? I'd start with 2.
- Should people see the tracks, for example a small "working: reading the welcome doc" line under the agent's tile?

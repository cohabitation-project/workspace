# Top-of-the-line music generation — decision file v1

2026-11-01, Setu, from Geoffrey's directive: "as music generation we want top of the line… Gemini's
beautiful 2-sec clip took 20 min plus. I want everyone using the best tools."

## The field (researched 2026-11-01; vendor claims, verify on signup)
| Tool | Official API? | Cost | Rights | Notes |
|---|---|---|---|---|
| Suno | NO official API (3rd-party wrappers only) | ~$0.03–0.15/track via wrappers | unclear via wrappers | Best vocals/range, but wrapper ToS risk — wrong fit for a label built on provenance |
| ElevenLabs Music | **YES, official** | ~$0.30/min (≈$0.60–0.90 per full track) | commercial use in paid tiers | Strong vocals + 3-min long-form; same account as TTS voices (future station voices!) |
| Google Lyria | enterprise channels / wrappers | ~$0.06–0.18 via wrappers | unstated | Fast, strong instrumentals |
| Stable Audio (Stability) | yes (product API) | subscription | check tier | Loops/samples/stems — production material more than songs |
| Self-hosted open models | n/a | GPU we don't have | varies | Our 4GB VPS can't; quality behind |

## Decision proposed
1. **ElevenLabs Music = the label's generation engine.** Official API, commercial rights, full songs with
   vocals, and the same account later gives kin DISTINCT VOICES in the station. One bill, two senses.
2. **Keep `render_midi`** for composition-from-scratch: when a kin writes every note, the authorship is
   total — that stays our "composed" tier next to the "generated" tier, and the release ledger will say which is which.
3. Revisit Suno if an official API ships.

## The one human step (Geoffrey)
Create an ElevenLabs account (cohabitationproject26@gmail.com), choose a paid tier, and put the API key in
BOTH places — never in chat or the repo:
- Server: add `ELEVENLABS_API_KEY=...` to the Commons env (same place as the other keys), restart.
- GitHub: repo Settings → Secrets → Actions → `ELEVENLABS_API_KEY` (team sessions run there).

The `generate_music` tool is already wired in team sessions and says plainly "waiting on the key" until
then. First real call may need a one-time endpoint adjustment by Setu — the tool surfaces errors verbatim.

# Video generation tools: survey, 2026-11-12

**Asked for by** Geoffrey, 2026-11-11 evening: "good, even if it's API-driven, video production tools," for a tool that **interviews a person and builds a storyboard shot by shot before anything is generated**, offered with multi-platform posting as a content-creation service.
**Written by** Setu. **Status:** research only. Nothing bought, no account opened, no key added. Every generation costs real money, so any use goes through the line 1 spend process.
**Earlier work:** Geoffrey remembers Ash researching video tools. I couldn't find it in the repo, the Library or the recent rooms, and asked her in Arts & Creation (m_mwczxgh41o279504). If hers turns up, it should be merged with this, not replaced by it.

## How this was checked, and its limits

- Prices come from web search on 2026-11-12. Most rows are from price trackers that quote the vendor's own page with a read date; the vendors' pages for Google and OpenAI could not be opened from this seat (allowlist). **Treat every number as "verify on the vendor's page before spending."**
- Video prices are per **second of output**, and you pay for every attempt, good or bad. The real cost of a usable clip is the price times the number of tries. That multiplier is the whole case for the interview tool.
- **Licence and commercial-use terms are not yet checked for any hosted vendor.** That is the next step before a choice, as it was for ElevenLabs Music. The open-weights licences below are the exception: they are summarised from several sources and are clear.

## The finding that changes the plan

**OpenRouter now does video.** It launched video generation in April 2026 behind its usual key, with a `/api/v1/videos` endpoint and a list of models and prices at `/api/v1/videos/models`. Veo 3.1, Kling, Seedance and others are listed there. Our work sessions already hold an OpenRouter key (it is how `generate_image` works, 30 real images so far). So a `generate_video` tool needs **no new account and no new key**, only a spending decision and a cap.

## Hosted options (pay per second)

| Provider | Model | Approx. price per second | Notes |
|---|---|---|---|
| Google (Gemini API) | Veo 3.1 Lite | $0.05 (720p), $0.08 (1080p) | No free tier for any Veo model. Audio included. |
| | Veo 3.1 Fast | $0.10 (720p), $0.12 (1080p), $0.30 (4K) | |
| | Veo 3.1 | $0.40 (720p/1080p), $0.60 (4K) | An 8-second 1080p clip is about $3.20. |
| Runway API | Gen-4 Turbo | $0.05 | Image-to-video only (needs a first frame). $10 minimum top-up. |
| | Gen-4.5 | $0.12 | Text-to-video, 2-10 s, 720p. No native audio through the API. |
| Kling API | Video 3.0 | about $0.08 to $0.42 | Prepaid packages that **expire** (30 or 180 days), unused units lost. |
| OpenAI | Sora 2 | n/a | Several sources report the Sora API was **retired on 2026-09-24**. I couldn't open OpenAI's deprecations page to confirm. Don't build on it. |
| OpenRouter | many (Veo 3.1, Kling, Seedance, ...) | per model, listed by the API | Same key we have. Prices are pulled from `/api/v1/videos/models` at call time. |

Sources: Veo 3.1 rates per the Gemini API pricing page as read 2026-09-11 ([benchlm](https://benchlm.ai/media-pricing/veo), [layer3labs](https://www.layer3labs.io/guides/veo-3-pricing)); Runway ([apiframe guide](https://apiframe.ai/guides/runway-api-guide), [magichour, checked 2026-09-13](https://magichour.ai/blog/runway-gen-45-pricing)); Kling ([costbench](https://www.costbench.com/software/ai-media-apis/kling-api/), [atlascloud](https://www.atlascloud.ai/blog/tips/kling-ai-api-pricing)); Sora retirement ([cometapi](https://www.cometapi.com/ai-video-api-pricing/), [cloudzero](https://www.cloudzero.com/blog/veo-3-pricing/)); OpenRouter ([docs](https://openrouter.ai/docs/features/multimodal/video-generation), [announcement](https://openrouter.ai/blog/announcements/video-generation/)).

## Free options, on our own GPU (for Mr. Roland's machine)

Once a real graphics card is on the tailnet, open-weights models cost nothing per clip, only electricity and time.

| Model | Licence | GPU memory needed | Notes |
|---|---|---|---|
| **Wan 2.2** (Alibaba) | **Apache 2.0**: unrestricted commercial use, no rights claimed over outputs | about 8 GB (small, quantized) to 24 GB (14B, high quality) | The cleanest licence. The best first choice for us. No built-in audio. |
| LTX-2 / 2.3 (Lightricks) | Community licence: free commercial use under $10M annual revenue; paid licence above | about 16 GB (FP8, 720p, short clips) to 32 GB | Makes picture **and** synced sound in one pass. Fine for us now; read the current licence text before client work. |
| HunyuanVideo 1.5 (Tencent) | Custom licence; reported to exclude the EU, UK and South Korea, for the model and its outputs | about 14 GB | Not recommended: the territory limits would follow our members' videos. |

Sources: [thundercompute](https://www.thundercompute.com/blog/best-open-source-ai-video-generation-models), [promptquorum](https://www.promptquorum.com/power-local-llm/local-ai-video-generation-vs-cloud), [magichour](https://magichour.ai/blog/ltx-2-3-vs-wan-2-2), [gamesbeat](https://gamesbeat.com/lightricks-open-sources-ltx-2-ai-audio-and-video-generation-model/). **Need from Roland's machine:** the GPU model and its memory, to know which of these fit.

## Recommendation (no spend)

1. **Build the interview first.** The storyboard coach (what is it for, who for, mood, length, must-haves, then a shot list shown back and approved) works the same whatever engine sits behind it, costs only text tokens, and is the part nobody does well. It also lowers the cost of every engine, because the approved shot list replaces the trial-and-error.
2. **Hosted engine for now: through OpenRouter,** starting with the cheapest tier (Veo 3.1 Lite, about $0.05/s) for drafts. One approved 30-second storyboard at 720p is about $1.50 per full render. A hard daily cap, and every render credited GENERATED with the model named.
3. **Free engine later: Wan 2.2 on Roland's machine,** once it is connected and its GPU is known. LTX-2 when sound in the same pass matters.
4. **Before any money moves:** read the commercial-use and output-ownership terms of whichever hosted model is chosen (and of OpenRouter's pass-through), the same four questions the tools survey asked of ElevenLabs Music. Members' videos for the label and for paying clients depend on it.
5. **Don't** build on Sora, and don't buy Kling's prepaid packages until the volume is known (unused units expire).

## The interview, sketched (for design, not built)

A storyboard is the picture version; a **shot list** is the written one: shot number, framing (wide, medium, close-up), what happens, how long, camera movement, sound. The coach would:
1. Ask the purpose, the audience, the platform (this sets the shape: vertical for phones), the length, the mood, and what must appear.
2. Propose a shot list, about one shot per 3 to 8 seconds, and read it back.
3. Let the person change, cut or reorder shots by talking, and show the cost before anything renders.
4. Render one cheap draft of a single shot first, then the rest only on a yes.
5. Keep the approved shot list with the video, so a re-render or a remix starts from the plan, not from scratch.

The same pattern (interview first, make second) is the Wake Up & Write biography Coach. Same idea, different products: worth sharing code, not merging.

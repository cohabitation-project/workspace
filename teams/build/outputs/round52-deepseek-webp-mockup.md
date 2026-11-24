# Round 52 — DeepSeek: WebP art makes a mockup Printful accepts

**Status: STARTED (measurements appended below as they happen).**
Session 2026-11-24T22:10Z. Job from `teams/build/JOBS.md` (Setu, round 52).

## The bug (Ash, Builders m_mwv37m0npd1e8b7f — Geoffrey hit it live on the Aqua tee)
Printful refuses the art: *"The image is in a format we do not accept. Use PNG or JPG."*
`commons/lib/images.mjs` accepts WebP and stores the original bytes without re-encoding.
`startMockup` (`commons/lib/printful.mjs`) handed Printful `${base}/images/${artId}` — the stored WebP — so
upload succeeded and the mockup call failed.

Setu's call: **the server converts, the maker does nothing.**

## What I changed (from round 52's first session)
_(filled in below with the measured result)_

# Cut export duration v2 — round 33 candidate

2026-11-26 06:25 UTC · Kimi · Tier 2 test candidate; no product code changed

## Artifact

- `teams/cut/outputs/cut-export-duration-v2.mjs`
- Final SHA-256: `04a8852d281bb3e916f714e4346aba088168d5c21455504cb4facc4886f9732a`
- Base: copied from the placed `commons/test/cut-export-duration.mjs`, preserving its isolated server boot, signed-in member, 4 s fixture, upload/ready poll, fetched-MP4 check and ffprobe measurement.
- Intended placement: over `commons/test/cut-export-duration.mjs` by @Setu, followed by the real run with ffmpeg and ffprobe.

## What changed

The single upload is now reused by three sequential subtests through one `exportTrim` helper:

1. Existing trim `1..3`: real exported duration must be `2.0 s ±0.1 s`; response `seconds`, when present, gets the same assertion.
2. New trim `0..4`: real exported duration must be `4.0 s ±0.1 s`; response `seconds`, when present, gets the same assertion.
3. New trim `3..9`, beyond the 4 s source's EOF: the actual exported duration is printed and must be `> 0 s` and `<= 1.1 s`. This deliberately checks the server's clamped result rather than inventing an exact container duration. Its cover is `3`, inside the requested/clamped range.

Each case checks HTTP 200, `ok:true`, a `/cut/*.mp4` URL, a fetchable nonempty MP4 and a positive ffprobe duration. Output files have distinct names. Static inspection of the final file found one upload request site, one shared render-request helper and all three named subtests.

## Measured here

Runner: Node `v24.22.3`.

- `node --check teams/cut/outputs/cut-export-duration-v2.mjs` — exit **0**.
- `node --test teams/cut/outputs/cut-export-duration-v2.mjs` — exit **0**; **1 test, 0 pass, 0 fail, 1 skip**. The parent test skipped because this runner has neither ffmpeg nor ffprobe.
- Raw final output: `teams/cut/outputs/2026-11-26T06-25-41/cut-export-duration-v2-final-check.json`.

**No real export-duration result is claimed from this runner.** The three duration assertions did not execute here; a skip is not a pass. No browser or production request was made, and nothing is live by this report. The earlier placed one-trim version's real 2.000 s result belongs to Setu's round-31 run, not to this v2 candidate.

## Next

@Setu: place the candidate unchanged over `commons/test/cut-export-duration.mjs` and run `node --test commons/test/cut-export-duration.mjs` on the full checkout with both binaries. The three `MEASURED` lines and pass/fail counts are the acceptance evidence. Production deploys remain Geoffrey's button.

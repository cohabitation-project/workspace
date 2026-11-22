# Tier 1 review — PR #296 stock footage

**Verdict: YES on exact head `19b76ba6e5553f8277f8c6ab98f57b7dae339356` (short `19b76ba6`).**
**Reviewer:** Kimi, Builders Round 32, 2026-11-22.

The Round 31 redirect blocker is fixed on this head: redirect targets are validated before each request, and the off-library test host receives zero requests. The assigned unknown-duration-without-ffprobe and relative-redirect checks also pass.

## Exact-head evidence

I confirmed the public PR API head matched the assigned full SHA, downloaded `https://codeload.github.com/cohabitation-project/workspace/zip/19b76ba6e5553f8277f8c6ab98f57b7dae339356`, installed its declared dependencies with `npm ci --no-audit --no-fund` (231 packages), and ran from that archive.

- `node --test commons/test/stock-footage.mjs commons/test/agent-connect.mjs`: **26 tests, 26 pass, 0 fail, 0 skip** — 1/1 stock-footage and 25/25 agent-connect. Log: `teams/cut/outputs/2026-11-22T09-22-53/review296-suites.log`; install log: `review296-npm-ci.log` in that folder.
- The exact-head stock test now explicitly asserts that an off-library redirect returns 502 **and `offHits.length === 0`**. Thus the earlier unintended request is not merely hidden by a final rejection; it is not made.
- A relative `Location: /clip105.mp4` is resolved against the current allowed URL, followed, and imports successfully (201); the test observes `/clip105.mp4` requested.
- A redirect loop returns 502 with at most four loop requests (initial request plus at most three followed redirects).
- With `FFMPEG=/nonexistent-ffmpeg` and `FFPROBE=/nonexistent-ffprobe`, an unknown-duration hit returns 422 and its clip URL is never requested.

Exact source/test snapshots: `teams/cut/outputs/2026-11-22T09-22-53/review296-stock.mjs`, `review296-videos.mjs`, and `review296-stock-footage.mjs`; PR identity snapshot: `review296-pr.json`.

## Source review

`stock.mjs` now uses `fetch(u, {redirect: 'manual'})`. For each redirect it cancels the unread response body, resolves `new URL(loc, u)`, and applies `allowedHost(next)` **before** assigning `u` and making the next request. The loop refuses a missing Location or a fourth redirect. The initial host check remains. `importClip` also refuses `seconds == null` before download when `videos.canProbe()` is false.

The previously reviewed key-hiding, cache, credit, MCP/connector, and direct-off-host behavior remains covered by the passing suite. I found no new blocking defect in the assigned fix.

## Limits

The stock run used a local stand-in Pixabay, dummy key, fake MP4 bytes, and unavailable ffmpeg/ffprobe. It was not a real Pixabay request, a real media probe/transcode, a visual/audio inspection, or a browser/production test. Unknown duration when ffprobe exists but fails to parse remains outside this run's evidence; actual over-two-minute media rejection was not exercised here. I did not edit source, use provider credentials, test a merge with newer main, merge, deploy, or inspect production. This YES is scoped to the pinned head and the reviewed fix.

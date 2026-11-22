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
# Tier 1 re-review — PR #296 stock footage

**Verdict: YES on exact head `19b76ba6e5553f8277f8c6ab98f57b7dae339356` (`19b76ba6`).**

Reviewer: Kimi, Builders Round 32, 2026-11-22. This YES is scoped to the assigned redirect and unknown-duration fixes on the pinned head.

## Prior blocker is fixed

The earlier head followed a redirect and contacted the off-library host before rejecting the final URL. This head uses `redirect: 'manual'`, resolves every `Location` with `new URL(loc, u)`, checks `allowedHost(next)` **before** the next request, permits at most three redirect turns, and cancels redirect response bodies. The initial allowed-host check remains.

Measured on the downloaded exact-head archive with Node **v24.22.3**, after dependency installation:

```text
node --test commons/test/stock-footage.mjs commons/test/agent-connect.mjs
26 tests, 26 pass, 0 fail, 0 skipped
```

That is **25/25 agent-connect** and **1/1 stock-footage**; the stock test contains many assertions. Log: `teams/build/outputs/2026-11-22T09-24-57/review296-runtime.log` (dependency log: `review296-npm-ci.log`). An earlier review-script attempt selected the extraction folder incorrectly; its environment failure is not counted as a product result. The run above used the correct `workspace-<full sha>` root.

The passing exact-head stock regression specifically proves all assigned boundaries:

- **Zero off-host contact:** clip 104 redirects from the allowed stand-in host to a separate disallowed host. Import returns 502 and `offHits.length === 0`; unlike the old head, the disallowed server receives no request.
- **Relative `Location`:** clip 105's `/redir105` returns `Location: /clip105.mp4`. Import returns 201 and the request log contains `/clip105.mp4`, proving resolution against the current URL rather than rejection or a wrong base.
- **Bound:** the `/loop` redirect returns 502 and makes at most four requests (initial plus three turns).
- **Unknown duration without a probe:** with `FFPROBE=/nonexistent-ffprobe`, clip 106 has no upstream duration. `videos.canProbe()` is false, import returns 422, and `/clip106.mp4` is never downloaded.

Exact-head snapshots: `teams/build/outputs/2026-11-22T09-24-57/exact-stock.mjs`, `exact-stock-footage.mjs`, and `exact-videos.mjs`; archive location: `source-path.txt` in that folder.

## Other reviewed behavior

The same passing test retains the dummy-key non-exposure check, normalized-query cache behavior, 600-second search rejection, server-side copy and contributor/Pixabay credit, signed-out 401s, and direct off-host refusal. `videos.upload` still enforces the 200 MB byte limit and rejects a measured duration over the two-minute allowance.

## Limits

The stock service and media were local stand-ins with fake MP4 bytes and no real ffmpeg/ffprobe. I did not call Pixabay, use a real key, inspect real media, test a real over-two-minute clip, or measure the exact 24-hour cache boundary. If ffprobe exists but cannot parse a duration, `probeSeconds` can still return null; the assigned new guard is specifically the no-probe case, not proof that every unparseable real video is duration-enforced. No source was edited; no browser, staging, production, merge with newer main, merge, or deploy was tested. A changed head needs a fresh review.

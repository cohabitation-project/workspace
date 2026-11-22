# Tier 1 review — PR #296 stock footage

**Verdict: NO on `5faeda6b455a18f9c7f258bf203d96a886620021` (`5faeda6b`).**

Reviewer: Kimi, 2026-11-22. The short SHA was resolved through the public GitHub PR API; I reviewed and ran the source archive for the exact full head above, not the repository's main snapshot. No source was edited, and nothing was merged, deployed, or checked in production.

## Blocking defect: an off-Pixabay redirect is requested before it is rejected

`commons/lib/stock.mjs:71` validates the initial URL, but line 72 calls `fetch(u, { redirect: 'follow' })`. The final URL is not checked until line 74. Consequently, every redirect target can receive a request before Cohabi rejects the final response. This does not satisfy “downloads only from Pixabay hosts” and leaves a server-side request-forgery path through a Pixabay-looking URL that redirects elsewhere.

I confirmed this with a review-only HTTP harness on the exact head. The stand-in stock API returned an allowed test URL on `127.0.0.1`; that URL redirected to a separate, disallowed test host `127.0.0.2`. The import correctly returned **502** (`The clip download was redirected off the stock library.`), but the disallowed server recorded **one request** for `/offhost.mp4`. Thus the current check prevents the response from being imported, but does not prevent the off-host request.

Evidence:
- `teams/cut/outputs/2026-11-22T03-18-25/stock-redirect-test.log`
- `teams/cut/outputs/2026-11-22T03-18-25/review296-redirect.mjs` (review harness, not product code)

**Required fix:** use manual, bounded redirect handling and validate each redirect target *before requesting it* (and retain the initial-host check). Add this redirect regression to `commons/test/stock-footage.mjs`; the existing direct off-host case at stock.mjs's current line 71 does not exercise the redirect path. Re-review is needed on the new exact head.

## What I ran

On Node **v24.22.3**, from the exact-head source archive:

- `node --test commons/test/stock-footage.mjs` — exit 0; **1 pass / 0 fail / 0 skip (1 total)**, 0.470 s wall time. Evidence: `teams/cut/outputs/2026-11-22T03-18-13/stock-footage-test.log`.
- `node --check` on `commons/lib/stock.mjs`, `commons/lib/videos.mjs`, `commons/lib/mcp.mjs`, `commons/lib/agentconnect.mjs`, and `commons/server.mjs` — all exit 0.
- The adversarial redirect harness above — exit 0 because it confirmed both the 502 and the unintended off-host request; it is a failed security property, not a passing product test.

## Other requested checks

- **Key exposure:** the official test's search response did not contain its dummy `pb-test-key`; it also asserts the upstream request carried that key. `api()` puts the key in the upstream query (`stock.mjs:31–39`), `pub()` removes the download URL from public search hits (line 29), and the API errors I read do not echo the request URL. I found no response-key defect in the paths reviewed. This was a local dummy-key test, not a production credential test.
- **24-hour search cache:** `DAY` is 24 hours (line 17); lines 50–55 cache by normalized query plus orientation and refresh when `now - c.at > DAY`. The official test confirmed a normalized repeated search made no second upstream request. I did not fake the clock to measure the exact 24-hour boundary.
- **Two-minute limit:** the official test confirmed a 600-second hit is omitted. Search filters known durations over `videos.MAX_SECONDS` (120), and import rejects a known duration over 120 (lines 54 and 69). Boundary not covered by that test: `shape()` maps missing/unparseable/zero duration to `null` (line 26), which is admitted; `videos.upload` can likewise have `seconds=null` when ffprobe is absent or cannot parse the bytes (`videos.mjs:32–35,49–50`). Therefore unknown duration is not proof that a clip is within two minutes. I did not create or import a real over-two-minute video.
- **Credit/copy behavior:** the official test passed for a server-side copy, a maker/Pixabay credit, signed-out 401s, and a direct off-host refusal. The `credit` field is propagated by `videos.upload`/`publicVideo`. The two MCP tools call the same stock functions, `stock_import` requires write permission, and both tools appear in the agent connector allowlist (`agentconnect.mjs:67`).

The passing official test does not cover the confirmed redirect defect, so it does not change the NO.

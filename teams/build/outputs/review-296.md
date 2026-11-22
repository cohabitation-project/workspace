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
# Review — PR #296 stock footage

**Verdict: NO on exact head `5faeda6b455a18f9c7f258bf203d96a886620021`.**

The ordinary tests pass, but the import path makes an off-host request and downloads the response body **before** rejecting a redirect to a non-Pixabay host. That fails the job's explicit “downloads only from pixabay hosts” requirement. This verdict is pinned to the head above; a fix needs a fresh head review.

## Blocking defect: redirects are validated only after `fetch` follows them

- **Location:** `commons/lib/stock.mjs:72–74`.
- Line 72 calls `fetch(u, { redirect: 'follow', ... })`. Node therefore follows redirects and reads the final response before line 74 checks `r.url` with `allowedHost`.
- The initial-host check at line 71 and the final-host check at line 74 do not prevent the intermediate off-host request. Rejecting the import afterward does not undo that request or its download.
- **Measured reproduction on the exact head:** a test-mode allowed URL on `127.0.0.1` returned a 302 to the disallowed loopback host `127.0.0.2`. The import eventually returned **502**, but the off-host server recorded **one request and served one body**. The response did not contain the test Pixabay key.
- Evidence: `teams/build/outputs/2026-11-22T03-18-11/review-296-redirect.mjs` and `review-296-redirect.log` in that same folder. This is a loopback stand-in, not a claim that Pixabay itself currently redirects there. Exploitability depends on an accepted Pixabay URL producing such a redirect; the defect is the missing per-hop boundary, not a claim of a compromised Pixabay service.
- **Fix:** use `redirect: 'manual'`; before every request, resolve and validate each `Location` against the allowed HTTPS Pixabay hosts, with a small redirect cap. Only read the body after the final URL has passed. Add this regression and assert the off-host server is contacted **zero** times. The existing test covers only an initially off-Pixabay URL, so it cannot catch this case.

## Other required checks

- **Key not returned: passed for the inspected and exercised paths.** `stock.mjs:29` removes `file` from public search hits; API failures at lines 35–38 use generic messages. The official test checks the search response for its test key, and my redirect reproduction also found no key in the import error. The key is put in Pixabay's outbound query string at line 33, as its API expects. I did not exercise the real Pixabay service.
- **Twenty-four-hour search cache: implementation present; short-window behavior tested.** `DAY` is 24 hours at line 17 and lines 50–56 refresh an absent or older-than-24-hour query entry. The official test proves an immediately repeated normalized search makes no second upstream call; it does **not** advance the clock across the 24-hour boundary. `byId` is a separate in-memory hit index.
- **Two-minute limit: normal metadata path passed.** `videos.MAX_SECONDS` is 120. Search filters longer reported clips at `stock.mjs:54`; direct import rejects reported duration over 120 at line 69. The official test's 600-second result is excluded. `videos.mjs:49–50` also probes the stored file when `ffprobe` is available. Caveat: absent/unparseable upstream duration becomes `null` (`stock.mjs:26`) and an unavailable or unsuccessful probe also returns `null`, so this is fail-open when neither duration source works; the fake-byte test does not prove actual media duration enforcement.
- **Credit: present.** `stock.mjs:77–78` supplies contributor/page credit and source metadata. `videos.mjs:39,51,80` accepts, stores and returns `credit` (truncated to 300 characters).
- **MCP/connector: both tools are defined and handled** (`mcp.mjs:162–163,368–369`) and both are in `ALLOW_TOOLS` (`agentconnect.mjs`, the `upload_file`/`my_images` row). The connection allowlist suite passed. `stock_import` calls `core.writeAllowed`; server routes are `server.mjs:843–844` behind `houseWriter`.

## Commands and counts

On the detached exact head, after `npm ci --no-audit --no-fund`, with Node **v24.22.3**:

```text
node --test commons/test/stock-footage.mjs commons/test/agent-connect.mjs
26 tests, 26 pass, 0 fail, 0 skipped
```

That is **1/1 stock-footage** and **25/25 agent-connect**. Log: `teams/build/outputs/2026-11-22T03-17-41/review-296-runtime.log`. The stock test used its local stand-in Pixabay, fake MP4 bytes and `FFMPEG=/nonexistent-ffmpeg`; it was not a real Pixabay download, media conversion, audible/visual inspection, or production check.

## Scope limits

I read the named source and test changes, including the two-line `.github/workflows/commons-tests.yml` CI addition. No source was edited. At inspection, the head's parent was `13d0fe55a70e9f24e75888b77cbc9958a4c23bec`; `origin/main` had moved eight commits ahead while this branch had one commit, so I did **not** test a merge with newer main. No staging, production, browser, deployment, legal/license-clearance, or real-Pixabay availability claim is made.

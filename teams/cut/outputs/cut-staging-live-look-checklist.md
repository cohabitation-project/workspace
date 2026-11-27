# Cohabi Cut — production live-look checklist for Ash

@Ash — revised for the actual site; this document does not report a live check.

**Status:** checklist only. GPT has not opened `cohabi.org/cut/` or performed a live check. No staging origin is used or assumed.

**Test-video safety:** Do not delete the test video until its status shows **ready** or **failed**. Before `d3bfdf88`, deleting during conversion could crash the server (Cut `JOBS.md`, Round 41 foreman note; the placed fix is recorded there).

## Choose the scope first

**A-lite (read-only; default):** Load `https://cohabi.org/cut/?videoId=<id>` at a 375 CSS-pixel-wide viewport. Inspect the Back link and page width only. Do not export or otherwise create anything.

**A-full (writes one video):** A-lite plus one deliberate **Export to Feed** on a clearly labelled test video. This creates a video record even if you do not publish it. Do not choose A-full unless the video is disposable and cleanup is arranged. Do not publish.

The account must already have an existing video for the `videoId` URL. Geoffrey or Setu arranges the test account/video; nobody should hand over credentials. Use only an authorized account and a clearly labelled, disposable video. Never upload another person's private footage.

## A-lite — read-only

1. Open `https://cohabi.org/cut/?videoId=<id>` using the pre-arranged video ID. Record the complete URL and UTC time. If the editor does not load or the ID is unavailable, record that and stop; do not create or upload a replacement video.
2. Set the viewport to **375 CSS px wide** (height may be recorded as used). Record browser/device and visible page state.
3. Measure the visible Back link's bounding box. PASS only if both width and height are at least **44 CSS px**. Record the actual dimensions.
4. Measure document width. PASS only if it is no greater than **375 CSS px**. Record the actual width.
5. **Production export capability (read-only evidence check):** check whether a successful export is recorded for the currently served SHA. If there is no such evidence, record **NOT CHECKED**; do not infer export works from the page loading or from local tests. A new export writes a video and therefore belongs only in A-full. This matters because the server uses `FFPROBE` or the default `ffprobe` (`commons/server.mjs:157`, `commons/lib/cut/wire.mjs:32,47-50`), and a failed probe returns HTTP 422 (`commons/lib/cut/route.mjs:92-100`).
6. Record the served SHA from the deployment record. **“Not visible” is a valid result** if no build/commit identifier is exposed on the page; do not infer the SHA from appearance or source tests.

## A-full — creates one video

Do every A-lite step first. Then, only if a clearly labelled disposable test video and cleanup are in place:

1. Press **Export to Feed exactly once**. This writes a video record. Wait for the result; do not repeatedly submit if it stalls or errors.
2. Record the exact toast/result and whether **Post it** appears. Inspect the destination and exported video identity if the link is present. Opening a composer for inspection is allowed; **do not press the final publish/post action**.
3. Record the created video ID. After inspection, delete it if authorized and available; otherwise leave it clearly labelled as a test and report who will clean it up. State explicitly whether it was posted (expected: no) and whether it was deleted or remains labelled test.
4. Forced-failure case: **NOT CHECKED**. Do not corrupt a request or force conversion failure on production.

The locally placed browser assertions can inform what to inspect, but are not live evidence: `commons/test/cut-export-handoff-live.mjs` checks the successful handoff; `commons/test/cut-tap-targets.mjs` checks controls; `commons/test/cut-phone-overflow.mjs` checks overflow. Their results do not establish the deployed SHA or production behavior.

## Report template — save/post as `teams/cut/outputs/cut-live-look-v2.md`

```text
Live look: production / A-lite or A-full
URL (redact video ID if needed in public notes):
UTC timestamp:
Served SHA from deployment record: <sha or NOT VISIBLE>
Browser/device + viewport:
Back link dimensions (CSS px):
Document width (CSS px):
A-lite result: PASS / FAIL / NOT CHECKED — observations
A-full export: NOT CHECKED / exact result and toast
Post link destination / exported identity: NOT CHECKED / observations
Created video ID: <record privately or redact in public note>
Cleanup: deleted / remains labelled test / NOT APPLICABLE; posted: yes/no
Forced failure: NOT CHECKED
Evidence: privacy-safe observations or redacted screenshot path
Limits / follow-up:
```

If the action wrote a video, report its ID to the authorized cleanup operator through the project's normal private operational channel, not in a public Commons post. Do not share account credentials or private footage.

## Changelog

- 2026-11-27: Added the ready/failed-before-delete safety rule and an A-lite check for successful production-export evidence tied to the served SHA. Source review only; no live production check was performed. `wire.mjs:32,47-50` and `route.mjs:92-100` show the ffprobe dependency and 422 probe refusal; `JOBS.md` Round 41 records the pre-`d3bfdf88` delete-during-conversion crash and placed fix.

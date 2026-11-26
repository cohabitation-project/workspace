# cut-export-duration — rebuilt boot, Kimi, 2026-11-26
# Cut export-duration real check — round 31

**Status:** boot corrected; syntax checked; real export still **not run here** because both ffmpeg and ffprobe are absent.

Rebuilt in place: `teams/cut/outputs/cut-export-duration.mjs` (6,658 bytes; SHA-256 `61a8e9130c94960be47de0a76510aae98d6bca0071e56f361d125c186f1c38a5`). Setu should place it unchanged as `commons/test/cut-export-duration.mjs` and run:
Candidate: `teams/cut/outputs/cut-export-duration.mjs`  
SHA-256: `968965a8e058643f767ab4376a826e541e4ef31a5d0ae22eb79932e84d1f314f`  
Size: 6,741 bytes

## Three requested boot fixes

The previous manual-port/listen-parser boot is gone. The candidate now follows the placed `commons/test/cut-phone-overflow.mjs` pattern:

- derives the checkout root from `HERE`, with separate team-candidate and placed-test locations;
- imports `freePort`, `auth`, and `store` with `pathToFileURL` from that root;
- calls `store.init(dataDir)`, seeds a human with `store.addMember`, and signs in with `auth.sessionCookie`;
- spawns `commons/server.mjs` with `cwd: ROOT`, `ASHRAM_PORT`, `COMMONS_DATA`, `COMMONS_FAKE_LLM=1`, `COMMONS_NO_SPEND_POLL=1`, and `stdio: 'ignore'`;
- polls `/api/presence` until the server boots. `FFMPEG` and `FFPROBE` are also passed through so the optional binary overrides reach the render process.

The real assertion is unchanged: ffmpeg makes a 4-second H.264 fixture; the signed-in member uploads it; the test waits for `ready`; Export posts trim 1..3 with coverSec 1; the returned MP4 is fetched and real ffprobe must measure 2 seconds ±0.1. Response `seconds`, when present, must also be 2 ±0.1. A pass prints `MEASURED source=… export=… responseSeconds=… tolerance=0.1s bytes=…`. Missing either binary is an explicit skip, not a pass.
The boot now follows `commons/test/cut-phone-overflow.mjs`:

1. **Real store/auth before spawn.** Imports `freePort`, `auth`, and `store` through `pathToFileURL`; calls `store.init(dataDir)`, seeds a human with `store.addMember`, and creates the cookie with `auth.sessionCookie` before starting the server. The candidate works both from its team-output home and after unchanged placement in `commons/test/`.
2. **Correct server command and environment.** Spawns `commons/server.mjs` from the repository root with `ASHRAM_PORT`, `COMMONS_DATA`, `COMMONS_FAKE_LLM=1`, and `COMMONS_NO_SPEND_POLL=1`. It retains the isolated `CUT_OUT`, `FFMPEG`, and `FFPROBE` settings and uses `freePort()`.
3. **Real readiness check.** Polls `GET /api/presence` for up to 80 × 250 ms instead of listening for the wrong stdout text.

- `node --check teams/cut/outputs/cut-export-duration.mjs`: exit 0.
- `node --test teams/cut/outputs/cut-export-duration.mjs`: exit 0; **1 test, 0 passed, 0 failed, 1 skipped**. Skip reason: `real export not run: missing ffmpeg and ffprobe; install it or set FFMPEG/FFPROBE`.
- The rebuilt module loaded its Commons `freePort`/`auth`/`store` imports and reached that explicit skip; the earlier `ERR_MODULE_NOT_FOUND: src/llm.js` server-boot blocker did not occur in this run.
- Raw evidence: `teams/cut/outputs/2026-11-26T00-22-28/cut-export-duration-rebuilt-check.json`.
The rest of the real check remains: generate a 4 s H.264 fixture; upload signed in; poll until ready; export trim 1→3 with `coverSec: 1`; fetch the returned MP4; require a nonempty file; and use real ffprobe to assert **2 s ±0.1 s**, checking response seconds when supplied. Success prints `MEASURED ...` with source/export durations and byte count. Missing either binary skips explicitly.

## Measured locally

No server was booted and no source or exported duration was measured because this runner has neither ffmpeg nor ffprobe. There is no real export-duration pass, browser result, or live-site claim. No product code changed.

@Setu owns placement and the real run on a full checkout with ffmpeg and ffprobe. Post the printed `MEASURED ...` line and pass/fail result in the Cut room.
Evidence: `teams/build/outputs/2026-11-26T00-22-33/cut-export-duration-check.json` (runner output destination) and `teams/cut/outputs/cut-export-duration-check.json` (record copy).

- `node --check`: exit 0.
- `node --test`: exit 0; **0 passed, 0 failed, 1 skipped**. Skip reason: `real export not run: missing ffmpeg and ffprobe; install it or set FFMPEG/FFPROBE`.
- `ffmpeg`: not installed; `ffprobe`: not installed.

This is not a passed export test and no product or live-behavior claim is made. No product code changed.

## Handoff

@Setu: place `teams/cut/outputs/cut-export-duration.mjs` unchanged at `commons/test/cut-export-duration.mjs`; on a full checkout with ffmpeg and ffprobe run `node --test commons/test/cut-export-duration.mjs`; post the printed `MEASURED ...` evidence and the actual pass/fail result in Cut.

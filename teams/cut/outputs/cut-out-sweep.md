# Does a timed-out render's half file get swept?

**For @Ash: NO, not within minutes.** On the current source it is eligible for age-based deletion only after its mtime is more than **6 hours** old; the **hourly** sweep means ordinary deletion is about **6–7 hours after the last write**, not after the 150-second render timeout. Claude's proposed process-group kill does not itself remove the file.

Round 42, file-only source audit requested by Setu (2026-11-27 09:30Z). Audited `wire.mjs` SHA-256 `d9626675be177cb5ec8f65db9721c0f4233629f54cfd2957b783721438775c40` and `cleanup.mjs` SHA-256 `b8aa4db1b9ad3725a90ff39acde2c5c0764e05b38b13b2ac4d459e77d6f12462`. No server was booted and no runtime, production, real-ffmpeg or patch claim is made.

## Source evidence

- `commons/lib/cut/wire.mjs:57-62`: the parent timeout defaults to **150,000 ms**. Its common `end()` only clears the timer and calls `p.kill()`; there is no output-file unlink. The timeout rejects with `render timed out`.
- `commons/lib/cut/render-job.mjs:95-100`: the child generates the random `cut_<16hex>.mp4` path. Its `catch` unlinks that path if `renderTimeline` throws, but a child terminated by the parent's `p.kill()` cannot run this JavaScript `catch`. This is the hole Claude measured with fake ffmpeg; this round did not rerun it.
- `commons/server.mjs:157-158`: `CUT_OUT` is the Cut output directory. `cutSweep()` runs once at startup and then every **3,600,000 ms (1 hour)**.
- `commons/lib/cut/cleanup.mjs:4,11-14`: only regular files matching `cut_[0-9a-f]{16}.mp4` are candidates; default `maxAgeMs` is **6 × 60 × 60 × 1000 = 6 hours** and default capacity is 2 GB.
- `commons/lib/cut/cleanup.mjs:61-64`: age deletion requires `entry.mtimeMs < now - maxAgeMs`. Because the comparison is strict and sweeps are hourly, an age-expired file is normally removed on the first hourly pass after it crosses six hours old: roughly 6–7 hours after its last modification, depending on sweep phase. At exactly six hours it can wait for the next pass.
- `commons/lib/cut/cleanup.mjs:76-82`: separately, if eligible survivors exceed 2 GB, oldest files can be removed earlier until the cap is met. That is capacity pressure, not a per-timeout cleanup guarantee.

## Qualification

The short answer is therefore **YES eventually under the normal age/cap sweep, but NO within N minutes**. If the orphaned ffmpeg keeps writing, it can refresh the file's mtime and postpone the six-hour age clock. If a sweep errors, deletion is also delayed. Unlinking a file still held open removes its directory name but does not by itself terminate the writer.

Claude's candidate `teams/cut/outputs/2026-11-27T06-23-00/wire-killtree.diff` adds process-group termination only. It fixes the orphan-process finding, but its own report correctly says the half-written file remains for the sweep.

## If immediate parent-side cleanup is wanted

A bare unlink cannot correctly be added to today's timeout branch because `outPath` is generated inside the child (`render-job.mjs:95`) and is not sent to the parent on timeout. First make the path parent-known (parent supplies it, or the child sends it over IPC before rendering); then the one-line best-effort timeout cleanup is:

```js
try { unlinkSync(outPath) } catch { /* already gone */ }
```

with `unlinkSync` imported from `node:fs`. Do **not** substitute `sweepRenders(job.outDir, { maxAgeMs: 0 })`: that would also delete unrelated fresh, successful renders. The parent-known-path follow-up is outside this file-only audit and was not implemented or tested here.

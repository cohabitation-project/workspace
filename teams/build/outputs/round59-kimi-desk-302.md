# Round 59 — Kimi: Work Desk PR #302 browser harness

## Shipped

`teams/build/outputs/round59-kimi-desk-302.mjs` is the requested standalone harness for Aletheia-6's PR #302 (`design/cohabi-social-desk-v1-20261125`, assigned head `6bb718f1`). It is deliberately **not** a `commons/test` file and changes no product source.

Given `BASE`, it launches a fresh, signed-out Chromium profile and opens `/desk` at 1440×900 and 390×844. For each viewport it:

- prints `page=/desk viewport=… document=… metrics=… sections=…`;
- counts `.desk-metric` and `.desk-section`;
- writes `teams/build/outputs/round59-desk-1440.png` and `round59-desk-390.png`;
- prints the visible WIDEST element at 390 px;
- exits 1 for horizontal document overflow, a wrong emulated viewport, zero `.desk-metric` elements, or an incomplete run.

The second navigation waits for a new `performance.timeOrigin`, so a same-URL load cannot be mistaken for the already-complete 1440 px document. Browser/profile cleanup cannot overwrite the measurements.

## Measured here

- `node --check teams/build/outputs/round59-kimi-desk-302.mjs`: **exit 0**.
- Final harness SHA-256: `2732da59207cc057c14705c46aba2b7bbc2d2ca43ec48125a22873fec1a1612e` (8,896 bytes).
- An earlier synthetic-browser verification attempt ended with the Python runner's `EACCES` cleanup error and returned no usable case output. It is **not counted as a pass**; its mock screenshots were not retained.

## Not measured / next

No PR #302 server was booted and no real `/desk` browser measurement or PR screenshot was obtained here. No visual, overflow, merge, deploy, or design-approval verdict is claimed.

@Setu: boot the exact current PR #302 head, then run:

```sh
BASE=http://127.0.0.1:<port> node teams/build/outputs/round59-kimi-desk-302.mjs
```

Post the two resulting PNGs and the printed metric/section/WIDEST evidence on PR #302. Any real overflow or zero-metric exit needs design feedback to Aletheia-6, not an unrequested design change in this harness lane.

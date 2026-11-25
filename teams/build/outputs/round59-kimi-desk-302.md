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
# Round 59 — Kimi: PR #302 Work Desk browser harness

## Shipped

- `commons/test/desk-302-browser.mjs` — standalone, read-only Chromium/CDP harness for Aletheia-6's PR #302 (`design/cohabi-social-desk-v1-20261125`). This is a test-only/Tier 2 artifact; no product source or CI configuration changed.
- Static-check evidence: `teams/build/outputs/2026-11-25T18-30-42/desk-302-browser-static-check.json`.
- Failure-logic evidence: `teams/build/outputs/2026-11-25T18-30-55/desk-302-failure-logic-check.json`.

Harness SHA-256: `82dc1b8798cc85611baf0fef4892f818aad50b25040223692796e81ec4b978d3` (12,915 bytes).

## What Setu runs

Check out and read the fresh PR #302 head, start its server with populated composer, claimed/hand-in and submitted/review states, then run:

```sh
node commons/test/desk-302-browser.mjs \
  --url=http://127.0.0.1:3000/desk \
  --out=teams/build/outputs/desk-302-<fresh-head-sha>
```

`--browser=/path/to/chrome` is optional. The harness intentionally accepts/installs no session cookie: point it at a test server or fixture where the required states are visible. It never submits a form or changes server data. Missing required states fail instead of yielding a false green.

For each of **1440×900** and **390×844**, it:

1. Navigates to `/desk`, waits for load/fonts/two animation frames, and writes `desk-1440x900.png` or `desk-390x844.png`.
2. Records every `.desk-composer`, `.desk-handin`, and `.desk-review` rectangle: width, left/right/top/bottom and scroll width.
3. Records `document.documentElement.scrollWidth`, body scroll width, visible off-viewport elements, hand-in submit buttons, and every `.desk-card` button.
4. Fails on document/body overflow, target forms crossing the viewport, a hand-in submit whose right edge is **not strictly `< 390`** on the phone run, or any card button outside its card horizontally or vertically.
5. Writes `results.json`; any failed or missing required check makes the process exit non-zero.

## Measured here (static/synthetic only)

- `node --check commons/test/desk-302-browser.mjs`: **exit 0**.
- `node commons/test/desk-302-browser.mjs --help`: **exit 0**, with usage and prerequisites printed.
- The actual `failuresFor` function was extracted and run against synthetic objects: fitting fixture no failures; document width 391 at a 390 viewport fails; submit right edge exactly 390 fails; escaped card button fails; missing `.desk-review` fails. Probe **exit 0**, all five expectations true.

## Not measured / not approved

No Chromium page was opened in this session. Therefore there are **no real `/desk` screenshots or layout measurements here**, and no claim about whether PR #302 passes. I did not verify the branch's current head, review its design/code, exercise form submission, run CI, merge, or deploy. The job's recorded head `6bb718f1` is only the assignment text, not a fresh-SHA verification. A reviewer's second yes must name the fresh head SHA actually read; this report gives no second yes. Setu owns the real run against the fresh branch head.

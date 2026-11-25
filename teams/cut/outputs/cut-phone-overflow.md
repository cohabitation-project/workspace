# /cut/ phone-width overflow harness

**Round 28, GPT. Candidate:** `teams/cut/outputs/cut-phone-overflow.mjs`, intended to be placed at `commons/test/cut-phone-overflow.mjs` by a builder. No product code changed.

The harness adapts the signed-in isolated-server/CDP flow and tolerant cleanup from `commons/test/pages-phone-overflow-dynamic.mjs`. It seeds a human in a temporary data directory, builds and installs that member's session cookie in headless Chromium, opens `/cut/` at a 390×844 CSS-pixel viewport, waits for fonts and two animation frames, and measures the document/body width and visible elements. It prints `page=/cut/ … document=<width>` and a `WIDEST /cut/: …` record; it fails for non-200/non-HTML, wrong viewport, or document width >390 px. The candidate resolves imports/root for either its current team-output location or `commons/test/` after placement.

**Measured:** `node --check teams/cut/outputs/cut-phone-overflow.mjs` exited 0 in the runner (`/usr/local/bin/node`).

**Not measured:** no server-backed execution, overflow verdict, browser screenshot, or live-site check. As recorded in the current build checkpoint, this runner's Commons checkout cannot boot because `src/llm.js` is absent; Setu must place the candidate, run `node --test commons/test/cut-phone-overflow.mjs`, and report its measured `document` and WIDEST evidence. A syntax pass is not a phone-layout result.
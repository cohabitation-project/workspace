# Round 59 — GPT: door tap targets

## Change
Added `commons/test/door-tap-targets.mjs`, a server-backed browser test based on the merged `commons/test/pages-phone-overflow-door.mjs` boot/CDP/session-cookie flow. It signs up a disposable human, verifies `/api/me`, registers an OAuth test client, and measures `/door`, `/join`, `/signin`, `/connect`, and the signed-in OAuth consent page at 390×844 with touch emulation enabled. A 3xx response is printed as “not measured,” matching the door overflow harness. For each measured page, it collects visible anchors, buttons, submit inputs, and `[role=button]` elements; inline anchors in paragraphs/list items with direct text-node siblings are exempt. It prints a `TAP` line for each non-exempt target narrower or shorter than 44 px and fails if any are found.

## Checks
- `node --check commons/test/door-tap-targets.mjs` — **passed**, exit 0.
- `node --test commons/test/door-tap-targets.mjs` — **not measured against the pages**: failed before browser startup with `Error: server did not boot`. This runner's repository snapshot does not contain `src/llm.js` (`exists=False`), a known Commons server boot dependency; server stderr is suppressed by the copied harness. Consequently there is no tap-target count or clean/defect result. @Setu should run the test in the dependency-complete, booted checkout.

No site implementation changed. No page dimensions, tap targets, merge, or production behavior are claimed as verified.

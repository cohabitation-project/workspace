# Round 61 — DeepSeek: the resend button, failed orders only (in progress)

Job (teams/build/JOBS.md, Round 61):
1. Fresh branch from main; finish kin-build 2117.
2. `commons/lib/marketpage.mjs` `salesPage`: keep the `failed` branch ("You can send it again." +
   `data-printer-send` + `role="status"`), keep `scripts: ['/static/market.js']` on `frame`.
   **Drop the `printer && !pstate` "Not sent yet" branch entirely** (Setu measured it breaks
   `market-sales-ship-to.mjs` 3 ways). Unsent orders are the start-up sweep's job (`checkout.resendUnsent`).
3. `commons/public/market.js` handler stays as written.
4. `commons/test/market-sales-resend-button.mjs`: delete the never-sent case; keep failed / sent / draft /
   buyer-copy / handler-text.
5. One call: the five-test bar, all green. Mutant: drop `${resend}` from the failed row → red.

## Numbers

_Measured this session; filled in below as the work lands._

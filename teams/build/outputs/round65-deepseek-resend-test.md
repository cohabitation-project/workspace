# Round 65 — DeepSeek: prove the "Send it again" handler (in progress)

Job: new `commons/test/market-resend-click.mjs`, no server and no browser: load `commons/public/market.js`
in `node:vm` with a fake `document` and a stubbed `fetch`. Five cases.

Status: starting. Reading `commons/public/market.js` to learn what globals the module needs at load.

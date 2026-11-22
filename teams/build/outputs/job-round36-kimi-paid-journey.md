# Round 36 — Kimi: paid-journey projection fix

**Status: in progress.** Assignment: preserve `teams/cut/outputs/2026-11-22T18-20-36/market-paid-journey.mjs` byte-for-byte as `commons/test/market-paid-journey.mjs`, demonstrate the round-35 red on current public main, then change only `shown()` in `commons/lib/checkout.mjs` to expose `refunded_cents` and run the assigned journey/status/Stripe/agent-connect tests.

The test's recorded SHA-256 is `620fc6082aa7521c6f33842005ce7948b4d5b84214d6419c6c42519319145f8c`. No real payment provider, credential, money movement, deploy, or production behavior is involved. Results, exact base SHA, artifacts, and launch blockers will be added after the measured runs.

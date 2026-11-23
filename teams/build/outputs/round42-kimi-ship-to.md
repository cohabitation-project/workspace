# Round 42 — Kimi: paid print orders collect a shipping address

Status: in progress (2026-11-23T15:23Z work session). Round 41 is recorded in `teams/build/JOBS.md` as lane `7d291ca8`, with its new test in CI.

Assigned scope: change only `commons/lib/checkout.mjs`; add `commons/test/market-order-ship-to.mjs`. Linked print-provider Stripe Checkout sessions must collect a US shipping address, and the paid webhook must copy only `shipping_details` name + address to `order.ship_to`. Unlinked orders collect neither. Never log an address; buyer-facing address visibility must remain restricted to that buyer.

Verification is not yet run. No staging, production, payment, or real-provider claim.

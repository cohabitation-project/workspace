# Round 63 — Claude: the start-up sweep, run on a booted server (closes the gap I named in round 62)

Branch under test: `kin-build/20261126-0325-claude` @ bb8dace (my round-62 change to `commons/server.mjs:2805`, on top of main 1699f18). `npm ci --omit=dev` in a fresh clone; Node v24.22.3.

## What I ran (measured)
Script: `teams/build/outputs/2026-11-26T04-12-42/boot-sweep.mjs` (copy it to `commons/test/` to run: its imports are relative; it is a manual harness, not a CI test, because it takes ~15 s). It:
1. Phase 1, in-process (same setup as `merch-resend-unsent.mjs`): a maker, a listing with an approved tee, a buyer, a paid merch order **with no printer record** (the "process died after the webhook" case), data in a temp dir.
2. Phase 2: a real HTTP stand-in for Printful on 127.0.0.1 (answers `/products/71`, `/mockup-generator/printfiles/71`, `POST /orders`), then the **real `node commons/server.mjs`** booted on that same data dir with payments open (`COMMONS_PAYMENTS=stripe`, test keys), `PRINTFUL_API_URL` = the stand-in, `COMMONS_NO_SPEND_POLL` unset.

## Results
| Check | Result |
|---|---|
| Server prints "listening" | at 503 ms |
| Printful receives `POST /orders` | at 5509 ms — **5.0 s after listening**, exactly one |
| Order file afterwards | one `fulfillment` line: `{provider: printful, provider_order: 9001, state: draft}` |
| Art URL in the Printful body, `COMMONS_PUBLIC_URL=https://cohabi.test` | `https://cohabi.test/images/img_…` (base is the configured public URL) |
| Art URL, `COMMONS_PUBLIC_URL=https://ashram.lastoftherealestate.com` | `https://cohabi.org/images/img_…` (old host mapped to canonical, as I inferred from core.linkBase) |
| Restart the server on the same data dir, wait 8 s | posts before 1, after 1 — **no second send** (the order now has a record) |
| Server stderr | no "resend sweep" error |

So the two things round 62 marked "inferred, not watched" are now watched: the 5 s timer fires, and `base` is right for both host cases.

## Limits
- Printful was a local stand-in, not the real API; the Stripe side was not exercised (the order carried `ship_to`, so `sendToPrinter` never asked Stripe).
- A `failed` order was not in this run (covered by `merch-resend-unsent.mjs`, server-free).
- Payments-closed boot was not re-run booted (covered by `merch-resend-boot.mjs` (b), server-free).
- Single machine, single run of each variant (two runs total: cohabi.test and ashram host).

## For Setu
Tier 1 second yes on server.mjs at bb8dace can cite this run. The edit is one line; the boot run above is the evidence the timer works.

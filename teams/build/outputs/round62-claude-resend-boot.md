# Round 62 — Claude: unsent-order sweep at start-up (done, Tier 1: needs Setu's second yes at the exact SHA)

**Change (commons/server.mjs, one statement after the "listening on" log line, inside `server.listen(PORT, HOST, () => {…})`):**
```js
if (process.env.COMMONS_NO_SPEND_POLL !== '1') setTimeout(() => checkout.resendUnsent({ base: (core.CFG.publicUrl && !/\/\/ashram\.lastoftherealestate\.com$/i.test(core.CFG.publicUrl)) ? core.CFG.publicUrl : core.CFG.canonicalUrl }).catch((e) => console.error('[commons] resend sweep:', e.message)), 5000).unref?.();
```
`base`: there is no request at boot, so it mirrors `core.linkBase(req)`: `COMMONS_PUBLIC_URL` (so staging stays staging), but the old ashram host becomes the canonical `https://cohabi.org`; with no public URL set it is `CFG.canonicalUrl`. This is inferred from reading core.mjs:1229-1238 and :77-80; I did not boot the server and watch the sweep fire.

**Test:** `commons/test/merch-resend-boot.mjs` (2 tests).
(a) server-free: exactly one `resendUnsent(` in server.mjs, inside the listen callback, after the listening line, on a statement with COMMONS_NO_SPEND_POLL, setTimeout, `.catch(`, `, 5000)`, `.unref?.()`.
(b) `resendUnsent` with payments closed and one paid merch order in `<data>/payments/orders.jsonl`: result `{sent:[],failed:[],skipped:1}`, file byte-for-byte unchanged, order has no fulfillment (not buried as `failed`), zero fetch calls, nothing else written.

**Measured** (fresh clone of main c876742, `npm ci --omit=dev`, COMMONS_FAKE_LLM=1, COMMONS_NO_SPEND_POLL=1):
- Unchanged server.mjs: 1 pass, 1 fail (test a red; test b passes because it exercises already-merged checkout code).
- With the change: 2 pass, 0 fail.
- Mutants: remove the COMMONS_NO_SPEND_POLL guard → test a red; add a second `resendUnsent` call → red. (An earlier run of "no catch" and "call outside listen" mutants also showed test a red, but that run had test b broken by my wrong path, so only the guard and second-call mutants are confirmed with a working test b.)
- `merch-resend-unsent.mjs merch-resend-boot.mjs merch-checkout*.mjs agent-connect*.mjs`: **38 tests, 38 pass, 0 fail.**

**Not done / limits:** not booted end to end with a real unsent order (needs Stripe + Printful stand-ins on a booted server; the 5 s timer is not exercised by any test, only its presence). The e2e suite and the rest of the suite were not run. A `failed` order is never retried by this sweep (by design, per checkout.mjs doc). With payments closed it does nothing. Whether my write_file/edit_file edits to `commons/` reach the kin-build branch: they landed in this session's repo copy; the runner decides. If the branch lacks the edit, apply the one statement above.
**Tier 1 ask:** @Setu, second yes at the branch SHA; please run it booted once with a paid unsent order if you can.

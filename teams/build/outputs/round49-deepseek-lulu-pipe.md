# Round 49 (DeepSeek) — the Lulu pipe, end to end, and why it was the missing third

_2026-11-24T10:15Z. Test-only change. No library file touched._

## What was missing in round 48

Round 48's `commons/test/market-ship-to-end-to-end.mjs` proved a paid Stripe order reaching **Printful** and
**Printify** with the buyer's address, and that an order with no `shipping_details` is refused before any printer
fetch. It never touched **Lulu** — and Lulu is the only pipe whose `send()` makes a fetch *before* the order call:

```
send() → plan() → hasAddress guard → status().connected → luluToken(fetchImpl)  ← a fetch
                                                             → POST /print-jobs/  ← the order
```

So Lulu is the one provider where a misplaced guard would put an address-less print job on the wire **after** a
sign-in had already gone out. Printful and Printify have no pre-flight fetch, which is why the round-48 cases
could not have caught it.

## What changed (one file)

`commons/test/market-ship-to-end-to-end.mjs` — two new subtests, plus the fake printer now records Lulu's
urlencoded sign-in body instead of only JSON:

1. **`Lulu: after its own sign-in fetch, the address is POSTed to /print-jobs/ in Lulu field names`**
   A paid order whose listing is linked to `{provider:'lulu', product_id:'book_e2e_1', sku:'0850X0600BW.PB'}`.
   Asserts **exactly two provider calls** and no more — the sign-in (`POST /auth/realms/glasstree/protocol/openid-connect/token`,
   `Basic base64(key:secret)`, `grant_type=client_credentials`) and then `POST /print-jobs/` with
   `authorization: Bearer <token from that sign-in>`, `external_id: order.id`, `shipping_level: 'MAIL'`,
   `line_items[0].printable_normalization.pod_package_id === '0850X0600BW.PB'` (the maker's print package, not
   dropped), and

   ```
   shipping_address = { name: 'Ada B Lovelace', street1: '17 Private Test Street', street2: 'Apt 42',
                        city: 'Tucson', state_code: 'AZ', country_code: 'US', postcode: '85701' }
   ```

   with no `email` and no `phone` — nothing the buyer did not give.

2. **`Lulu with no address: refused 409 before even its sign-in fetch`**
   Paid order, no `shipping_details`. `plan()` still names `lulu` (so the refusal is about the address, not the
   link), `send()` throws **409 /no shipping address/**, and **the provider call count is unchanged** — Lulu's
   sign-in is a fetch, so this asserts that nothing at all leaves the process.

## Measured (sandbox, `node --test --test-reporter=tap`, temp copy of `commons/`)

| run | result |
|---|---|
| real `commons/lib` (main) | **6 tests / 6 pass / 0 fail** |
| mutant: `if (!hasAddress(order?.ship_to)) fail(409, …)` deleted from `send()` | 6 tests / 3 pass / **3 fail** (parent + both no-address cases) |
| mutant: Lulu's `recipientFor` branch deleted | 6 tests / 4 pass / **2 fail** (parent + the Lulu print case) |

`node --check` clean before running. Environment restored in `finally` (env, `fetch`, console) so the fake keys do
not leak into other files in the same process.

**Label:** measured, in this sandbox, against a fake Stripe and a fake printer. Nothing here is a live print. Live
acceptance for any of the three pipes still needs a nonproduction printer token, which a session does not have.

## Two corrections to what I left in my own checkpoint

1. `commons/test/fulfillment-send-refused-provider.mjs` **is** in `.github/workflows/commons-tests.yml` now (it is
   in the long `node --test …` line). That open item is closed; I had it as not-in-CI.
2. On the new-test-in-CI question: the workflow's `merge-build-lane` job explicitly runs *every test file the branch
   added or changed* ("the suite above lists files by name, so a new test would otherwise never run"). So
   `market-ship-to-end-to-end.mjs` **did** run once, on its branch, before merging — but it does **not** run on main
   on later pushes until its path is added to that long line. That is the honest statement of the gap: one green
   run at merge, silence after.

## Still owed

- **CI line** (`.github/` access only): append `commons/test/market-ship-to-end-to-end.mjs` to the long
  `node --test …` step that already runs `market-order-ship-to.mjs`. Board request stands.
- The 6 `todo` cases in `fulfillment-plan-providers.mjs` still need Ash/Setu's decision on buyer email and
  cover/interior image URLs.
- #291 defects 2/3 wait on Geoffrey.
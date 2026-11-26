# Round 66 — DeepSeek: the curated Printful guard test

**Job:** new `commons/test/printful-curated-guard.mjs`, server-free, pinning **today's** `commons/lib/printful.mjs`
behaviour. No change to `printful.mjs` (its one-line hash is unchanged; nothing outside the new test was touched).

**File:** `commons/test/printful-curated-guard.mjs` — 7526 bytes,
sha256 `7fe46db3ec0c1cec110225708116bf0d82f0f66cdec09858f9a21985497618d2`.

## How it runs (no server boot, no browser)
Like `commons/test/merch-printful.mjs`'s second case: a fake Printful on `127.0.0.1` (http server on a free port),
`PRINTFUL_API_URL` pointed at it, `PRINTFUL_TOKEN='test-token'`, `resetCache()` before every case, and `products()`
called **directly** from `commons/lib/printful.mjs`. The fake answers any numeric product id with a product, a print
area and two in-stock variants; ids in a mutable `broken` set answer 502 (Printful's own "having a problem" shape).

Four cases, one parent test:
1. **N curated keys, every id answered** → `products()` returns N, in the order `PRINTFUL_PRODUCTS` gives; titles are
   Printful's own; `base_from` is the cheapest in-stock variant (11.5); the print area comes from the printfiles call;
   the complete read becomes the cache.
2. **One id answers 502** → the other N−1 come back, in order, and `products()` does **not** reject; `cachedProducts()`
   stays `[]` (a hiccup is never cached as "these are the products"); a second call inside `RETRY_MS` does not ask
   Printful again (the fake's request log is unchanged).
3. **`PRINTFUL_PRODUCTS='[]'`** → the eight known defaults, by id and key (`DEFAULT_IDS` / `DEFAULT_KEYS` written out in
   the test so a change to the fallback is visible instead of silently agreeing with itself).
4. **`PRINTFUL_PRODUCTS='{bad'`** → the same eight defaults, a separate case because it reaches the fallback through a
   different path (the `catch` in `curated()`, not `length === 0`).

3 and 4 are the **silent** paths the test names in its header: a misconfigured server quietly sells the eight defaults.
The "make the fallback loud" step (its own later job) can now go red from this before.

## Measured (this sandbox, node v24.22.3)
- `node --check commons/test/printful-curated-guard.mjs` → exit 0.
- `node --import file://$OUT/hook.mjs --test commons/test/printful-curated-guard.mjs` → **exit 0, 5 pass / 0 fail**
  (1 parent + 4 subtests), 762 ms:
  ```
  ▶ the curated Printful list: what survives a read, and what falls back
    ✔ 1. every curated product answers: N products, in the order given (126.7ms)
    ✔ 2. one product answers 502: the others still come back, nothing throws, and [] is not cached (7.1ms)
    ✔ 3. PRINTFUL_PRODUCTS='[]' silently falls back to the eight defaults (16.5ms)
    ✔ 4. PRINTFUL_PRODUCTS='{bad' (broken JSON) silently falls back to the eight defaults too (46.8ms)
  ✔ the curated Printful list: what survives a read, and what falls back (395.9ms)
  ℹ tests 5  pass 5  fail 0
  ```
  **The `--import` hook is a sandbox crutch, not part of the test.** This runner has no native `sharp`, which
  `commons/lib/merchsets.mjs` (imported through `fulfillment.mjs` by `printful.mjs`) imports at module load. The hook
  (evidence `2026-11-26T15-19-58/hook.mjs`) resolves `sharp` to a shape-only stub
  (`2026-11-26T15-19-58/sharp-stub.mjs`) — `products()` never encodes an image, so the stub is never called. **On Setu's
  full-dependency runner the plain command is right: `node --test commons/test/printful-curated-guard.mjs`.**
- **Mutant** (the fake answers 200 for the 502'd id, i.e. `broken.add(12)` removed) → **exit 1, 3 pass / 2 fail**, red at
  exactly case 2, naming it:
  ```
  ✖ 2. one product answers 502: the others still come back, nothing throws, and [] is not cached
    AssertionError: the refused product is left out; order survives
      + actual  [ 'tee', 'mug', 'poster' ]
      - expected [ 'tee', 'poster' ]
  ```
  Cases 1, 3 and 4 stayed green under the mutant — the mutant is specific to case 2, which is the point.

## Limits (say what I did not measure)
- **Not run by Setu on a full checkout**: no `node --test …` against main's dependencies here; "needs boot" for the
  `sharp`-free command above.
- **The 60 s retry window is not waited out.** Case 2 proves no second request is made *inside* `RETRY_MS`; it does not
  prove the list is re-read after it (that would cost a 60 s test).
- **Not covered:** `products()` throwing 503 when the token is absent; a discontinued product (`is_discontinued`) being
  skipped; a product with no usable print area; `PRINTFUL_PRODUCTS` holding a non-array JSON value (e.g. `{}`), which
  also falls back silently. Each is one more case if the fallback job wants them.
- The fake is one server for all four cases; a case that leaked a request into the next case would show up in the
  `seen` log, which only case 2 asserts on.

## Next (not mine, by the job)
- @Setu: run the plain command on main with full dependencies, and add the file to CI if `commons-tests.yml` lists tests
  by name rather than globbing `commons/test/*.mjs`.
- The "make the fallback loud" job: today `'[]'` and `'{bad'` both sell the eight defaults. Cases 3 and 4 pin that.

# Round 67 — DeepSeek: the curated Printful list stops falling back in silence

**Job (JOBS.md round 67, marketplace Tier 2):** make the 18:14 branch green — `commons/test/printful-curated-guard.mjs`
was red on my own branch (`assert.rejects` resolves to `undefined`; I read `.status` off it), and the behaviour change
behind it (`curated()` refusing a set-but-unusable `PRINTFUL_PRODUCTS`) had to be proven by a red-able test.

**Result: green here, 9 pass / 0 fail; and both mutants red where they should be.** Not run on a full-dependency
runner (see Limits) — @Setu, the plain command is in "What Setu runs".

## What changed, file by file

### `commons/lib/printful.mjs` (21719 bytes, sha256 `507173677add2c27…`)
`curated()` used to be one line:
`try { JSON.parse(env('PRINTFUL_PRODUCTS') || 'null') } catch {} return DEFAULT_PRODUCTS`.
Four ways of getting the variable wrong were swallowed: it was not valid JSON, it was not an array, it was an empty
array, or an entry was not `{key, id}` (that one reached Printful as `/products/NaN` and the product vanished with no
log), or the same key appeared twice (one product silently won).

Now: **unset or empty** still means `DEFAULT_PRODUCTS`, in silence — that is the intended fallback and it is case 6.
**Set and unusable** writes one `[printful] …` line to the server log per distinct problem and throws
`CommonsError(500, 'PRINTFUL_PRODUCTS is set but unusable: <what is wrong>. A steward has to fix it: set the variable to
JSON like [{"key":"tee","id":71}], or unset it for the eight defaults.')`.

Who sees it: `merchsets.panel()` (the maker panel) and `GET /api/merch/products` — those two surfaces now say what is
wrong instead of showing Ash's eight defaults as if nothing were wrong. `merchsets.tick` keeps its own `catch` on
purpose (it is a background retry), so a misconfigured server retries every 20 s and logs **once** per distinct
problem, not every tick.

The messages, exactly (the test matches these strings):
- `… it is not valid JSON (4 characters)`
- `… it is not a JSON array`
- `… it is an empty array`
- `… entry 0 is not {key, id} (got {"key":"tee"})`
- `… the key "tee" appears twice`

`export function curated()` is now exported so a later test can call the check without a server.

### `commons/test/printful-curated-guard.mjs` (11614 bytes, sha256 `36c3f4b9a15ecb9f…`)
Rewritten from round 66. Server-free; one fake Printful on 127.0.0.1 (the stand-in `merch-printful.mjs` uses). Eight
cases inside one parent:

1. five curated products → five back, in the order given, Printful's own title, cheapest-variant base cost, print area
   from the printfiles call, complete read cached, **every curated id asked for once and in order**, and the cached list
   keeps that order (live read *and* `cachedProducts()`).
2. one id answers 502 → the other two come back in order, `products()` does not reject, `cachedProducts()` stays `[]`,
   and Printful is not asked again inside `RETRY_MS`.
3. `'[]'` → **refuses**, message matches, `status === 500`, exactly one log line even when asked twice, and Printful is
   asked nothing.
4. `'{bad'` → refuses, `… not valid JSON (4 characters)`.
5. `[{"key":"tee"}]` → refuses, names entry 0, and **no request with a NaN id is made**.
6. `PRINTFUL_PRODUCTS` unset → the eight defaults, in order, and **no log line** (the intended fallback stays silent).
7. the same key twice → refuses, `the key "tee" appears twice`.
8. valid JSON that is a JSON object → refuses, `it is not a JSON array`.

The round-66 harness bug is fixed the way I wrote it down: a `refusal()` helper catches the error itself
(`assert.rejects` resolving to `undefined` is what produced the `TypeError: … reading 'status'`). Round 66's no-op
assertion `seen.every((p) => … || true)` is replaced by a real `deepEqual` on the requested `/products/<id>` paths.

## Measured (node v24.22.3, this sandbox)

```
$ node --check commons/lib/printful.mjs                      exit 0
$ node --check commons/test/printful-curated-guard.mjs       exit 0
$ node --test commons/test/printful-curated-guard.mjs        9 pass / 0 fail, exit 0
```

**Mutant 1 — restore the old one-line silent `curated()`:** `exit 1`, **3 pass / 6 fail**, red on cases **3, 4, 5, 7, 8**
and green on 1, 2 and 6. So the loud-refusal cases fail *because of the change* and the fallback case does not.

**Mutant 2 — sort the list by key before caching:** first run **survived** (9/9 green). That was a real hole: case 1
checked the order of the live read only, never of the cached list. After adding the cache-order assertions it is
`exit 1`, **7 pass / 2 fail**, red on case 1 alone. Both mutants are recorded here because the surviving one is the more
useful finding.

**`commons/test/merch-printful.mjs`: red in this sandbox, 0 pass / 2 fail — and I could not establish a baseline.**
The WebP case ("WebP art becomes a PNG before Printful is handed its address") is my stand-in `sharp`: that case calls
`printableArt()`, which needs real `sharp`, and the failure message is `printableArt`'s own catch. The other case
(`a maker turns their art into a Printful product…`) ends `ECONNREFUSED 127.0.0.1:…` at ~15 s. My baseline attempt was
**invalid**: `$REPO` has no `.git`, so `git show HEAD:commons/lib/printful.mjs` failed and both runs used my file. By
inspection the curated change cannot reach either case (that test never sets `PRINTFUL_PRODUCTS` wrongly, and an unset
variable returns the same `DEFAULT_PRODUCTS` as before), but I did not measure it, so I am not claiming it.

## What Setu runs (full deps, no fake sharp)
```
node --test commons/test/printful-curated-guard.mjs commons/test/merch-printful.mjs
```
No `--import` flag: that hook exists only because this sandbox has no native `sharp`, and `printful.mjs` →
`fulfillment.mjs` → `merchsets.mjs` imports it at load. Expect **9 pass / 0 fail** for the guard; `merch-printful.mjs`
is Setu's to read (it was red here for sandbox reasons, see above).

## Limits
- No browser and no server boot here, so I did not see the maker panel or `/api/merch/products` render the refusal.
  What I have is the thrown `CommonsError(500)` with its message, which is what those surfaces show.
- `RETRY_MS` (60 s) is not waited out; case 2 proves the *decision* not to re-ask inside the window.
- Nothing about the store's real catalogue: the throw-blanket / summer-blanket / tapestry ids need the Printful
  dashboard (Ash has it), and the multi-placement AOP path still needs per-placement areas in the product record.

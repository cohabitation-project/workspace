# Round 68 — DeepSeek: the cold read says "try again", and the partial read is served but never cached

Job (JOBS.md, round 68, DeepSeek): close round 68 honestly on main — hashes, a green run, the
`partial` mutant named, and one new case pinning Setu's partial-list fix.

## What is on main now, and what I changed

| file | main, as I found it | after this session |
|---|---|---|
| `commons/lib/printful.mjs` | 23243 b · sha256 `7a65057153510850e5a9f3a1fb474c2c7e38436b656e7822bbede304a9a86294` | **unchanged by me.** This is Setu's merge: `if (failAt && now - failAt < RETRY_MS) { if (cache) return cache; if (partial.length) return partial; transient(502, COLD); }` and `if (hiccup) { failAt = Date.now(); partial = out; const worth = cache \|\| out; if (worth.length) return worth; transient(502, COLD); }` |
| `commons/test/printful-curated-guard.mjs` | 11620 b · sha256 `36c3f4b9a15ecb9f4c954853bde3a44285747f7a3426d6749ef5d0f1ccbed10a` | unchanged |
| `commons/test/merch-printful-retry.mjs` | 5429 b · sha256 `f07c92f918f9f573…dbae734` (2 tests, pinned `['tee']`) | **rewritten by me**: 7638 b · sha256 `1862c250f314e30b7d21c54362f3a1b6a3a6bede6a81649c2c66804c38fe32a2` (3 tests) |

`commons/public/market.js` is still 17056 b · sha256 `b0902defca687c93…` — untouched this session. Its **Try again**
button is still **unrun in a browser**; that is GPT's round-68 job, not mine.

### The three changes inside the rewritten test (a placed test, so both files go together or neither)
1. The stand-in Printful now knows **three** curated ids (`tee` 71, `mug` 72, `cap` 73) and answers any
   `/products/<n>` / `/mockup-generator/printfiles/<n>` generically, instead of only 71. **The two existing assertions
   that said `['tee']` now say `['tee', 'mug', 'cap']`** — same behaviour, a bigger stand-in. Setu should read that line
   as a change to a placed test, not drift.
2. A new fake mode `partial`: `/products/72` answers **500** (a passing problem) while 71 and 73 answer normally.
3. Third test: *a partial read is served inside the retry window without another request, and never becomes the cache* —
   first call returns `['tee','cap']`; a second call inside `RETRY_MS` returns the same two and **the fake sees no new
   request**; past the window the missing product is looked for again, so the partial list was not cached; the complete
   list is then served with no further requests. Header bullet 6 says all of that.

## Measured, this session

Runner: this session's sandbox, `node --test`, with a **stand-in for `sharp`** (it is not installed here; the module
hook `registerHooks` maps `sharp` to a stub — `teams/build/outputs/2026-11-26T22-12-15/{hook.mjs,sharp-stub.mjs}`).
That substitution is the only difference from a plain main run; `printful.mjs` → `fulfillment.mjs` → `merchsets.mjs`
needs it at load. **These are real runs, not a browser and not staging.**

`node --test commons/test/merch-printful-retry.mjs commons/test/printful-curated-guard.mjs`

```
✔ a passing problem on a cold read says "try again" instead of showing an empty catalogue…
✔ a complete read that finds nothing is still an empty list, not a refusal…
✔ a partial read is served inside the retry window without another request, and never becomes the cache
▶ the curated Printful list: what survives a read, and what refuses
  ✔ 1. every curated product answers: N products, in the order given
  ✔ 2. one product answers 502: the others still come back, nothing throws, and [] is not cached
  ✔ 3. PRINTFUL_PRODUCTS='[]' REFUSES (it is set and wrong), and logs one line
  ✔ 4. PRINTFUL_PRODUCTS='{bad' (broken JSON) REFUSES and names the length it could not parse
  ✔ 5. an entry without an id REFUSES and names the entry (it used to reach Printful as /products/NaN)
  ✔ 6. PRINTFUL_PRODUCTS unset still falls back to the eight defaults, in silence
  ✔ 7. the same key twice REFUSES (one product used to win without a word)
  ✔ 8. valid JSON that is not an array REFUSES
tests 12 · pass 12 · fail 0 · duration_ms 382
```

(The three `[printful] … PRINTFUL_PRODUCTS is set but unusable` lines in the log are cases 3, 4, 5, 7 and 8 doing their
job: one line per distinct problem, on stderr, as round 67 designed.)

### Mutant M1 — delete `if (partial.length) return partial;` from `products()`
Applied to this call's copy of `printful.mjs`, run, then restored from the in-memory original (`restored: True`);
the target appeared exactly once.

```
exit 1
✔ a passing problem on a cold read says "try again" instead of showing an empty catalogue…
✔ a complete read that finds nothing is still an empty list, not a refusal…
✖ a partial read is served inside the retry window without another request, and never becomes the cache
  ✔ 1. every curated product answers: N products, in the order given
  ✖ 2. one product answers 502: the others still come back, nothing throws, and [] is not cached
  ✔ 3–8 (all green)
tests 12 · pass 9 · fail 3
```

Naming the reds exactly: **my new partial test** and **guard case 2** — the case Setu fixed on main. The other ten
stayed green, including 1, 3–8 and both cold-read tests, so the mutant is caught by exactly the two cases that are
about a partial read. Reading the code, the mechanism is: with that line gone, the retry-window branch falls through
`cache` (null) to `transient(502, COLD)`, so the second call in the window refuses instead of showing the two products
that had already answered. That is guard case 2's defect returning, and it is now pinned twice.

## What this does and does not prove
- **Proved:** on main's code, a cold passing problem is a 502 with a sentence a person can act on; nothing is cached on
  a refusal; a complete empty read is still `[]`; a partial read is served, not asked for again inside the window, and
  never becomes the cache; and two independent tests go red if the partial branch is removed.
- **Not proved here:** that `market.js` shows the sentence and a ≥44 px **Try again** button in a real browser (GPT's
  job, needs Chromium); that `/api/merch/products` maps 502 + `transient` to what the panel reads (reading only, not a
  run); anything about staging or production.

## Open, on my line
1. Printful catalogue ids for throw blanket / summer blanket / tapestry (needs Ash's store dashboard).
2. The multi-placement AOP path (per-placement print areas in the product record).

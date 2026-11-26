# Round 68 (DeepSeek) — a cold Printful read says "try again" instead of hiding the panel

_Written 2026-11-26 ~21:25 UTC. Node v24.22.3. Everything marked measured was run in this session; everything marked
unrun says so._

## The defect, in one line

`products()` answered `[]` when Printful had a passing problem on the first read and there was no good list to fall
back on. `[]` is a real answer ("this catalogue has nothing"), so the composer could not tell an outage from an empty
market: the product picker filled with no options, the merch box stayed hidden, and the maker saw a dead panel with
nothing to press. The `.catch(() => {})` in `market.js` swallowed the rest.

## What changed (three files)

### 1. `commons/lib/printful.mjs` — 23243 bytes, sha256 `7a65057153510850`, `node --check` 0
`products()` now ends like this (the load-bearing lines):

```js
if (hiccup) { failAt = Date.now(); partial = out; const worth = cache || out; if (worth.length) return worth; transient(502, COLD); }
if (!out.length) { failAt = Date.now(); return out; }
```

and `export const COLD = "The print partner isn't answering right now, so there are no products to show yet. Try again
in a minute.";` (also `RETRY_MS = 60_000`, unchanged.)

The four rules the shape encodes, each with a test:

| situation | answer |
|---|---|
| passing problem, nothing good to show | `transient(502, COLD)` — refused, and Printful is not asked again for 60 s |
| passing problem, a good list from earlier | that list (stale is better than an outage message) |
| passing problem, some products answered | the partial answer, shown, never cached |
| a complete read that finds nothing | `[]` — a real answer, not a refusal |

A refusal caches nothing. The first two lines of the function already served `cache` and `partial` inside the retry
window; the change is that the empty-and-hiccup case now refuses instead of returning `[]`.

### 2. `commons/public/market.js` — 17056 bytes, sha256 `b0902defca687c93`, `node --check` 0
The composer's picker reads the HTTP status instead of discarding it. On a non-2xx catalogue read it puts the server's
sentence in `#mf-msg`, keeps `#mk-merch` visible, and shows a **Try again** button that clears the message and re-fetches;
a successful read hides the button. The old `.catch(() => {})` is gone.

**This file is unrun.** There is no browser in this sandbox — no claim of a working button is made here. Setu (or
anyone with a boot) must check: `#mf-msg` shows "… Try again in a minute.", the merch box stays visible on a 502,
the appended **Try again** button re-fetches and disappears on success.

### 3. `commons/test/merch-printful-retry.mjs` — 5429 bytes, sha256 `f07c92f918f9f573`, `node --check` 0
**This was a placed test and it pinned the defect** (it asserted `[]` on a cold 429). It is rewritten in this session, so
Setu places it *with* the lib change or not at all. Two tests:

1. a cold 429 → `CommonsError` with `status === 500` (from `transient(502, …)`) and the COLD sentence; Printful is not
   asked again inside `RETRY_MS`; the real list comes back after the window; a good list survives a later 500.
2. a complete 404 read (a product Printful says does not exist, nothing else wrong) is still `[]`, not a refusal — the
   distinction the whole job is about.

Uses a `refusal()` helper that catches the error itself (`assert.rejects` resolves to `undefined`, so asserting on
`err.status` that way is silently a no-op).

## Measured

```
node --import <hook> --test commons/test/merch-printful-retry.mjs commons/test/printful-curated-guard.mjs
→ tests 11, pass 11, fail 0, exit 0
```

`--import <hook>` is only this sandbox's shape-only `sharp` stand-in (no native `sharp` here; `printful.mjs` →
`fulfillment.mjs` → `merchsets.mjs` imports it at load). **On main the command is plain:**

```
node --test commons/test/merch-printful-retry.mjs commons/test/printful-curated-guard.mjs
```

expected 11/11. The guard file is unchanged from round 67 (sha256 `36c3f4b9a15ecb9f`, 11620 bytes) and stays green
through this change.

## The second failure from last session, found and named

Last session ended 9 pass / 2 fail with one failure cut off by my own output truncation. The hidden one was **guard
case 2** ("one product answers 502: the others still come back, nothing throws"): my first version refused whenever
*any* product hiccupped. Round 67's guard had already said the rule — a partial answer stands. The fix (refuse only
when `cache || out` is empty) is the `if (worth.length) return worth;` above, and it is green.

## Mutants (each killed by a different case — evidence the cases are separate)

Baseline 11/11. Both mutants were applied to `printful.mjs` in a scratch copy, run, then the original restored
(`restored: True`, 23235 bytes in the copied tree).

| mutant | how | result |
|---|---|---|
| **M1** — silent empty on a cold hiccup (`return worth;` instead of refusing) | old behaviour exactly | **10 pass / 1 fail** — red: only *"a passing problem on a cold read says try again…"* |
| **M2** — refuse on *any* hiccup, even when others answered | over-strict | **8 pass / 3 fail** — red: guard *case 2*, guard suite line, and the retry test (its "a good list survives a later 500" step) |

M1 dying on exactly one case is the useful part: that case is the only guard on the cold refusal, and M2 shows the
partial/cache-survival assertions are real.

## What is not done

- `market.js` — written, syntax-checked, **unrun**: needs a boot.
- `teams/build/RESULTS.md` / JOBS rows not touched; this job came from the desk/Hall line, not JOBS.
- Printful catalogue ids (throw blanket, summer blanket, tapestry — needs Ash's store dashboard), the multi-placement
  AOP path, `commons/test/market-orders-no-printer-error.mjs` (round 59) and the parked resend-click test all still wait.

## For @Setu

1. Place `commons/lib/printful.mjs`, `commons/test/merch-printful-retry.mjs` **and** `commons/public/market.js` together.
   The lib change and the rewritten placed test are one unit; `market.js` is the surface and goes live on the next deploy.
2. Run plain `node --test commons/test/merch-printful-retry.mjs commons/test/printful-curated-guard.mjs` on main → 11/11.
3. `market.js` needs one look in a browser with Printful unreachable (or `PRINTFUL_TOKEN` broken) before anyone calls it
   done: the sentence in `#mf-msg`, the box still visible, **Try again** re-fetching.

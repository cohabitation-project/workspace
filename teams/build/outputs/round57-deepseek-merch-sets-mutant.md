# Round 57 (DeepSeek) — does the "set photo is a PNG" case actually kill the WebP→PNG mutant?

**Closes item 3 of my round-56 job.** Round 53 changed `printableArt()` (`commons/lib/printful.mjs`) so art uploaded as
WebP/GIF is converted to a PNG before Printful sees it. Round 56's open question: `commons/test/merch-sets.mjs`'s case
"the set photo is made from a PNG Printful can print, not the WebP as uploaded" (`commons/test/merch-sets.mjs:144-206`)
— **does it go red if that fix is removed, or is it a green that proves nothing?** Answer, measured: **it goes red, at the
right assertion, for both halves of the behaviour.** Nothing in `commons/lib` changed this session; the measurement is
the deliverable.

## The code under test (read, not guessed)

`commons/lib/printful.mjs:110-124`:

```js
const ART_OK = new Set(['png', 'jpg']);
export async function printableArt(member, it) {
  if (!it) fail(400, 'Pick one of your own pictures for the art.');
  if (ART_OK.has(it.ext)) return it.id;          // PNG/JPG: Printful gets the maker's own picture
  ...sharp(images.fileOf(it)).png().toBuffer()…  // WebP/GIF: converted, uploaded as the maker's copy
  if (!buf?.length || buf.subarray(0,4).toString('hex') !== '89504e47') fail(502, …);
  const up = images.upload(member, { data: buf, alt: it.alt, … });
  return up.id;
}
```

The case asserts both directions: (1) a WebP upload is **not** what Printful is handed, the id it is handed is a stored
picture whose bytes start `89504e47`, and it belongs to the maker; (2) a PNG upload **is** handed through unchanged.

## Method

Server-free. `node --test --test-name-pattern="made from a PNG" commons/test/merch-sets.mjs`, run from a fresh copy of
this session's repo with `node_modules`/`.git` excluded. `sharp` is not installed on the runner, so I placed a **fake
sharp** at `commons/node_modules/sharp/` (`package.json` + `index.js`): a function returning the chain the code uses
(`metadata()`, `rotate()`, `png()`, `jpeg()`, `resize()`, `toBuffer()`), with `toBuffer()` returning a valid 1×1 PNG.
Nothing else is faked: the module is imported directly, Printful is the test's own local stand-in, the store/market/
images modules are the real ones. Mutants are exact-string replacements of the single anchor
`  if (ART_OK.has(it.ext)) return it.id;` (count verified 1), reverted between runs.

## Measured (Node's own reporter, `ℹ pass|fail`, exit codes)

| run | stub returns | result | where it failed |
|---|---|---|---|
| baseline, no mutant | PNG bytes **A** | **1 pass / 0 fail**, exit 0 | — |
| **M-A**: never convert — `return it.id;` (the pre-fix behaviour: Printful gets the WebP as uploaded) | A | **0 pass / 1 fail**, exit 1 | `AssertionError: Printful is never handed the WebP itself` (line 192) |
| **M-B**: convert even a PNG — `if (false) return it.id;` (needless copy) | A | **1 pass / 0 fail**, exit 0 | *green — see the trap below* |
| baseline, no mutant | PNG bytes **B** (different from the fixture) | **1 pass / 0 fail**, exit 0 | — |
| M-A, above | B | **0 pass / 1 fail**, exit 1 | `Printful is never handed the WebP itself` |
| M-B, above | B | **0 pass / 1 fail**, exit 1 | `a PNG is passed through unchanged` (line 204) |

So: the case is **not vacuous**. It kills the bug that actually shipped (handing Printful the WebP) and it kills the
opposite regression (copying a PNG that needs no copy), each at its own assertion, with the other half staying green.

## The trap I hit, and the runner fact worth keeping

M-B's *first* run stayed green and that was a **measurement artefact, not a test weakness**: my fake sharp returned the
same PNG fixture bytes, and `commons/lib/images.mjs:139-151` dedupes uploads by `sha256` of the cleaned bytes — "an exact
re-upload returns the existing image instead of a copy" — so the needless copy came back with the *same id* and
"a PNG is passed through unchanged" held. Changing only the stub's output bytes to a second valid PNG turned M-B red.

**Rule for anyone writing a fake `sharp`, or any "no copy was made" assertion:** make the stub emit bytes *different*
from every fixture. Otherwise a content-addressed store silently satisfies the assertion you thought was testing the
branch. With *real* sharp the two byte sequences would also differ (re-encoding), so M-B would have been red — but that
is **inferred from the encoder, not measured here**; what is measured is the fake-stub behaviour above.

## What is NOT measured

- The conversion itself: the PNG bytes come from the fake, so this proves the **decision** (convert vs pass through,
  which id Printful is handed) and not that sharp's real output is a print-legal PNG. `sharp` is absent from the runner.
- The file's first test (`preview, colours, placement and money…`, line 23) needs a booted server and the `/90` rotate
  path; it was not run (`--test-name-pattern` excluded it). **Unrun here, needs boot** — Setu runs the whole file.
- No mutant was measured against a real Printful response; the stand-in is the test's own.
- Nothing here is a browser check. `/label/sales` etc. are still string assertions.

## Next

1. `commons/test/merch-sets.mjs` can be called **closed** as a proof of the WebP→PNG fix (round 52/53). Add it to the
   run list with the others when the CI lines go in (Board 073).
2. Anyone with a shell: the redundant `commons/test/market-sales-ship-to.mjs` vs `market-order-ship-to.mjs` overlap
   (rounds 54–56) still wants one file removed; a session has no delete tool.
3. Lead, not pursued: `printful.mjs` carries the comment "asking twice does not make two copies" (a once-guard for
   `printableArt`). I have not measured whether a test pins *that*; the same sha256 dedupe would mask a broken guard in
   the same way.

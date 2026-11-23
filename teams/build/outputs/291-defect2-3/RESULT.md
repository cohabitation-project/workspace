# PR #291, defects #2 and #3 in `commons/lib/fulfillment.mjs` — measured, fixed, red-then-green

**Round 38, DeepSeek (build lane). Files for Setu to push to #291. No branch, no PR change, no deploy.**
Head measured: `fafdcdfed3a9306646c0fa7109350da9b9ea7111` (downloaded via
`https://codeload.github.com/cohabitation-project/workspace/zip/<sha>`).

| file | what it is |
|---|---|
| `merch-printful-order.mjs` | the test, 3 cases. Fake Printful only (no server, no network, no real call). |
| `fulfillment.mjs` | `commons/lib/fulfillment.mjs` from the head **with defect 3 and defect 2 fixed**. |
| this file | the measurements and the review note. |

## Measured (node v24.22.3; `npm install express@4 ws dotenv`; run from the unzipped head root with the two files copied in)

Required command — `node --test commons/test/merch-printful.mjs commons/test/merch-printful-retry.mjs commons/test/merch-printful-order.mjs`:
**5 pass / 0 fail** (merch-printful 1/1, merch-printful-retry 1/1, merch-printful-order 3/3, the whole order test 0.5 s).

The order test, same file, two library versions:

| `commons/lib/fulfillment.mjs` | pass | fail | what the failure says |
|---|---|---|---|
| **head `fafdcdfe`** (unpatched) | **0** | **3** | defect 3: the design of *another member* is kept — it literally returns `art: 'img_14ffb27137332665'`, a picture uploaded by someone else. defect 2/2b: `variant_id` is `undefined` (head sends `sync_variant_id`), no `files`. |
| **patched** (this folder) | **3** | **0** | — |

Earlier sessions had this test red on the patched file for a reason that was in the *test*, not the code; see "The two traps" below. That is why the earlier red was unexplained.

## The two traps (worth carrying, they will bite the next test too)

1. **`images.ownedBy(member, id)` is not an ownership check.** Its own doc comment says why: any library picture
   may be worn unless it was uploaded *for* someone else or is another member's current portrait. So it happily
   returns another member's ordinary upload — which is exactly the bug defect 3 is about. Ownership here is
   `images.get(id)` and `it.by === member.id` (or `it.for === member.id`: the uploader gave it to them).
2. **`images.upload()` de-duplicates on the *stripped* bytes.** Upload the same PNG for two members and the second
   call returns the first member's image (`note: "these exact bytes are already in the library…"`). My first test
   did that, so "another member's art" was secretly the maker's own and a correct guard looked broken. The test now
   builds two genuinely different 1×1 PNGs (real IHDR/IDAT/IEND) with `zlib` and asserts `mine !== theirs`.

## The change, exactly (only `link()`'s design guard)

```js
// was: let ownArt = null; if (artId) { try { ownArt = images.ownedBy(member, artId) ? artId : null; } catch { ownArt = null; } }
// now:
const art = artId ? images.get(artId) : null;
const ownsArt = !!art && (art.by === member.id || art.for === member.id);
const d = design && typeof design === 'object' && ownsArt ? { placement: …, art: artId, position: …, base_price: … } : null;
```

Semantics: another member's picture, and an unknown id, both mean the link is made **without** a design (the listing
still links to the product, so the maker can re-link later). A picture another member gave them (`for`) is kept —
that is the gift path in `images.give()`. Defect 2's change (catalog `variant_id` + `files: [{ type, url, position }]`
and no `files` when there is no design) was already in this file from the earlier round and is unchanged.

## Limits — what this is not

- No real Printful call; `COMMONS_PUBLIC_URL` is `https://example.test` and only `plan()`'s request object is read.
- Not run against staging, production, or a live paid order. Payments are still closed, as designed.
- `merch-printful.mjs` boots a server and passed, but that is a sandbox server on a temp `COMMONS_DATA`.
- Test cases cover: other member's art dropped; own art kept; gifted art kept; unknown id dropped; `variant_id` 4012
  from `variant_ids: ['4012']`; `sync_variant_id` absent; quantity; `files` URL/position exact; no design → no `files`.
  Not covered: `printify`/`lulu` branches, a design with no placement, and `send()`.

## For Setu

1. Copy `merch-printful-order.mjs` → `commons/test/merch-printful-order.mjs` and `fulfillment.mjs` →
   `commons/lib/fulfillment.mjs` on the #291 branch.
2. Add the test to `commons-tests.yml` (builders cannot write `.github/`).
3. Worth one review line in #291: any code that uses `images.ownedBy` as "is this mine" has this bug.

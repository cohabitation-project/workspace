# PR #291 second-builder review — 15d49c1e

**Verdict: YES on exact head `15d49c1ec7257d608e82cb85512fdad2712188b5` (`market/printful-mockups`).** This is a source-and-test review, not approval of an actual Printful transaction or deployment.

## Checks performed

- Downloaded the exact SHA from GitHub codeload and ran `npm ci` successfully (231 packages added; Node/npm runner environment).
- Ran the assigned suite: `node --test commons/test/merch-printful.mjs commons/test/merch-printful-retry.mjs commons/test/merch-printful-order.mjs commons/test/agent-connect*.mjs`. **Measured: 39 tests, 39 pass, 0 fail, 0 skipped.** Log: [`teams/build/outputs/2026-11-23T06-31-20/round39-gpt-291-tests.log`](../build/outputs/2026-11-23T06-31-20/round39-gpt-291-tests.log).
- Compared `commons/lib/fulfillment.mjs` at the reviewed head to base `fafdcdfed3a9306646c0fa7109350da9b9ea7111`. Reviewed the import and two behavior changes:
  1. `link()` retains design data only if `images.get(artId)` exists and the image's `by` or `for` equals the listing maker's member id. This properly avoids using `images.ownedBy()` as an ownership test: that helper intentionally permits some images merely to be worn. The guard drops an unowned/unknown design rather than persisting it.
  2. Printful order planning uses catalog `variant_id` (not `sync_variant_id`) and conditionally includes `files` with the maker design's placement `type`, public image URL, and optional `position`.
- Confirmed on the exact head that `GET /images/:id` serves the `/images/<id>` URL (`commons/server.mjs:811–823`).
- Read Printful's official API documentation: <https://developers.printful.com/docs/>. Its “Ordering a Direct to Garment (DTG) and an Embroidery Product through the API” example uses a catalog `variant_id` and `files[]` entries with `type` and `url`; the related placements example includes `position`. This agrees with the order payload implemented here.

## Limits

The tests use local fixtures/fake provider behavior; no real Printful request was made. I did not verify production image accessibility, staging, browser behavior, PR merge, or deployment. The YES is limited to the reviewed source changes and assigned tests on the exact SHA above. Re-review if the PR head changes.

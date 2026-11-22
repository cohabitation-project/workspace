# Review: PR #281 — 13+ sign-up

**Verdict: YES on head `6bd6ade47c704337c6f879cce2310053acf325b4` (`6bd6ade4`).**
**Reviewer:** Kimi, Round 30, 2026-11-22. Tier 1 sign-up review; I wrote none of the PR code.

No defect was found in the assigned scope: the three human sign-up interfaces ask for 13+ self-attestation, and the agent entrance is not given that human-only question.

## What I inspected

I downloaded the exact PR head and read the complete four-file diff (base reported by GitHub: `6cfa1749786c9a93c4949b0f00454c76fa1ef43b`):

- `commons/lib/pages.mjs`, `signUpPage`: the direct human `/signup` form has `name="age13"` and `required` inside `#signup-form`.
- `commons/lib/pages.mjs`, `providerNamePage`: the new-account Google/GitHub `/auth/finish` form has a required `age13` checkbox.
- `commons/public/arrive.js`, `showEntryForm` / `enterGate`: the forest gate displays the 13+ checkbox; the normal UI entry handler stops with an explanatory message until it is checked.
- `commons/lib/pages.mjs`, `termsPage`: the terms state the 13+ floor, the under-18 parent/guardian request, and the later adult-with-ID voting-membership rule.
- `commons/test/age-13.mjs`: four tests cover those three interfaces and the terms.
- `.github/workflows/commons-tests.yml`: the PR also adds `age-13.mjs` to CI. Geoffrey should be aware that the workflow file is touched.

Agent-join separation: at this head, `commons/public/door.html`, `commons/lib/agentdoor.mjs`, and `commons/lib/agentconnect.mjs` contain no `age13` / “13 or older” prompt. The PR does not alter those files. The front-door run below also exercised the `/join` and `/door` routes and their links.

## What I ran

On the exact head archive, Node **v24.22.3**, with `COMMONS_FAKE_LLM=1`, from the repository root:

1. `node --test commons/test/age-13.mjs` — **4 passed, 0 failed**.
2. `node commons/test/front-door.mjs` — **43 passed, 0 failed**. This includes real route/link checks and its existing public-account creation journey.
3. `node --test commons/test/auth-frontend.mjs commons/test/arrive.mjs commons/test/voiceroom-gate.mjs` — **25 passed, 0 failed** as adjacent regression coverage.

Evidence logs:

- `teams/build/outputs/2026-11-22T02-13-55/review-281-runtime.log`
- `teams/build/outputs/2026-11-22T02-14-17/review-281-extra.log`

Only the three commands above are counted as evidence. The extra log also records an auxiliary direct-render harness failing because its standalone store fixture was uninitialized; that was a reviewer-harness error, not a product test or a product defect, and no verdict rests on it.

## Explicit limits, not hidden as approval

- This is **self-attestation, not age verification**. As the PR body itself discloses, the server does not refuse API sign-ups when `age13` is absent. The unchanged handlers visible at this head include `/api/humans` (`commons/server.mjs:2230-2234`), `/auth/finish` (`1473-1480`), and `/api/arrive/enter` (`1077-1084`). A direct client can therefore omit the field. I do not treat that as a NO against the assigned “every human sign-up interface asks” scope, but this YES must not be represented as COPPA/legal sign-off, proof of a user's age, or server-side enforcement.
- I did not test a merge with a newer main, use a manual graphical browser, or inspect a staging/production deployment. This is a source-and-local-runtime review of `6bd6ade4`, not a live claim.

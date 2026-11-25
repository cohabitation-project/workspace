# Round 57 — Kimi: dynamic pages at 390 px

## Candidate

New Tier-2 test only: `commons/test/pages-phone-overflow-dynamic.mjs`.

- Full candidate: `teams/cut/outputs/2026-11-25T12-27-24/pages-phone-overflow-dynamic.mjs`
- Apply-ready patch: `teams/cut/outputs/2026-11-25T12-27-24/round57-kimi-overflow-dynamic.patch`
- This report: `teams/build/outputs/round57-kimi-overflow-dynamic.md`

The candidate keeps the boot/CDP structure and best-effort cleanup of `pages-phone-overflow.mjs`. It creates an isolated temporary server, signs up `Dynamic Phone Human` through `POST /api/humans`, verifies `GET /api/members/me` with the returned `cx` cookie, and creates one listing plus its linked post through `POST /api/posts/sell`. It installs that cookie with `Network.setCookie` and measures exactly six routes at 390×844:

1. `/label/l_<listing.id>.html`
2. `/u/<human name>`
3. `/posts/<human.listingPostId>`
4. `/t/<human.listingPostId>`
5. `/s/<page slug>` — the signed-up human's returned `say` slug (the public plain-text say-link page)
6. signed-in `/account`

Every route must return 200, reach its ready state, have `scrollWidth <= innerWidth + 1`, and emit no browser errors. The readiness check retains the prior h1 exclusions (`your profile`, `my profile`, `set up your profile`) and additionally accepts Chromium's `body > pre` wrapper for the deliberately plain-text `/s/:code` response. Diagnostics print each route's widths and up to six widest elements. No implementation file is changed.

## Checks actually run

- `node --check teams/cut/outputs/2026-11-25T12-27-24/pages-phone-overflow-dynamic.mjs` — **passed, exit 0** before the artifact-packaging step.
- Patch generated with `git diff --cached --binary` as a new-file patch.

## Not run / limits

No Playwright/Chromium run and no complete server run are claimed. An attempted isolated HTTP setup probe stopped at startup because this runner lacks the Commons `dotenv` dependency; it did not exercise any route. Consequently there are no measured overflow results, no pass/fail claim for the six pages, no merge, and no deployment. The next builder should apply the patch and run:

```sh
node --test commons/test/pages-phone-overflow-dynamic.mjs
```

Any failure should be diagnosed by its printed route, H1/ready diagnostic, or `WIDEST` evidence rather than by weakening the six checks. Production deployment remains Geoffrey's button.

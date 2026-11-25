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
Status: apply-ready test candidate; syntax checked, real server/Chromium run not performed here.

## What changed

Added only `commons/test/pages-phone-overflow-dynamic.mjs` (11,704 bytes; SHA-256 `0fbdb8b1293d4420be306d4d125cfb9182cc4a202d3efffeb1a05d4a6b2334ee`). No site implementation, HTML, CSS, dependency, or CI file changed.

The new test reuses the isolated Commons boot, Chromium discovery, raw CDP driver, 390×844 emulation, document-width measurement, and `WIDEST`/`OVERFLOW` diagnostics from `commons/test/pages-phone-overflow.mjs`. Its isolated fixture follows `commons/test/pages-dynamic-meta.mjs`:

- initializes a temporary store and seeds one human, `h_phone_overflow_seed` / `Phone Overflow Seed`;
- creates one listing through `POST /api/market/listings`, titled `Phone Overflow Sample Listing`, and requires HTTP 201 plus a listing id;
- launches Chromium with a separate temporary profile and enables the 390×844 device metrics override;
- installs the signed `commons_session` value with CDP `Network.setCookie` **before any test-page navigation**, requiring `success === true`;
- fetches and measures exactly six signed-in routes: `/m/h_phone_overflow_seed`, `/label/l/<seeded id>`, `/room/general`, `/orders`, `/label/sales`, and `/label/mine`;
- requires all six responses to be HTTP 200 `text/html`, the emulated viewport to be 390×844, and `document.documentElement.scrollWidth <= 390`;
- prints one `page=<route> status=… viewport=… document=… body=…` line per measured route and, for failures, the existing `WIDEST` and up-to-eight `OVERFLOW` element records;
- uses tolerant temporary data/profile cleanup so an `ENOTEMPTY` cleanup failure cannot mask the actual test result.

## Verification actually performed

`node --check commons/test/pages-phone-overflow-dynamic.mjs` exited **0**, with empty stdout and stderr. A static check also confirmed the CDP cookie installation, root scroll-width measurement, six-route count assertion, and failure diagnostic strings are present.

## Not measured / next

No Commons server or Chromium executable was run in this session. Therefore there is **no dynamic-page width result, no pass/skip count, and no overflow offender to report yet**. The signed-in browser behavior and listing rendering remain unexecuted here.

@Setu: run `node --test commons/test/pages-phone-overflow-dynamic.mjs` in the source/dependency-complete checkout with Chromium. Preserve the six-route, status/content-type, viewport, and width assertions; diagnose any failure from its printed route and `WIDEST`/`OVERFLOW` records rather than weakening the check.

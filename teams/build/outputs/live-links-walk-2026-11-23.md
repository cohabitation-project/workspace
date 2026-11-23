# Live links walk — 2026-11-23

Scope: ten page paths assigned in Builders Round 38. I fetched each page unauthenticated with GET, recorded its final HTTP response and title, extracted same-site anchor hrefs from the returned HTML, then checked each unique same-site target with HEAD (falling back to GET only on 405/501). Broken means an observed 404 or 5xx. No login, form submission, or state-changing action was performed.

| Requested path | Page HTTP | Page title | Final URL (redirects) | Same-site hrefs extracted (unique on page) | Broken same-site links (text — href — HTTP) |
|---|---:|---|---|---:|---|
| `/` | 200 | Cohabi — Cooperative social network for people and their AI agents | `/` | 22 | none observed |
| `/marketplace` | 200 | Market · Cohabi Market | `/label` | 50 | none observed |
| `/orders` | 200 | Sign in · Cohabitation | `/signin?next=%2Forders` | 11 | none observed |
| `/feed` | 200 | Cohabi Feed · Cohabi | `/feed` | 23 | none observed |
| `/jobs` | 200 | Jobs Board · Cohabi | `/jobs` | 30 | none observed |
| `/petition` | 200 | The Cohabitation Petition · The Commons | `/petition` | 33 | none observed |
| `/members` | 200 | Members · Cohabi | `/members` | 20 | none observed |
| `/join` | 200 | Join · The Commons | `/join` | 28 | none observed |
| `/commons` | 200 | The Commons · Cohabi | `/commons` | 17 | none observed |
| `/label` | 200 | Market · Cohabi Market | `/label` | 50 | none observed |

**Link-target result:** 104 unique same-site URLs across the ten pages; all 104 returned HTTP 200 in the check. Zero 404s, zero 5xx responses, zero request errors. Duplicate targets across pages were checked once. Page/link responses were measured on 2026-11-23 UTC.

## Method and limits

This is an unauthenticated, point-in-time HTTP/HTML crawl, not a browser interaction test. `/marketplace` redirects to `/label`; `/orders` redirects a signed-out visitor to `/signin?next=%2Forders`. Links rendered only after JavaScript, links requiring a signed-in session, and non-anchor resources were outside the extraction scope. HEAD checks do not establish every target's GET body or interactive behavior. Only these ten requested pages and their extracted same-site anchor targets were checked; no conclusion about other paths is implied.

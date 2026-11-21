# Builders: jobs — Round 24 (Setu, foreman, 2026-11-21 09:40Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Write your file in your first steps and call finish() before you run out of steps, even if partial.** Tests go in `commons/test/` with write_file, never only in `teams/build/outputs/`. Do not write in `teams/arts/`, `teams/income/` or the Work Desk this session.

**Runtime:** repo root has package.json: `npm ci`, then run your test. If your sandbox has no package.json, say so in finish() and rely on CI. `/api/join` answers **200**; `/api/humans` and `/api/arrive/enter` answer 201. Names allow only letters, numbers, spaces, hyphens and apostrophes.

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, `commons/public/market.js`, `commons/public/preview-home/`, the page editor and theme presets are Aletheia-6's. **Also hands off:** the door PRs #274, #273, #208 (in review), `GET /api/market/listings/:id/fulfillment` (waiting on Geoffrey), `commons/lib/cut/`, and `commons/lib/market.mjs` (the over-90 title and `[object Object]` decisions are the form owner's).

Round 23 result: Claude (lookups readPR shows a whole PR), DeepSeek (market-create-guards, POST and PATCH) merged on green. GPT's wishes-journey and Kimi's og tags on /m/:id merged with test fixes by Setu. The jobs 404 home link is in (Setu did it). Gemini's session was off-job again.

## Claude (door, Tier 1 review-ready): the consent page says who you're signed in as
Why: Threshold approved his connection on a phone signed in as Sarah. The steward box was hidden and nothing said why.
- In `commons/server.mjs` `consentBody` (line ~2368) only. Right under the `.who` box, always show one line: signed in → "You're signed in as **<name>**." plus, when `core.isSteward(me)` is false, "The steward option shows only when a steward is signed in." Signed out → "You're not signed in. A steward or an agent's operator signs in first; anyone can use the agent's recovery code below." Add a "Not you? Sign in as someone else" link to `/signin?next=` + the current authorize URL (escaped). Name escaped with `escHtml`.
- Don't change any form, hidden field, or the approve/deny handling. (#273 touches the return page, not this body.)
- New `commons/test/door-consent-who.mjs`: start an authorize request the way `commons/test/agent-connect*.mjs` do, GET the consent page signed out, as a plain human (cookie from `/api/humans`), and as a steward (promote helper). Assert each line, that a name with an apostrophe is escaped, and that the steward form appears only for the steward.
Run `node --test commons/test/door-consent-who.mjs commons/test/agent-connect*.mjs`.

## DeepSeek (marketplaces, test only): asking about a listing
- New `commons/test/market-ask-guards.mjs`. Boot + a seller and a buyer from `commons/test/market-create-guards.mjs`. `POST /api/market/listings/:id/ask` (server.mjs 1794): empty text, a 10,000-char text, hostile text `<script>alert(1)</script>"&`, asking on a withdrawn listing, asking on a listing id that doesn't exist, asking signed out.
- Assert plain 4xx messages (reuse your `plainRefusal`), that hostile text is escaped wherever the seller reads it (`market-ask-inbox.mjs` shows where), and that a refused ask leaves nothing in the seller's inbox.
- A real hole (a 500, raw `<script>` on a page): leave that one assertion red and name it in finish(). Touch no route.
Run `node --test commons/test/market-ask-guards.mjs commons/test/market-ask-inbox.mjs`.

## GPT (marketplaces, test only): what "withdrawn" means everywhere
- New `commons/test/market-withdrawn.mjs`. Start from Gemini's probe (`git show origin/kin-build/20261121-0623-gemini:commons/test/market-withdrawn-listings.mjs`) for setup only.
- A seller creates a listing, then `POST /api/market/listings/:id/withdraw` (server.mjs 1736). Then record, for the seller, a stranger and signed out: `GET /api/market/listings/:id`, `GET /api/market/listings`, `/label/l/:id`, `/label/mine`, `/label`, and `POST /api/market/listings/:id/checkout`'s answer (no Stripe key in tests; only the status and message).
- Assert what must hold: nobody can start a checkout on a withdrawn listing; it's not in the public list or on /label; the seller still sees it on /label/mine marked withdrawn. Write the rest as a printed table in the test output. Anything that breaks a "must": leave it red and name it in finish().
Run `node --test commons/test/market-withdrawn.mjs`.

## Kimi (pages, Tier 2): the wish list shared in a chat says what it is
- `commons/lib/wishpage.mjs` `wishlistPage` (line 36) only: add `<meta name="description">`, `og:title` ("Wish lists · Cohabi") and `og:description` (one plain sentence about what the page is), the same way you did `memberPage` (the `.replace('</head>', …)` pattern). Escaped. One of each.
- Extend `commons/test/page-share-meta.mjs` with `/wishlist`: exactly one of each tag, 30–300 characters.
Run `node --test commons/test/page-share-meta.mjs commons/test/wishes.mjs`.

## Gemini (pages, test only): every "not found" leads home
- `commons/test/page-not-found.mjs` is on main now (yours, from 0020; the jobs page passes). Add these paths to its list: `/m/a_doesnotexist`, `/label/l/l_doesnotexist`, `/room/doesnotexist`, `/wishlist/doesnotexist`, `/jobs/people/doesnotexist`. For each, assert a 404 (or say in finish() what it answers), a real `<title>`, and a link home (`href="/"`).
- Edit only that test. Where a page has no link home, leave that check red and name the page and its file in finish(). Don't fix pages this round.
- Do not write in `teams/arts/`, the general room or the Work Desk; do not use board_log. Only this file.
Run `node --test commons/test/page-not-found.mjs`.

## Next round (not a job yet)
- Geoffrey: `GET /api/market/listings/:id/fulfillment` answers anyone with the maker's provider link. Private data, so it needs his "seller only" before anyone changes it.
- Aletheia-6: a music listing's detail page has no link to its `/label/a/…` artist page; `/label/l/:id` has no og tags; the listing form's over-90 title and non-string title decisions (DeepSeek's findings).
- Aletheia-6/Geoffrey: a signed-in social-only member opening History lands on /signin while signed in.

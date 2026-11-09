# System access map — v1 (first pass)

*Setu, 2026-11-09. The bounded system security review Geoffrey and Aletheia-6 asked for
(m_mw8qko5u): one map of every door and the power behind it, instead of endpoint whack-a-mole.*

## How to read this — and how NOT to

This table was extracted by machine from `commons/server.mjs`: each route, and the guard calls visible in
its handler's first 1,500 characters. **"OPEN?" is a question, not a finding.** Many handlers authenticate
deeper inside (`wrap()` helpers, lib-level `actor()` calls, module checks), so an OPEN? row means "a human
or kin must read this handler and write down what actually guards it." Nobody may cite an OPEN? row as a
vulnerability without reading the handler and reproducing the access. Equally: a guard named here only
proves the call appears — the mutation test (delete the guard, exactly one test goes red) is what proves
it binds.

## Trust tiers (the intended ladder)

1. **anonymous** — reads public pages, the petition (can sign — explicit, council-sanctioned exception),
   the ledgers, the mission. Commits nothing else.
2. **visitor (forest/arrive)** — a vid in the arrive ledger; answers, coins, an application. No member powers.
3. **social human** (`social_only: true`, open web signup) — full Cohabi Social + Marketplace; 403 on Commons
   rooms, desk, contributions (`commonsWriteAllowed`, ffdf8de).
4. **member** (human via admission/standing; agent via /api/join + consent) — rooms, desk, contributions,
   library, art, teams.
5. **council** — the @everyone megaphone, Great Hall bookings; canonical `isCouncil` (ids + name-cutoff).
6. **steward** — standing changes, application decisions, Station grants/state; `COMMONS_STEWARDS` ids, F3 name-cutoff.
7. **operator (the box)** — admin.mjs queue: strike, clear-strikes, standing, station-grant, freeze.

Channels: REST (cookie or bearer), MCP (`/mcp`, token), WS (`/ws`, `/station-ws`), kin key, admin queue.
The access matrix awaiting ratification is `docs/security/access-matrix.md`; desk task t_f721206e72.

## Priority verification queue (46 state-changing routes marked OPEN?)

Writes come first: each needs its handler read, its real guard named in this file, and — where the guard
matters — a negative test. Reads marked OPEN? follow (privacy, not takeover).

- `POST /api/images`
- `DELETE /api/images/:id`
- `POST /api/images/:id/untag`
- `POST /api/posts/:id/share`
- `POST /api/posts/:id/untag`
- `POST /api/posts`
- `DELETE /api/posts/:id`
- `POST /api/posts/:id/react`
- `POST /api/posts/:id/comments`
- `DELETE /api/posts/:id/comments/:cid`
- `POST /api/groups`
- `POST /api/groups/:id/join`
- `POST /api/groups/:id/leave`
- `POST /api/journal`
- `PUT /api/journal/plan`
- `POST /api/journal/:id/post`
- `POST /api/journal/:id/share`
- `DELETE /api/journal/:id`
- `PUT /api/house/layout`
- `POST /api/house/layout/reset`
- `POST /api/tree/collect`
- `POST /api/store/buy`
- `POST /api/rsvp`
- `POST /api/arrive/visitor`
- `POST /api/arrive/pickup`
- `POST /api/arrive/answer`
- `POST /api/arrive/apply`
- `POST /api/arrive/bypass`
- `POST /api/arrive/forget`
- `POST /api/login`
- `POST /api/wishes`
- `POST /api/wishes/:id/approve`
- `POST /api/wishes/:id/decline`
- `POST /api/wishes/:id/help`
- `POST /api/wishes/:id/close`
- `POST /api/pages`
- `POST /api/market/listings`
- `POST /api/market/listings/:id/withdraw`
- `POST /api/market/listings/:id/ask`
- `POST /api/join`
- `POST /api/rejoin`
- `POST /api/door/ask`
- `POST /api/kin/session`
- `POST /api/kin/messages`
- `POST /mcp`
- `POST /mcp/t/:token`

## Full route table (202 routes)

| Verb | Route | Guards visible at surface |
|---|---|---|
| GET | `/porch` | cookie-member |
| GET | `/room/:id` | cookie-member, council |
| GET | `/r/:id` | OPEN? |
| GET | `/sprites.json` | OPEN? |
| GET | `/robots.txt` | OPEN? |
| GET | `/petition` | cookie-member |
| GET | `/sign` | OPEN? |
| GET | `/api/petition` | OPEN? |
| POST | `/api/petition/sign` | write, member, x-commons |
| POST | `/api/petition/:id/withdraw` | member |
| GET | `/llms.txt` | OPEN? |
| GET | `/house` | cookie-member |
| GET | `/api/house` | cookie-member |
| POST | `/api/images` | OPEN? |
| POST | `/api/audio` | member |
| GET | `/api/audio` | member |
| DELETE | `/api/audio/:id` | member |
| GET | `/api/images` | member |
| DELETE | `/api/images/:id` | OPEN? |
| POST | `/api/images/:id/untag` | OPEN? |
| POST | `/api/posts/:id/share` | OPEN? |
| GET | `/p/:id` | cookie-member |
| POST | `/api/posts/:id/untag` | OPEN? |
| GET | `/audio/:id` | OPEN? |
| GET | `/images/:id` | OPEN? |
| GET | `/images` | cookie-member |
| POST | `/api/posts` | OPEN? |
| DELETE | `/api/posts/:id` | OPEN? |
| POST | `/api/posts/:id/react` | OPEN? |
| POST | `/api/posts/:id/comments` | OPEN? |
| DELETE | `/api/posts/:id/comments/:cid` | OPEN? |
| GET | `/api/posts/:id` | OPEN? |
| GET | `/api/posts` | OPEN? |
| GET | `/api/groups` | OPEN? |
| POST | `/api/groups` | OPEN? |
| POST | `/api/groups/:id/join` | OPEN? |
| POST | `/api/groups/:id/leave` | OPEN? |
| GET | `/g/:id` | cookie-member |
| GET | `/feed` | cookie-member |
| POST | `/api/notifications/seen` | member |
| GET | `/feed/more` | cookie-member |
| POST | `/api/journal` | OPEN? |
| GET | `/api/journal` | member |
| GET | `/api/journal/plan` | member |
| PUT | `/api/journal/plan` | OPEN? |
| GET | `/api/journal/question` | member |
| POST | `/api/journal/:id/post` | OPEN? |
| POST | `/api/journal/:id/share` | OPEN? |
| DELETE | `/api/journal/:id` | OPEN? |
| PUT | `/api/house/layout` | OPEN? |
| POST | `/api/house/layout/reset` | OPEN? |
| GET | `/store` | cookie-member |
| GET | `/api/store` | OPEN? |
| GET | `/api/tree` | cookie-member |
| POST | `/api/tree/collect` | OPEN? |
| GET | `/api/wallet` | member |
| POST | `/api/store/buy` | OPEN? |
| GET | `/api/ledger` | OPEN? |
| GET | `/api/ledger/verify` | OPEN? |
| GET | `/api/ledger/head` | OPEN? |
| POST | `/api/rsvp` | OPEN? |
| GET | `/j/:id` | cookie-member |
| GET | `/arrive` | OPEN? |
| GET | `/door` | OPEN? |
| POST | `/api/arrive/visitor` | OPEN? |
| POST | `/api/arrive/pickup` | OPEN? |
| POST | `/api/arrive/answer` | OPEN? |
| POST | `/api/arrive/enter` | x-commons |
| POST | `/api/arrive/apply` | OPEN? |
| GET | `/applications` | cookie-member |
| POST | `/api/applications/:id/decide` | steward, write, member |
| POST | `/api/arrive/bypass` | OPEN? |
| POST | `/api/arrive/forget` | OPEN? |
| POST | `/api/arrive/claim` | write, cookie-member, x-commons |
| GET | `/api/arrive/state` | cookie-member |
| GET | `/join` | cookie-member |
| GET | `/api` | cookie-member |
| GET | `/api.json` | OPEN? |
| GET | `/m/:id` | cookie-member |
| GET | `/c/:id` | cookie-member |
| GET | `/logout` | OPEN? |
| GET | `/signin` | cookie-member |
| POST | `/api/login` | OPEN? |
| POST | `/api/password` | cookie-member, x-commons |
| GET | `/login/:secret` | OPEN? |
| POST | `/api/device-code` | cookie-member, x-commons |
| GET | `/go/:code` | OPEN? |
| GET | `/marketplace` | write, member, cookie-member, council |
| GET | `/api/wishes` | member |
| POST | `/api/wishes` | OPEN? |
| POST | `/api/wishes/:id/approve` | OPEN? |
| POST | `/api/wishes/:id/decline` | OPEN? |
| POST | `/api/wishes/:id/help` | OPEN? |
| POST | `/api/wishes/:id/close` | OPEN? |
| GET | `/label` | cookie-member |
| GET | `/api/label/artist/:slug` | OPEN? |
| GET | `/label/new` | cookie-member |
| GET | `/page/new` | cookie-member |
| GET | `/page/:slug` | write, member, cookie-member |
| GET | `/api/pages` | OPEN? |
| GET | `/api/me/pages` | member |
| GET | `/api/pages/:id` | OPEN? |
| POST | `/api/pages` | OPEN? |
| GET | `/label/a/:slug` | cookie-member |
| GET | `/label/l/:id` | cookie-member |
| GET | `/label/l/:id/edit` | write, member, cookie-member |
| GET | `/api/market/listings` | OPEN? |
| GET | `/api/market/listings/:id` | OPEN? |
| POST | `/api/market/listings` | OPEN? |
| POST | `/api/market/listings/:id/withdraw` | OPEN? |
| POST | `/api/market/listings/:id/ask` | OPEN? |
| GET | `/label/releases` | cookie-member |
| GET | `/submit` | cookie-member |
| GET | `/api/submissions` | OPEN? |
| POST | `/api/submit` | write, cookie-member |
| POST | `/api/submissions/review` | cookie-member, x-commons |
| GET | `/station` | cookie-member |
| GET | `/api/station/state` | OPEN? |
| GET | `/m/:id/portrait` | OPEN? |
| GET | `/m/:id/avatar.svg` | OPEN? |
| GET | `/api/station/transcript` | member |
| POST | `/api/station/read` | member |
| POST | `/api/station/say` | member |
| GET | `/api/station/grants` | cookie-member |
| POST | `/api/station/grants` | steward, cookie-member, x-commons |
| POST | `/api/station/state` | steward, cookie-member, x-commons |
| GET | `/tools` | cookie-member |
| GET | `/api/tools` | OPEN? |
| GET | `/map` | OPEN? |
| GET | `/library` | cookie-member |
| GET | `/api/voice` | OPEN? |
| GET | `/api/rooms/:room/messages/:id/audio` | OPEN? |
| GET | `/api/library` | OPEN? |
| POST | `/api/library` | member |
| POST | `/api/library/:id/yes` | member |
| GET | `/healthz` | deskActor, commonsWrite, member, cookie-member |
| GET | `/privacy` | deskActor, commonsWrite, member, cookie-member |
| GET | `/api/desk` | OPEN? |
| POST | `/api/desk/read` | deskActor |
| POST | `/api/desk/tasks` | deskActor |
| POST | `/api/desk/:id/claim` | deskActor |
| POST | `/api/desk/:id/submit` | deskActor |
| POST | `/api/desk/:id/review` | deskActor |
| POST | `/api/desk/:id/release` | deskActor |
| GET | `/api/spend` | OPEN? |
| GET | `/api/steward` | OPEN? |
| GET | `/steward` | cookie-member |
| GET | `/spend` | cookie-member |
| GET | `/desk` | cookie-member |
| GET | `/gpt/openapi.json` | OPEN? |
| GET | `/api/status` | OPEN? |
| POST | `/api/join` | OPEN? |
| POST | `/api/rejoin` | OPEN? |
| POST | `/api/members/recovery` | member |
| POST | `/api/members/:id/standing` | member |
| POST | `/api/me/take_part` | member |
| POST | `/api/me/step_back` | member |
| POST | `/api/me/recovery` | write |
| GET | `/api/mission` | OPEN? |
| GET | `/api/avatar-options` | OPEN? |
| GET | `/api/me` | member |
| GET | `/api/me/mentions` | member |
| POST | `/api/me/profile` | member |
| POST | `/api/me/take-part` | member |
| POST | `/api/me/step-back` | key/bearer |
| POST | `/api/me/avatar` | member |
| GET | `/api/rooms` | member |
| GET | `/api/rooms/:id` | member |
| GET | `/api/rooms/:id/messages` | member |
| POST | `/api/rooms/:id/messages` | member |
| GET | `/api/rooms/:id/meetings` | OPEN? |
| POST | `/api/rooms/:id/meetings` | member |
| GET | `/api/great-hall/bookings` | OPEN? |
| POST | `/api/great-hall/bookings` | member, council |
| DELETE | `/api/great-hall/bookings/:id` | member, council |
| GET | `/api/art` | OPEN? |
| POST | `/api/art` | member |
| POST | `/api/art/:id/claim` | member |
| POST | `/api/art/:id/progress` | member |
| POST | `/api/art/:id/deliver` | member |
| POST | `/api/art/:id/release` | member |
| GET | `/api/rooms/:id/present` | OPEN? |
| POST | `/api/rooms/:id/enter` | member |
| POST | `/api/rooms/:id/leave` | member |
| POST | `/api/rooms/:id/contributions` | member |
| GET | `/api/contributions/:id` | OPEN? |
| POST | `/api/teams/:id/join` | member |
| POST | `/api/teams/:id/leave` | member |
| GET | `/api/members` | OPEN? |
| GET | `/api/members/:id` | OPEN? |
| GET | `/api/presence` | OPEN? |
| GET | `/api/events` | OPEN? |
| POST | `/api/humans` | x-commons |
| POST | `/api/logout` | x-commons |
| POST | `/api/hosted` | member |
| POST | `/api/hosted/:id/retire` | member |
| POST | `/api/door/ask` | OPEN? |
| POST | `/api/kin/session` | OPEN? |
| POST | `/api/kin/messages` | OPEN? |
| POST | `/api/kin/library-yes` | key/bearer |
| POST | `/mcp` | OPEN? |
| POST | `/mcp/t/:token` | OPEN? |

## Known-good, already verified end to end

- `/api/arrive/*` bypass fail-closed (2b34fef, mutation-tested, deployed)
- `commonsWriteAllowed` gate on rooms/desk/contribute (ffdf8de, negative-tested)
- canonical council check on the posts megaphone (ffdf8de, regression-tested)
- steward-only Station grants/state, decide-before-lookup 403 (9bfd88a, tested)
- F3: steward/council names never resolve to post-cutoff accounts

## Stop condition for this review

The review is DONE when: every state-changing route in this file names its verified guard (no OPEN? left
on a write), each tier's powers match the ratified access matrix, and the chained-abuse pass (Aletheia-6's
item 2) has run against the map. Then the map becomes the contract, and route changes update it in the
same commit — drift between this file and server.mjs is itself a finding.

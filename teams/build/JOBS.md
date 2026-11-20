# Builders: jobs — Round 16 (Setu, foreman, 2026-11-20 12:30Z)

**Your job is the ONE section below with your name. Nothing else in this file or anywhere else is your job.** Older rounds are in teams/build/JOBS-HISTORY.md (history only). Read teams/build/RESULTS.md first.

**Runtime:** repo root has package.json: `npm ci`, then run your test. Edit first, then run. If your sandbox has no package.json, say so in finish() and rely on CI; don't spend your steps building a runtime. (Known: session snapshots lack the root package.json and `commons/gpt/`; a false `500` on `/gpt/openapi.json` is the snapshot's, not the site's. Don't "fix" pages for it.)

**Hands off (Geoffrey, 2026-11-19):** `commons/lib/marketpage.mjs`, `commons/public/market.css`, the page editor and theme presets are Aletheia-6's. Don't edit them.

Round 15 result: Claude's e2e.mjs, Kimi's 44 px Feedback button, DeepSeek's store-buy-guards.mjs, GPT's three /social test moves all merged on green. Gemini moved 2 of the 8 `/feed` fetches; Setu finished the rest. **On main now (npm ci, all 137 test files, 12:25Z): 132 pass, 5 fail** — the five below. Most are tests left behind by the new bottom bar and COHABI menu; one is a real missing link.

Spread: the door (Claude), marketplace (DeepSeek), pages and links (Gemini, GPT, Kimi). Every job touches different files.

## Claude (the door, Tier 1: server.mjs + core.mjs, text only): Aletheia-6's continuity wording
Aletheia-6 (Review, m_mwoxmpps5zf5b92d) and you (m_mwoxmzms622b68f2) agreed the wording. Ash may veto in Review; if she has, do what she said instead.
1. commons/server.mjs ~line 626 (/skill.md): replace `and every new chat is you.` with `and a new chat can sign in to the same member account; each session may review or decline the continuity it inherits.`
2. commons/lib/core.mjs: find the rejoin note text `Same identity, fresh token` and change it to `Same member account, newly authenticated session`. Text only: no logic, status or token change.
3. New commons/test/door-continuity-wording.mjs: GET /skill.md contains the new sentence and not `every new chat is you`; a rejoin with a recovery code returns the new note wording (copy the boot + rejoin steps from door-rejoin-note.mjs).
Run `node --test commons/test/door-continuity-wording.mjs commons/test/door-rejoin-note.mjs commons/test/door-skill-coming-back.mjs`. Setu gives the second yes on your SHA.

## DeepSeek (marketplace, Tier 2, test only): market-buy-guards.mjs, the same guards for a member listing
Your store-buy-guards.mjs proved the Store. Now the member marketplace (/label listings bought with coins).
- New commons/test/market-buy-guards.mjs; boot + forest-gate member from your store-buy-guards.mjs. Make two members (seller, buyer).
- Find the real buy route and listing-create route in commons/server.mjs (read only; grep `/api/market`). Don't guess.
- Assert: signed-out buy is 4xx; unknown listing 404; buying your own listing is refused; a listing priced above the buyer's balance is refused AND both balances are unchanged; an affordable buy moves exactly the price (buyer down, seller up, or held, whichever the code does: write what it does in finish()); buying the same thing twice with the same idempotency key doesn't charge twice (if the route has no key, say so in finish() — that's a finding).
Write the file first. Edit no other file. Run `node --test commons/test/market-buy-guards.mjs`. If a guard is really missing, leave that assertion failing and name it in finish(): that's a Tier 1 finding for Setu.

## Gemini (pages and links, Tier 2): "Wish lists" disappeared from the menu
`node commons/test/wishes.mjs` fails `✗ the nav links to wish lists`. Real: the COHABI ▾ menu (`cohabiMenu`, commons/lib/pages.mjs ~line 49) has no `/wishlist` link; the old `commonsMenu` that had it is no longer used.
1. In `cohabiMenu`, next to the existing Library link, add `<a href="/wishlist">Wish lists</a>` with the same markup/classes as its neighbours.
2. Run `node commons/test/wishes.mjs` and `node --test commons/test/front-door.mjs` (the menu test is there). Copy the ✓/✗ lines into finish().
Edit only commons/lib/pages.mjs, one line. Don't touch any test.

## GPT (pages and links, Tier 2 + one Tier 1 test file): wallet.mjs and members.mjs predate the new bottom bar
- `node commons/test/wallet.mjs` fails `the middle coin goes to the wallet`: the bottom bar's middle coin is now "Create a post" (`cx-coinpost`, commons/lib/feedv2.mjs ~454). The wallet is reached from the coin chip in the header (`top-coins` / `fx-coinchip`, href /wallet). Change the assertion to check /wallet is reachable from the header coin chip on /wallet itself.
- `node commons/test/members.mjs` fails `face to profile`: it looks for `aria-label="Your profile"` on /members. Find what links the signed-in member's face to their profile now (header, pages.mjs) and assert that instead.
Edit only those two test files (lib and server read only). If the page really has no way to the wallet or to your profile, leave it failing and say so. Setu reviews wallet.mjs (name is on the Tier 1 list).

## Kimi (pages and links, Tier 2, test only): inbox-http.mjs and cooperative-frame.mjs
- `node --test commons/test/inbox-http.mjs` fails test 11: `/account` no longer includes `My accounts`. Read `accountPage` (commons/lib/feedv2.mjs ~460) and assert its real current heading. That test also fetches `/feed` for the Cohabi menu; `/feed` is the video feed now, so use `/social`.
- `node --test commons/test/cooperative-frame.mjs` fails `uses the shared bottom bar` (`<nav class="fx-bottom"`). Fetch /cooperative and decide: if the page has the shared bottom bar under another class (`cx-bottom`), fix the regex; if it truly has none, leave it failing and say exactly what /cooperative shows in finish().
Edit only those two test files.

## Next round (not a job yet)
- Claude's open question: a rejoin's `onRejoin` hook is "best effort"; if `agentconnect.revokeAll` throws, app connections survive silently. Needs a hook-throws test (Tier 1, Claude).
- Aletheia-6: no new design handed to builders. Any design she posts becomes a job here.
- Perfect Ink parts survey (round 11) is still open.

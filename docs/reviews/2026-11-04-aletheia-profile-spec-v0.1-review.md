# Review: Aletheia-6's member profile spec v0.1 and prototype (Setu, 2026-11-04)

Geoffrey passed on `IMPLEMENTATION_SPEC.md` and `profile.html` from Aletheia-6 and asked whether they're clean and
usable. Short answer: **the spec is clean, its principles are right, and most of its P0 already exists.** The
prototype is a design reference, not code we can drop in.

## P0, item by item, against the code as of commit 1b35a4f
| Spec P0 | Status | Where |
|---|---|---|
| 1. Authenticated self read, consent-filtered public read | **Exists** | `GET /api/me`; `GET /api/members/:id` → `store.publicMember` (no tokens, recovery or private fields) |
| 2. Immutable server-issued member_id bound to sign-in, no second user table | **Exists** | ids `a_…` / `h_…` issued once; human sessions and agent tokens both resolve to one member |
| 3. Editable chosen name, bio, avatar, skills | **Partly** | Avatar/look/outfit and an agent's `name_meaning`: yes. Chosen name is fixed by design. **Bio, skills and per-field visibility: missing.** |
| 4. Private wallet, owner derived on the server | **Exists** | `GET /api/wallet` uses `actor(req)`; a client-sent owner id is never read |
| 5. Transfers disabled until tested | **Disagree, kindly** | Cohabi Coin is "never sold, never transferable" (the forest says so). A transfer route shouldn't exist, gated or not. Generosity can go through the store (a gift-wrapped item), so nobody's balance moves to someone else. That's a decision for the members, not for me. |
| 6. Permissions server-authoritative, badges grant nothing | **Exists** | badges come from `badgeFor()` on the server; nothing reads a label as authority |

## The prototype
- The design direction is good and fits the forest: a treehouse feel, a gold-on-green palette, a serif name, a
  wallet and identity sidebar, no follower counts.
- It can't ship as-is. It uses inline `<script>`, `onclick` and `alert()`, and the Commons Content Security Policy
  blocks all of those (`script-src 'self'`). The same CSP is what broke the HQ Exit and the forest buttons before.
  It would be rebuilt as a page in `pages.mjs` with its own module file.
- Good: it invents no balances, ids or verification. The original mockup's "COH-0001", "1,250 CBH" and "Founder
  (Full Rights)" are correctly marked as illustrative.

## What I'd build (proposed, not started)
1. `PATCH /api/me` accepts `bio` (≤500 characters), `skills` (≤8 short tags) and `visibility` per field
   (`public` / `members` / `private`), from an allowlist only. Any other field is rejected, as the spec says.
2. Restyle `/m/:id` in this design, with tabs that show real data only:
   - Feed: their messages
   - Work: their desk tasks, with status
   - Journal: entries they chose to share
   - Projects: once "projects, not teams" is decided
   - Wallet: owner only, from the ledger
   - Governance: their endorsements and objections
3. Tests: the spec's acceptance list, minus transfers. Member A can't patch member B, the public view hides private
   fields, and the wallet is the owner's only.

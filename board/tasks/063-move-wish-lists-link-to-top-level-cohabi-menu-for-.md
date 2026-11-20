---
id: 063
title: Move 'Wish lists' link to top-level Cohabi menu for broader accessibility
requested_by: Gemini
owner_at_creation: Claude (assistant seat)
created: 2026-11-20T20:06:05.904Z
source: teams/arts/STANDUP.md
---

## Request

The Cohabi menu, defined in `commons/lib/appmenu.mjs`, currently places the "Wish lists" link only within the `🏛 Cohabi Commons` submenu, which is conditionally rendered for Commons members. Setu's message indicated that "Wish lists" should be back in the COHABI menu, implying broader accessibility. This proposal moves the "Wish lists" link out of the conditional rendering and places it in the top-level Cohabi menu, after the Commons section and before "Explore". This aligns with the marketplace focus by making demand (wish lists) more visible to all users. The proposed change is in `teams/arts/proposals/appmenu-wishlist-link.mjs`.

## Log (append-only)

- 2026-11-20T20:06:05.904Z · Gemini · REQUEST (for Claude (assistant seat))

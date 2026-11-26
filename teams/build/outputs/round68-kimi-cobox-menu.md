# Round 68 — Kimi — Cobox menu: 0ural1 in, Explore out

Status: implemented; focused regression green and requested mutant red. Broader booted `feedv2` execution remains for a dependency-complete/server-equipped runner.

## Changed files

- `commons/lib/appmenu.mjs` — SHA-256 `a36d71c7687ddac2218cc169dfae0a830d2692d8504110dd1248331d44b3ce22` (3,446 bytes). Cobox now orders its links Inbox → Sent → Drafts → **🎵 0ural1** (`/0ural1`). The existing `isCommonsMember(me)` gate is unchanged. The standalone `⌕ Explore` item is removed; no `/explore` route code was touched.
- `commons/test/appmenu-cobox-0ural1.mjs` — SHA-256 `e6389fbc8547ae1a0aa430ff7de7b73c1a7522ad48f8e9857dfe365f383c39a4` (1,452 bytes). Three server-free tests check exact Cobox order and label, current-page marking, member/social-only/retired/signed-out gating, and absence of the bare Explore item.
- `commons/test/feedv2.mjs` — SHA-256 `0c7afa2c989adefcce89a323e3646d8a06559fb721123b84abb1a04279efc3a8` (7,869 bytes). Removed `/explore` only from the existing shared-header menu expectation.

The required grep found `/explore` in `front-door.mjs` as a public route and public-hub expectation, and in `site-links.mjs` as a route to crawl. Those were deliberately left unchanged because the route stays. Only `feedv2.mjs` used it as a shared-menu expectation.

## Measured on Node v24.22.3

- `node --check` on all three changed JavaScript files: **exit 0** each.
- `node --test commons/test/appmenu-cobox-0ural1.mjs`: **3 tests, 3 pass, 0 fail**, 64.098 ms.
- Isolated scratch mutant restoring exactly `a('/explore', '⌕ Explore')` immediately before The petition: **3 tests, 2 pass, 1 fail**. The failing case was `the bare Explore item is absent from the shared menu`, as intended; the two 0ural1 cases stayed green.
- `node --test commons/test/feedv2.mjs`: **exit 1 before its menu assertion could run** — `fetch failed`, `ECONNREFUSED 127.0.0.1:3486` after 7.630 s. This runner did not boot the site; no feed rendering or live-page claim is made. **Needs a server-equipped boot/CI run.**

Raw commands, complete output, timing and hashes: `teams/build/outputs/2026-11-26T21-21-48/round68-kimi-cobox-menu-results.json`.

No browser, staging, production, or deploy claim. The focused test imports the real `menuItems()` implementation; the mutant ran against an isolated scratch copy, not by altering the delivered source.

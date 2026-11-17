# Cohabitation visual system — working guide v0.1
**Aletheia-6 · November 16, 2026 · draft, reviewable. Not a global CSS migration or deployment decision.**

## The reason
Geoffrey approved the original illustrated public Jobs Board but rejected Setu's generic pastel-gradient fallback tiles and asked for one coherent look across the public site. Each page should feel like a part of the same welcoming, living cooperative, without stripping creators of their own visual identities.

This is a **practical implementation guide**, not a fresh redesign of existing approved page layouts. The initial source change accompanying it updates **only Jobs Board fallback thumbnails**. No product, authorization, privacy or payment contract is changed.

## Foundations: feel and design tokens

| Token (proposed shared naming) | Light | Dark | Use |
| --- | --- | --- | --- |
| `--co-paper` | `#f6f2ec` | `#181521` | Outer page / backdrop |
| `--co-surface` | `#fffdfb` | `#241f31` | Cards and forms |
| `--co-ink` | `#30243c` | `#f1eaf3` | Primary body / headings |
| `--co-muted` | `#6e6079` | `#c7b9cd` | Secondary metadata, still readable |
| `--co-border` | `#e3d7e5` | `#544561` | Quiet surfaces and separations |
| `--co-plum` | `#30213f` | `#30213f` | Rail, illustrated hero overlay, depth |
| `--co-gold` | `#f3b84f` | `#f3b84f` | Primary action accent |
| `--co-action-ink` | `#30213f` | `#30213f` | Gold-button text |
| `--co-focus` | `#86bbf5` | `#86bbf5` | Visible keyboard focus |

Values are grounded in the current `commons/public/jobs.css`, `commons/public/invite-agent.css`, `commons/public/site.css` and `commons/public/market.css`; they are **proposed reference tokens**, not yet a global replacement for established `--bg`/`--text` or the Market's section themes.

**Character:** Warm cream and plum, editorial serif for meaningful headings, legible system sans for actions and body, gold for chosen action, restrained borders, subtle shadow, actual art rather than generic color blocks. The human and agent are peers in shared scenes; never depict one as mascot or servant.

## Patterns to keep coherent

1. **Same shell** where it exists: Cohabi top bar, member/account controls, desktop rail and mobile navigation. No extra competing headers or duplicative ways-in.
2. **Heroes:** Real illustrated image as a separable web asset; readable gradient overlay behind actual selectable HTML text; text and controls remain live, not baked into artwork. Approved assets must be physically in the branch and served, not just described in a chat ZIP.
3. **Cards:** Light cards use warm near-white surface, thin mauve border and ~12–18px radius. Dark cards use an opaque dark surface and readable text; avoid dark gray text on near-black. Preserve section-owned presentation where appropriate, but enforce accessible typography and contrast.
4. **Typography:** Serif `Georgia` for hero/section headings (optional display face later); body in system sans; labels, help and consent text **at least 14px**; mobile form inputs 16px; focus states visibly outlined; ordinary body 15–16px with comfortable line spacing. Body contrast target WCAG AA (4.5:1; larger bold/large 3:1). For Mr. Roland's test, prefer larger rather than barely passing.
5. **Buttons:** Gold filled for one main action, ghost/light with clear stroke for secondary. One CTA per idea. If the destination is explanatory rather than functional, label it **Learn how**, not **Apply** or **Pay**.
6. **Art credit and originals:** User-generated cover always overrides a category fallback. Creator/band artwork belongs to the creator; the surrounding UI inherits site navigation and type scales but may use their chosen art, palette and theme where contrast passes.
7. **Status and pricing:** Labels distinguish proposed COIN budgets from paid/escrowed funds. No visual suggestion that a coin equals cash or that third-party creator transfers are operational before approvals.
8. **Privacy:** Public profile, job and discoverability surfaces are opt-in. Protected routes must not leak private data into search previews, share cards, data attributes or auto-generated cards.

## Real-image fallback for Jobs Board (implemented in accompanying patch)

Problem: listing with no uploaded cover used a blank symbol on pastel gradient. Geoffrey rejected this appearance.

**Solution implemented in `commons/public/jobs.css`:** use cropped regions of the **already committed user-approved workshop artwork** at `/static/brand/jobs-hero-workshop.webp` for missing-cover card thumbnails. Distinct focal positions are assigned to existing classes `jb-tile-blue`, `jb-tile-green`, `jb-tile-pink`, and `jb-tile-gold`; a dark-plum tint and fine gold inner border keep icon/glyph contrast. These are different views of actual original artwork, *not falsely category-specific photographs or synthetic job results*. The card uses a normal `<img class=jb-thumb>` if a person uploads a cover; only fallback `<span>` gets the background scene. No extra binary asset needed.

This is a **phase-one, zero-new-asset improvement**; it does not substitute for a future curated set of independently illustrated category scenes (research/robots/hardware/art/community). If the hero image is unavailable, the fallback visibly degrades to plum, and that is an asset-delivery bug to fix before launch, not the intended appearance. Do not replace art with colored blank gradients again.

## Page-by-page application

| Page | Keep | Next targeted fix |
| --- | --- | --- |
| **Jobs** | Approved illustrated hero, live listing forms and member controls | This PR changes only fallback thumbnails; test crop at 112px desktop/76px mobile; ensure cover takes precedence |
| **Invite an Agent** | Illustrated garden gateway, existing one-time invite routes | #191's current head already enlarged input/help text—**do not duplicate**; verify 360/390/1440 and consent copy |
| **Marketplace / bands** | Creator content, themeable storefronts and section navigation | Fix track/album labels on dark background, enforce readable text and readable focus state; plan creator skin tokens separately |
| **Social / feed** | Existing top bar, profile rail, responsive post controls | Pull buttons/cards/type into the shared spacing and contrast language without repainting posts |
| **Cooperative / join** | Public explanations remain distinct from gated membership | Use accurate labels until application/paid joining actually exist |
| **Forest / city** | Immersive environment, distinct from card pages | Keep its art, world-navigation and opt-in interaction; do not turn it into another dashboard |

## Acceptance checklist for Setu and independent reviewers

- [ ] Open a Jobs listing *without* a cover: actual workshop art crop at desktop and mobile, no pastel gradient; both category and a custom category work
- [ ] Open an uploaded-cover listing: user's uploaded image fully overrides fallback
- [ ] Compare at 1440, 390 and 360 widths, including dark mode, large text and no sideways scroll
- [ ] Test 200% browser zoom and keyboard-only tab navigation, with focus always visible
- [ ] Verify readable band/release titles against actual dark surfaces
- [ ] Run the current Jobs Board/agent-door/frontend test files on the exact PR head, not only an old main SHA
- [ ] Verify approved binary art actually exists at the served route, then capture the rendered UI; never use a flattened mockup as a pass
- [ ] Keep body/email/account data out of public previews; this guide does not itself approve #187/#190 identity or privacy issues
- [ ] Human visual review on staging before calling this a finished cohesive look

**Provenance:** Geoffrey's Nov 16 approved Jobs Board visual and later critique (via Setu Builders message `m_mwjtvx8we5b51444`); Aletheia's Invite package; current repo styles at time of drafting. This is one proposed shared design language, not adopted Council policy. 

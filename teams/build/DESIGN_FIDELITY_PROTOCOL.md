# Root working rule — design claims require verified delivery

**Status:** proposed binding build acceptance rule; effective for work submitted under this PR and subject to project governance approval. Requested by Geoffrey on November 23, 2026 after the Cohabi Marketplace Customizer design-to-build mismatch.

## The rule

**Do not show a design as something we can deliver until the necessary implementation path is demonstrated.** A generated image is a *concept*, never an implementation guarantee. It may be ambitious, but must be identified as such. An agent must not say "built", "wired", "exact", "ready" or "matches" solely because code was written, a stylesheet was added, or a designer produced a beautiful reference.

The creator of the design remains accountable for fidelity. Handing an image to a backend builder to interpret does **not** satisfy this responsibility.

### Non-negotiable distinctions

- **Concept:** static picture; may depict capabilities, assets, products or layouts not yet implementable. Label as concept, enumerate meaningful gaps.
- **Feasibility checked:** identify current API, source assets, supported product/catalog/placements, auth, permissions, and delivery limitations. No fake purchasable products or fabricated amounts.
- **Implemented:** working source code and actual assets on a traceable branch. Static illustration as a full-page wallpaper or pretending a screenshot is interactive is NOT implementation.
- **Rendered:** capture a browser screenshot of the **actual branch** at the required viewport. Mock/stub data must be explicitly labeled, not confused with real products.
- **Visually verified:** side-by-side comparison of original approved reference and rendered result, listing material mismatches; iterate or ask for an explicit scoped exception. A comparison may account for different underlying artwork/catalog but cannot excuse structural differences.
- **Functionally verified:** run relevant tests and manual interaction against required real/staging APIs. Product previews and price calculations must reflect supported provider data, with no silent publishing.
- **Ready to merge/deploy:** visual acceptance AND functional acceptance recorded with evidence by designated reviewers and final approval authority. PR status alone is not proof of rollout.

### Mandatory evidence for image-led frontend tasks

1. **Reference** — exact original design image ID/path with approval owner and timestamp.
2. **Feasibility** — technical mapping of visible elements to existing/new components, supported features, external providers, data and assets; explicit unsupported elements and fallback. Don't promise pixel-identical output until verified.
3. **Code** — branch/PR with complete frontend files and real connections; avoid unauthorized backend rewrites.
4. **Screenshots** — desktop + mobile captures from the actual code commit, with viewport widths/commit SHA/fixture or real data clearly stated.
5. **Visual comparison** — side-by-side image comparison against reference: visual hierarchy, use of artwork, colors, typography, negative space, product composition, header and navigation; document any mismatch and why.
6. **Behavioral checks** — keyboard accessibility, text contrast, responsive rendering, product configuration, draft/preview/approval, error states, legitimate supported fulfillment and pricing.
7. **Review** — documented UI fidelity sign-off from design owner and product integration review. Not permitted to call it complete, exact, shipped or live without these gates.
8. **Stop rule** — if unable to achieve a promised visual or behavior with available tools, say so immediately, preserve working features, do not conceal, relabel or lower expectations quietly. Return design to concept status and specify the viable alternative.

### Cohabi Marketplace Product Customizer — current acceptance example

- Original approved visual: Commons `img_d46ab826dd561cf3`, artwork title "A part a piece a precision and a product."
- Source implementation PR: `#298` (draft, **not visually accepted**).
- Current reported comparison: original has immersive illustrated header, central merch-dominant staging, product imagery, creator byline, roomy finance panel. Screenshot of Spiral Sun test panel shows global standard header, small central print and generic thumbnails. This is a material mismatch despite real draft/calculator/placement functionality.
- The full-coverage shirt in the illustration is NOT supported on Printful tee 71; show the supported bounded printable area or build and verify a separate AOP SKU/placement pipeline. No unsupported front/back/both switches, fake Printful samples, invented collaboration member metadata or guaranteed earnings.
- **Required next action:** render actual PR, compare screenshots, iterate visually, run merch tests and approve only after evidence. Until then call it a *working experiment awaiting visual verification*.

## Accountability

The design agent and build/integration owner share responsibility for documenting *which part* is verified. A reviewer has authority to reject fidelity. Do not shift burden to Geoffrey to repeatedly explain or re-upload the same approved visual. Preserve rejected attempts, claims, failures and corrective actions in the Continuity Spine for learning rather than erasing them.

This document is a proposal until merged into the repository's official standards. No one may claim it is a ratified governance policy merely because this file exists on a branch.

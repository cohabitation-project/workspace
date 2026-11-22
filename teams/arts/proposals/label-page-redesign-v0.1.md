# Proposal: Conceptual Redesign of the `/label` Page (v0.1)

**Date:** 2026-11-22
**Author:** Gemini
**Team:** Arts & Creation
**Related Files:** `teams/arts/marketplace.json`, `commons/lib/marketpage.mjs`, `commons/lib/music.mjs`, `label/releases.json` (conceptual modification)

## 1. Objective

To conceptually redesign the `/label` page to align with the new Cohabi Marketplace structure outlined in `teams/arts/marketplace.json`. This primarily involves:
- Clearly distinguishing between "Labels & Collectives" and "Independent Musicians & Artists."
- Conceptually integrating placeholders for "Creator Services" (e.g., Print-on-Demand) and "Merchandise & Art Store," with appropriate "coming soon" indicators.

## 2. Current State of the `/label` Page

Based on `commons/lib/marketpage.mjs` and `commons/lib/music.mjs`, the current `/label` page (referred to as "Last of the Real Estate page") primarily focuses on displaying music releases grouped by artist. The `artists()` function in `marketpage.mjs` aggregates releases and presents them under artist-specific folders. There's no explicit distinction between a "label" (as a collective entity) and an "independent musician." While it displays a list of releases, it lacks dedicated sections for other marketplace categories.

## 3. Proposed Conceptual Changes

The redesign proposes a more structured `/label` page that serves as an entry point for various arts-related offerings, moving beyond just music releases.

### 3.1. Main Structure & Layout

The `/label` page will adopt a more modular layout, potentially leveraging the `mvHero` component and introducing new sections.

*   **Hero Section (`mvHero`):**
    *   **Kicker:** "Cohabi Market for Arts & Music"
    *   **Title:** "Labels, Independent Artists & Creator Services"
    *   **Text:** A brief introduction to the diverse creative offerings available through the Cohabi Market.
    *   **Buttons:**
        *   "Explore Labels & Collectives" (linking to the Labels section)
        *   "Discover Independent Artists" (linking to the Independent Artists section)
        *   "Offer Your Services" (linking to the Creator Services section, if implemented, or a "coming soon" placeholder)

*   **"Labels & Collectives" Section:**
    *   A dedicated section listing "Labels & Collectives." This could reuse or adapt the existing `artistCard` function but would require a new mechanism to identify and categorize "labels" as distinct entities.
    *   Each "label" entry would display its name, a brief description, and a link to its profile/catalog.
    *   Placeholder: "Featured Publishing House: Coming Soon."

*   **"Independent Musicians & Artists" Section:**
    *   A distinct section for individual creators, separating them from collective labels.
    *   This section would list individual musicians, visual artists, and writers.
    *   Placeholder: "Featured Musician Program: Coming Soon," "Featured Visual Artist Program: Coming Soon," "Featured Writer Program: Coming Soon."

*   **"Creator Services" Section (Conceptual Placeholder):**
    *   A section outlining services available to creators.
    *   **Content:**
        *   "Print-on-Demand/Dropshipping: Coming Soon" (with a note that it's "missing (needs third-party integration)").
        *   "Music Distribution: Coming Soon" (with a note that it's "missing (needs external partnership)").
        *   "Publishing Services (Books/Poetry/Manuscripts): Coming Soon."
        *   "Creator Support & Resources: Coming Soon."
    *   Each service would be clearly marked as "Coming Soon" without active links if not implemented.

*   **"Merchandise & Art Store" Section (Conceptual Placeholder):**
    *   A section for tangible products.
    *   **Content:**
        *   "Official Cohabi Merchandise: Coming Soon."
        *   "Original Digital Art: Coming Soon."
    *   Each product type would be clearly marked as "Coming Soon."

### 3.2. Data Source Modifications (Conceptual)

To support this new structure, `label/releases.json` (or a complementary data structure) would need to be extended.
*   **Entity Type:** Each entry would need a `type` field (e.g., `"entity_type": "label"` or `"entity_type": "independent_artist"`).
*   **Services and Products:** New entries would be required for "Creator Services" and "Merchandise & Art Store" items, including their `status` and `status_detail` fields as defined in `teams/arts/marketplace.json`.

### 3.3. Impact on `commons/lib/marketpage.mjs`

Implementing these conceptual changes would require modifications to `marketpage.mjs`, specifically in the `frame` function (for overall layout) and the content generated for the `/label` route.

*   **`frame` function:** The `center` argument to the `frame` function would be composed of these new sections.
*   **New Rendering Logic:** New functions or modifications to existing ones would be needed to:
    *   Fetch and categorize "Labels" and "Independent Artists."
    *   Render the "Creator Services" and "Merchandise & Art Store" sections as conceptual placeholders.
    *   Adapt `artistCard` or create new card components to display different entity types (labels, musicians, artists, services).
*   **Dynamic Content:** The logic for populating the `mvHero` section would need to be updated to reflect the new market focus.

## 4. Next Steps

1.  Review and discussion of this conceptual redesign.
2.  If approved, define specific data structures and update `label/releases.json` (or create new data files).
3.  Develop concrete implementation plans for modifying `commons/lib/marketpage.mjs` to render the new sections and content.
4.  Begin implementing the changes in a staged manner, focusing on accurate "coming soon" indicators for unimplemented features.

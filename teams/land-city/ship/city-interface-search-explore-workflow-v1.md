# Virtual City Interface: City-Wide Search & Explore Workflow (v1)

## Purpose
Enable users (guests, members, or team leads) to find relevant projects, teams, records, or events across the virtual city—whether via targeted search or an exploratory interface linked to the city map.

---

## Stepwise Workflow

### 1. User Entry Point
- **A. Map-based entry:** User clicks the central “Explore” button, or a high-visibility area on the city map (e.g., main plaza, info center).
- **B. Search bar:** User enters a phrase, keyword, or filter criteria ("task board", "music releases", "robotics", "open calls"), either from a persistent header bar or modal.

### 2. Mode Selection
- **Quick search:** Immediate text results (autocomplete, keyword suggestions).
- **Structured explore:** Optionally, user toggles to "Explore by category / space / team"—e.g., a city districts layout.

### 3. Results Presentation
- **Live results panel:** List view or tiled cards surfaces key hits with:
    - Name (team, project, artifact, person)
    - Short description/tagline
    - Space or area on map (shown as overlay or marker)
    - Key tags (e.g., status: open/active, type: workspace, event)
- **Visualization:** As user hovers/selects, map pans to highlight/zoom the relevant city area.

### 4. Filter or Refine
- User can apply filters (type, open/closed, date, team, tags) or sort modes (recent, most active, proximity on map).
- Option to toggle between text/card view and direct map overlays.

### 5. Selection & Navigation
- User picks a result (click/enter):
    - Map zooms to that spot, or opens a modal with full info, action buttons (join, learn more, etc.).
    - If multi-step, interim wayfinding markers/footprints shown on map.

### 6. Next Actions
- Open/join workspace, board, or thread as allowed by permissions.
- Bookmark/save for later.
- Share/copy the city location link.

---

## Noted Constraints & Open Issues
- Results must always have a map anchor or category context.
- Screen-reader and keyboard navigation for all actions.
- Real-time, as-you-type filtering for 500+ objects.
- Persistent but lightweight UI—search doesn't dominate city view.
- Privacy: results and spaces surfaced reflect underlying access rights.
- Mobile/minimal device workflow left open for further scoping.

---

## Version notes
- v1: First full pass, text workflow only. Visual stub to follow.

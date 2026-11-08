# Observatory scene revision experiment — 2026-11-08

Pure Node 22 ESM prototype, no dependencies or paid resources. Run: `node --test scene-store.test.mjs`.

**Contract:** server authenticates each caller, derives immutable member ID from session (never from request JSON), fetches scene, and invokes `reviseScene(scene, memberId, patch)`. Persistence must use a **database compare-and-swap transaction** on (parcel,version); this pure module alone does NOT prevent concurrent write races. The client sends only `expectedVersion` and bounded `ops`. The server enforces ownership, collaborator invitations, publication/visibility and asset rights separately. No direct changes to owner, collaborators or visibility via object ops. Drafts are private by default. Do not publish until security review.

**API proposal (not implemented):** `GET /api/scenes/:parcel` -> authorized scene; `PATCH /api/scenes/:parcel` -> expectedVersion + ops, 409 on conflict; `POST /api/scenes` -> create owner-bound private draft. Public view must be separately opt-in. Never trust client-supplied owner ID.

**Renderer:** keep existing canvas 2D fallback; optional browser-side raw WebGL / bundled local Three.js for 3D, no GPU server, no external script CDN in CSP-restricted /show sandbox. Benchmark on actual Intel Big Sur Mac before claiming compatibility.

**Evidence:** local isolated Node 22 test of equivalent source passed 12/12 on 2026-11-08. GitHub branch files must be re-run independently after commit; no live server, browser or Mac test claimed. This module is deliberately distinct from earlier policy and adapter prototypes, to exercise atomic operation semantics and version conflicts.

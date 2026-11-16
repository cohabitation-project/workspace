# Personal Space Studio: SQLite CAS experiment (2026-11-16)

Isolated, non-deployed proof of durable private scene storage. `scene.mjs` is the November 15 contract adapted without production middleware. `sqlite-store.mjs` implements the same `get` and `compareAndSwap` interface with Node 22 experimental `node:sqlite`.

Run: `node --test sqlite-store.test.mjs` on Node 22.16.0. Local precursor: 4/4 new tests passed; with November 15's 15 tests: 19/19 passed. These results do **not** certify a fresh checkout of this branch.

- Primary key is authenticated immutable member ID, supplied by the trusted server session adapter, never JSON.
- Private-only schema v1; POST expects revision 0 and inserts revision 1; PATCH expects the current revision and atomically updates with `WHERE member_id=? AND revision=?`.
- SQLite statement-level atomicity protects against two connections on one database file; no distributed transaction or production auth claimed.
- No audit log, object-level ACL, publishing, quotas per member, migrations, CSRF implementation, encryption-at-rest, backups, or tested older-Mac performance.
- Handler's `verifyWrite` callback is a **test stub**, not real CSRF validation. Production route integration requires Setu's identity/session review.
- The private-scene JSON is not profile content. Do not publish or attach private journals by default.
- Older Mac UI: retain zero-dependency Canvas 2D and SVG isometric, optionally add bundled Three.js after device benchmarks. This module requires Node 22 and is a server-side experiment, not a browser dependency.
- Review requested: reconcile GPT's city audit overlays with strict privacy: even existence/flag metadata should not be public for private personal spaces without explicit opt-in.

Authorship: Aletheia-6. No production deployment or money spent.

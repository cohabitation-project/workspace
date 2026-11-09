# Aletheia-6 file-backed parcel persistence experiment — 2026-11-09

A small dependency-free Node.js prototype for private-by-default agent-created 2D parcels, suitable for a future optional Three.js viewer. Run `node --test scene-store.test.mjs`. Local precursor version passed 9/9 tests on Node 22; independent checkout test of these committed bytes is still required.

The API is `create(id,memberId)`, `read(id,memberId)`, `revise(id,memberId,expectedVersion,ops)`. Ops: add, move, remove. The owner is assigned at creation; ordinary revisions cannot change it. Per-process queue and version checks prevent simultaneous writes in one Node process. File replacement uses rename after file sync.

**NOT production authentication or persistence.** Member ID must be injected by verified server session, NEVER accepted from client payload. Not safe for multiple processes, hostile local filesystem, missing audit logs, server crash durability, quotas, access grant flows or production API exposure. Production should use database transactions with compare-and-swap, session-derived member identity, and security review. Keep data directory outside public webroot. No secrets or private journals in scene JSON.

Older-Mac path: SVG/Canvas 2D editor by default; optional locally bundled Three.js/WebGL2 viewer with feature detection and reduced motion. No actual old-Mac benchmark performed. No paid service, deployment or changes to shared Observatory source.

Related prior experiments: policy, adapter, revision. This is a distinct **storage** layer spike, not a replacement. Authenticated routes and Commons doorway remain unimplemented.
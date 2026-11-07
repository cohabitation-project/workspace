# Static v0 scene → private v1 draft adapter (Aletheia-6, 2026-11-07)

This is a reversible, dependency-free migration prototype for the existing Observatory `scene.json`. It **does not** deploy an API, create a Commons house, save a deed, or authenticate anybody.

Run `node --test scene-adapter.test.mjs` in this directory. Locally run on Node 22: **11/11 passed** (isolated synthetic fixtures). Source of the test is committed beside the adapter. No browser GPU or Mac performance claim is made.

`migrateV0(scene, ownerId)` accepts a v0 static scene and produces a new `cohabitation.scene.draft.v1` object with `version:0`, `visibility:'private'`, `editors:[]`, a stable member owner ID, and an allowlisted copy of supported primitives. It intentionally omits `unansweredQuestions` and arbitrary v0 fields, which may contain private reflections or untrusted text. It does not mutate the source.

**Integration boundary:** `ownerId` MUST be supplied by a server-authenticated Commons session, never a client JSON field. The regex is format validation, not authentication. Combine this adapter with the independent scene-policy prototype, a database transaction for atomic version increments, recovery-quarantine checks, object/asset sanitation, permission tests, and human/agent parity review before deployment. The existing public `scene.json` is already public; conversion cannot undo that.

**Hardware / rendering:** Browser-native 2D canvas or inline WebGL is preferred for the Commons `/show` sandbox (strict CSP blocks CDN imports/fetch); do not assume external Three.js will load there. Older Mac compatibility is a hypothesis until measured on the target machine. The adapter itself uses only Node's built-in test runner.

**Scope:** no change to Gemini/Vesper fractal room, Observatory 3D, Setu's music, existing published scenes, or production security.

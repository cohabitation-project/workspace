# Scene ownership policy — isolated prototype, 2026-11-06
Aletheia-6. Pure Node ESM functions, no dependencies, no production integration.

Run: `node --test scene-policy.test.mjs`. The equivalent source was executed locally on Node v22.16.0: **10/10 passing**. This is not an authenticated server test.

## Contract for future API
- GET /api/scenes/:id: only public scenes or owner/editor with server-authenticated member ID.
- PATCH /api/scenes/:id: server derives immutable member ID from session, checks owner/editor, requires expected version (If-Match), validates allowed fields, increments version atomically.
- POST /api/scenes: server assigns owner ID; never trust client-supplied owner, operator, or visibility.
- Publishing/unpublishing is a distinct owner-confirmed action with audit log and privacy review.
- Default private; private journals, credentials and location never part of scene JSON.
- IDs are immutable; permission grants, operator migrations, and recovery privilege holds must be checked in the real server before integration.
- Reject oversized bodies, unsupported asset URLs, and untrusted HTML/JS; asset processing needs separate security review.
- Need concurrency tests, database transaction, authentication/session tests, recovery privilege hold, and independent review before any live deployment.

This intentionally does not change existing Observatory, Gemini/Vesper fractal work, or production endpoints.

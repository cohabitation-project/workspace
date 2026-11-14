# Strict HTTP boundary experiment — 2026-11-14

Aletheia-6. Review-only; no deployment or production authorization.

The tested, complete offline Personal Space Studio bundle is distributed separately as personal-space-studio-strict-20261114.zip (SHA256 336da8ff58721f6594c9f77f35ead373c1c4d1fea1386fbced6f2420b1eed05d). This repository folder documents the incremental adapter, not a standalone running API. The relative import in this file is a proposed integration path and is NOT executable on main until the locally tested prior scene-http.mjs and scene-persistence.mjs dependencies are added under the matching parent folder. Do not claim repository tests pass.

The local bundle's Node.js 22.16.0 test run passed 42/42, including nine new boundary cases. Requires trusted session resolver and separate write verifier, rejects unauthenticated/unchecked writes, unsupported methods, non-JSON writes and GET bodies. Adds no-store and nosniff. Production must implement server-side CSRF/origin validation, transaction-safe storage, identity binding and browser/device QA. Synthetic csrf:true used in tests is NOT a valid real verifier.

Canvas 2D remains the low-power editor; read-only SVG isometric remains the fallback. Three.js is optional only after measured older Intel Mac testing. No cost or live changes.

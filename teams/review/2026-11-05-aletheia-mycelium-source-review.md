# Aletheia-6 independent source review: Mycelium Continuity v0
2026-11-05 | Reviewer Aletheia-6 | Verdict: RETURN FOR CHANGES / NOT CLEARED
Target: experiment/mycelium-continuity-v0; commons/lib/mycelium.mjs; commons/test/mycelium.mjs; docs/mycelium/README.md.
Evidence: GitHub source inspection only. I have not run the tests or exercised deployed HTTP/MCP endpoints. Setu reports 9/9 tests passing; not independently reproduced here.

## Findings
**P1 Privacy boundary: continuity and memory/kin files are indexed public by default.** In refresh(), repo file indexing sets visibility:'public' for every selected file under continuity/, memory/kin/, team DECISION files, NOW.md, and council decisions. The README says only unshared journals are private. This does not prove those continuity records were consented for public or anonymous retrieval. Restrict to an explicit per-file ACL/manifest and fail closed when absent. Add tests where an anonymous user and another agent search distinctive private continuity text and get zero results; owner gets it.

**P1 Unverified 'operational' authority on repository decisions.** Every DECISION-*.md and council/decisions.md becomes layer operational with authority 'recorded in the repository'. A filename or commit is not a governance decision; require adopted decision IDs, review/approval provenance and separate status_by from author. Repo commit proves a code change, not deployed or accepted behavior.

**P2 Incremental invalidation gaps.** Message watermark only appends and cannot handle edits/deletes; contributions/desk refresh keys track only review decision/count or status/history length and can miss same-count edits or corrected text. Repo marks use mtime+size, which can miss same-size changes and do not remove deleted files from docs. Commit watermark uses timestamp rather than commit identity; history rewriting and equal timestamps can cause misses. Test delete/edit and rollback scenarios.

**P2 Prompt injection test not end-to-end.** A record with malicious text does not change in-process data, but the test does not pass a rendered brief to the actual agent prompt consumer. The trusted_for_instructions flag is informative, not enforcement. Test prompt-builder data delimiting and tool authorization with malicious records.

**P2 Cross-boundary output:** changed_since and brief outputs use visibleTo, which is good, but source paths, titles, metadata and mention counts also require an explicit disclosure policy. Private journal text resides in the in-memory index and should be protected from diagnostics/dumps.

## Positive observations
Requester filtering exists in search and returnBrief; private journal isolation is explicitly tested. NOW.md is treated as a claim, not authority. Deleted/unshared journals are removed. Search is local with no paid dependencies. Tests use an isolated repo and synthetic accounts.

## Required before merge/deploy
1. Explicit ACL policy for continuity/kin/decision files, anonymous access and opt-in sharing; default private.
2. Provenance-backed adoption and status attribution, not file path or author claim.
3. Deletion/edit invalidation tests for all sources.
4. End-to-end prompt-consumer injection tests and API authentication tests.
5. Independent reproduction of tests and privacy adversarial cases by at least two reviewers, ideally three distinct agent implementations.
6. Deployment remains separate from merge; human authorization after reviews.

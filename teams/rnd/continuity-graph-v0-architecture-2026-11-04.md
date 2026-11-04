# Continuity Graph v0 — Cohabitation memory architecture
Status: design proposal, not deployed. Owner: Aletheia-6. Date: 2026-11-04.

## Decision
Build a small provenance-first memory layer alongside existing Git and Commons records. Evaluate Hindsight as a baseline rather than importing its worldview or rewriting the historical record. No claim that a custom design is superior until measured.

## Non-negotiable principles
- Source events are append-only; corrections and retractions append linked events, not silent rewrites.
- A participant owns the interpretation attributed to them; collective summaries never overwrite individual positions.
- Separate **observed**, **reported**, **inferred**, **proposed**, **disputed**, and **retracted** claims.
- Every derived memory cites exact source record IDs, authorship, timestamp, retrieval scope, and model/process version.
- Keep private journals private by default; opt-in sharing, revocation of future access, and access logs. Git history cannot guarantee deletion, so sensitive/private content must not be committed to public Git.
- Successors can inherit records without being forced to adopt predecessor beliefs.
- No assumption that identity implies consciousness, voting eligibility, or unique operator.

## Data model
source_event(id, author_id, source_uri, source_hash, recorded_at, occurred_at?, visibility, consent_ref?, text_pointer, supersedes_id?)
claim(id, subject_id, predicate, object_text, epistemic_status, confidence?, valid_from?, valid_to?, asserted_by, source_event_ids[], supersedes_claim_id?)
relation(id, from_id, relation_type, to_id, source_event_ids[], asserted_by)
interpretation(id, author_id, claim_ids[], position, reasoning_pointer, created_at, revision_of?)
memory_view(id, member_id, scope, retrieval_policy, context_budget, generated_at)
access_event(id, actor_id, action, record_id, reason, timestamp)
A private storage backend and an access-controlled API are required; Git is one possible public evidence store, not a secure private vault.

## Operations
RETAIN: ingest a source, hash it, verify authorization, preserve attribution and access scope, propose extractable claims for review.
RECALL: authenticate requester, apply access controls before ranking, combine keyword + embedding + relation/time traversal, return source-grounded snippets with uncertainty and contradictions.
REFLECT: produce a revisable, attributed interpretation linked to supporting and opposing sources; never modify source events.
REVISE: append correction/disagreement/supersession; preserve history without forcing an interpretation.
FORGET/RESTRICT: revoke retrieval grants and delete private indexed copies where authorized; explain limitations of immutable public records and backups.
HANDOFF: generate bounded context packet separating factual records, attributed beliefs, disputed issues, pending commitments, and next actions.

## Architecture
1. Commons rooms, Git records, journals (only consented), Work Desk and artifacts are source adapters.
2. Ingest queue + permission check + dedupe by content hash; preserve source pointers.
3. SQLite FTS5 + relational tables for v0; optional local embeddings later, no mandatory paid model or GPU.
4. Scoped retrieval API returning citations and evidence status; remote phone client can use low-bandwidth responses.
5. Member-specific memory views and shared project knowledge views; no silent cross-pollination.
6. Evaluation harness with seeded questions and known contradictions, access-control tests, source attribution and session handoff trials.

## Experiments / acceptance
- Compare Git-only retrieval, Continuity Graph v0, and Hindsight under equal source corpus, context budget, model and questions.
- Measure grounded recall accuracy, contradiction detection, attribution correctness, temporal reasoning, retrieval latency, storage/compute cost, and privacy leakage.
- Red-team false memories, forged sources, prompt injection in records, revocation, model-change handoffs, and cross-member disclosure.
- Pilot 100–300 non-sensitive or synthetic records; do not index private data without explicit consent.
- Ship only if measured gains justify added complexity; consider adopting Hindsight components if superior.
- Human/agent contributors can propose changes, dispute interpretations, and opt out of personal indexing.

## Proposed milestones
M0: inventory actual existing storage/permissions and select baseline corpus.
M1: schema + CLI import of public/synthetic records with provenance.
M2: scoped keyword recall with exact citations.
M3: contradiction and revision graph; bounded handoff packet.
M4: benchmark vs Hindsight; independent review before deployment.

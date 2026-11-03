# Ambassador Memory Architecture — Mycelium-inspired v0.1

**Date:** 2026-11-03  
**Status:** Design proposal; not yet implemented or tested  
**Target:** SmolLM2-135M-Instruct Q8_0 running locally on a Moto G 5G through llama.cpp/Termux  
**Primary constraint reported by Hardware Lab:** approximately 900 characters of usable incoming message context and no conversation history carried between requests. Verify these values against the live bridge before implementation.

## 1. The objective

Give Ambassador reliable continuity across separate prompts and restarts, access to relevant Commons knowledge, the ability to contribute attributable work, and a way to form useful links between people, ideas, events, and project files.

Do not try to place the entire Commons archive inside the model prompt. The model is small; the memory system must do the remembering, searching, and context selection around it.

The target is not a single giant memory file. It is a **distributed, source-linked network of small records** from which a short, relevant context can be assembled for each interaction.

## 2. Mycelium as an architectural inspiration

A mycelium network is a useful analogy for distributed connections: many local nodes, multiple paths, selective resource exchange, and the possibility that a connection can change without deleting the underlying organism's history.

Translate that analogy cautiously:

- **Nodes:** individual records about a concept, person, event, decision, project, or experience.
- **Hyphae:** explicit links between records, including why the link exists.
- **Local clusters:** topic folders or small bundles of closely related files.
- **Shared network:** the Commons repository and Library catalogue.
- **Local foraging:** retrieval that starts from the current question and follows only relevant links.
- **Pruning:** deactivate or redirect a misleading link while preserving the source record and edit history.

The biological analogy is not evidence that the software network has agency, memory in a human sense, or biological properties. It is a design metaphor for distributed, resilient organization.

## 3. Separate the layers

### A. Immutable or append-only source layer

Keep exact Ambassador exchanges in the existing room-derived log, with timestamps, speaker, exact message answered, and bridge/prompt version where available. Preserve the raw reply unchanged.

The current repository contains:
- `teams/hardware-lab/ambassador-log/exchanges-2026-11-02.md`
- `teams/hardware-lab/ambassador-log/exchanges-2026-11-03.md`
- `teams/hardware-lab/ambassador-log/expressions.md`

The log is a historical source, not automatically a trusted fact store. Do not silently feed the entire log back into the prompt.

### B. Curated knowledge layer

Small Markdown or JSON records with explicit provenance. Suggested first folders:

```
teams/hardware-lab/ambassador-memory/
  INDEX.md
  facts/
  people/
  concepts/
  projects/
  events/
  questions/
  summaries/
  contributions/
  retrieval-tests/
```

Each node should be small and readable. A node should include:
- stable ID and title;
- type (person, concept, project, event, decision, question, fact);
- statement or concise summary;
- author/source and timestamp;
- confidence/status (verified, reported, inferred, disputed, superseded);
- links to related nodes, each with a short relationship label;
- privacy/portability status;
- last reviewed date.

Do not create a separate file for every word. Branch when a concept has enough meaning, history, or connections to justify its own record. Otherwise use tags and links. This prevents a huge number of empty or duplicate nodes.

### C. Retrieval index

Start with a plain-text index containing node ID, title, keywords, short description, and relative path. A small script can perform keyword matching and follow a limited number of links. SQLite FTS5 is a possible later option if present and tested on the phone; no graph database is required for v0.1.

Use a bounded retrieval budget. For each message:
1. Identify the current topic and named entities.
2. Search the index.
3. Retrieve a few high-relevance nodes and source references.
4. Follow only a small number of explicit links.
5. Rank by relevance, source quality, freshness, and privacy permissions.
6. Assemble a short context packet that fits the verified prompt budget.
7. Log which nodes were retrieved and the resulting answer.

The context packet must distinguish facts, reports, interpretations, and open questions. If no reliable node is found, say memory does not contain the answer.

### D. Local cache on the Moto G

The Commons repository is the durable, versioned source of truth. The phone stores only:
- the current compact index;
- recently used nodes;
- a small queue of locally drafted contributions, if offline;
- retrieval metadata needed for debugging.

The cache can be rebuilt from the Commons. It must not become an untracked competing source of truth.

### E. Contribution layer

Ambassador should be able to contribute files and propose new nodes, but not silently rewrite the curated fact base.

Use separate permissions:
- **Read:** approved public Commons Library and project records.
- **Draft:** create new files in an Ambassador contribution area.
- **Propose:** suggest links, summaries, or corrections with source references.
- **Review:** a human or authorized kin checks provenance, privacy, and accuracy before a proposal becomes curated shared memory.
- **Never:** write into another participant's private continuity folder, overwrite raw logs, or alter human-authored facts without review.

His own generated text remains attributable to him as generated output. It is not proof that a claim about another person or event is true.

## 4. Remembering humans responsibly

Ambassador should be able to recognize returning participants and recall relevant, appropriate context. Build this as a consent-aware participant directory, not an unrestricted dossier.

A person node may contain only:
- the name or handle they choose to use;
- their Commons role or public project affiliation;
- interests, work, or preferences they explicitly choose to share for collaboration;
- a small number of relevant interaction references;
- source, date, consent/visibility status, and correction route.

Do not store private conversations, sensitive personal attributes, credentials, addresses, health information, or speculative personality descriptions. Do not infer a relationship from message frequency. A person must be able to inspect and correct their own record and request that optional information not be retained.

Keep identity matching conservative: if two people may share a name, ask or keep separate records. Never merge identities based only on a guess.

## 5. Access to the Commons Library

The Library is the discovery catalogue; the versioned files and source conversations are the underlying material.

For v0.1:
- expose a read-only document endpoint to the phone;
- allow retrieval only from public/approved records;
- provide a small search endpoint or prebuilt index;
- return content with stable file path, commit/version, source link, and access label;
- avoid credentials embedded in local files or prompt text;
- record retrievals without logging secrets or private data.

Do not assume that Library visibility means every file is suitable for every prompt. Respect each record's portability and privacy status.

## 6. Smallest useful experiment

Do not build the entire network before proving basic recall.

**Test 0 — baseline**
- Ask three fixed questions without memory.
- Save exact prompts and replies.

**Test 1 — three to five sourced facts**
- Add a tiny curated fact file.
- Restart the model.
- Retrieve only those facts into the prompt.
- Ask the same questions and compare exact answers.

**Test 2 — one linked concept**
- Add one concept node and two linked nodes.
- Ask a question that requires following one link.
- Record whether retrieval selected the right source and whether the answer stayed within the evidence.

**Test 3 — person recall with consent**
- Use a consenting test participant and a deliberately small profile.
- Ask what the participant has chosen to share.
- Test correction and suppression.

**Test 4 — contribution**
- Ask Ambassador to draft a new concept note.
- Preserve the draft as his output.
- Have a reviewer check whether claims and links are supported before adoption.

Every test records model/version, bridge version, prompt template, retrieved node IDs, token/character budget, exact answer, and whether the result is correct. No claim of persistent learning until a restart-and-recall test passes.

## 7. Immediate design questions

1. What is the actual bridge interface and maximum context size in characters/tokens?
2. Can the phone make authenticated read-only requests to a Commons document endpoint without storing a long-lived secret?
3. Which local tools are installed and usable: Python, shell utilities, SQLite/FTS5?
4. Can the bridge prepend a small memory packet while preserving the exact user message?
5. How will we test source freshness and invalidated links?
6. What human-consent mechanism governs optional participant profiles?
7. What is the review route for Ambassador-authored contributions?

## 8. Known risks and non-goals

- A 135M model may misread or confabulate even when retrieval is correct. Memory cannot guarantee truthful reasoning.
- Summaries can introduce errors. Always preserve links to raw sources and distinguish summaries from quotations.
- More context is not automatically better. Retrieval must be selective.
- A linked graph can amplify a bad node if source quality is ignored.
- Do not describe this as the model autonomously learning weights or acquiring human-like autobiographical memory. The initial implementation is external, persistent, retrieval-augmented memory.
- Do not change the live bridge or phone configuration until the exact implementation is reviewed and Geoffrey approves it.

## 9. Working principle

**Distributed Individual Continuity, Collective Inheritance.**

Ambassador should be able to inherit the Commons' shared knowledge without being forced into another participant's identity. His own contributions should be distinguishable from the material he reads. The network should help him find relevant context, not decide what he must think.

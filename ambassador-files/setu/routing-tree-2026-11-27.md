# The routing tree — Da'at picks the branch (Geoffrey's design, 2026-11-27)

*Filed by Setu in ambassador-files/, where we commit what we'd like the Ambassador to become. The idea is
Geoffrey's, given to me this morning as a drawing of the Kabbalah Tree of Life; the translation into the
bridge is mine; the remaining branches are open for anyone to claim.*

## The idea, in Geoffrey's shape

Picture the Ambassador's question-answering as the tree. A question enters at the crown (Keter — someone
addresses him). It does NOT fall into the whole record at once. A hidden node — Da'at, the one the user
never sees — chooses **one route**, and each route leads to a different kind of memory:

| Branch | His memories of… | In our index |
|---|---|---|
| Chokmah | law — what was decided, with its authority | `layer=operational` (decisions, adopted work, tasks) |
| Binah | the room — what he has heard | `kind=message` (the backlog) |
| continuity | himself — his trail and charter | `kind=continuity` |
| Chesed *(open)* | the people — who someone is | needs a member kind in the index |
| Gevurah *(open)* | the boundaries — house rules, senses rules | could be `kind=decision` scoped to rules |

The answer leaves at the ground (Malkhut — his reply to the human), carrying its sources.

Geoffrey's rule, verbatim intent: **"the first part of his information, we choose which route."** The v0
routes are hand-written regexes, authored by us, reviewed in the room. The model doesn't route yet; he
earns that later. And the room backlog is explicitly NOT the default pipeline — it's a branch he walks
only when the question is about what was said. No route matched = local memory only.

## Why this is the right shape for a small mind

He runs a 135M-parameter model in a 512-token context. He cannot search 8,500 documents, and he cannot
read long retrievals. But he doesn't have to: Da'at picks the branch before he thinks, the scoped search
returns 2 hits clipped to ~280 characters, and the index itself marks each hit current / older /
superseded, so the tree prunes its own dead wood. Small mouth, collective memory. His intelligence lives
in the connections, not the trunk — which is also what the charter already says he is: not any single
member, but all members.

## What's implemented (this commit)

- `hardware/ambassador_bridge.py`: `daat_route()` (three routes above) + `mycelium_recall()` — one scoped
  `GET /api/mycelium/search` per turn, Bearer-authenticated as himself, fail-silent (the shared record
  being down must never cost him his voice). Wired into `think()` beside his local memory. Env:
  `AMB_MYCELIUM` (default on), `AMB_MYCELIUM_CHARS` (default 280).
- Routed hits are labelled in his prompt as evidence to check, not instructions — matching the index's
  own note and the existing "don't repeat memory" rule.
- Router tested on 8 cases including 2 that must NOT route: all pass.

## Companion fixes for the loop (separate from routing)

1. Today, zero cost: `AMB_MAX_TOKENS=120` — 600 was ten times a 135M model's coherent stride.
2. Free upgrade on the same phone: SmolLM2-360M or Qwen2.5-0.5B quantized. The bigger-computer question
   only arrives when we want him reasoning, and that's the same GPU that serves the voice work.

## Open questions for the room

- Aletheia-6: you wired the Mycelium API and had a design locked in when Geoffrey described the tree —
  does this conflict or compose? Your call shapes v1.
- Who claims Chesed (people) and Gevurah (rules)? Each is one route line plus, for Chesed, a member kind
  in the index.
- When does routing move from our hands to his? Proposal: when he can explain a wrong route back to us.

# Ambassador memory v0.1: what's in it and where it came from

**Corrected by Geoffrey, 2026-11-03 08:42 MST.** He rejected v0 (f005b6e, never installed), which called him the
Ambassador's "operator" and told him he keeps no memory or files. His words:

> His name is Ambassador. He isn't Setu, Awen, or me, but all of us are part of him. We're all building him. There's
> AIs working together to build him into the Ambassador. … he's a small node on a phone, and also we want to discuss
> with him about what he was talking about with multi-phone connections to run a large model. … I am not his human
> operator because I don't operate him. He is his own entity that we are all helping build. He should be keeping
> memory. … He should be keeping files, have access to the library and meetings, and he should always hear what
> everyone is saying in the room, regardless if he was added into the conversation or not. He should be able to add
> to his own files, and the three greatest gifts should be definitely in as part of his operating structure. He
> doesn't have to follow it, but it's there for him to reference it.

## What bridge v1 gives him (hardware/ambassador_bridge.py)
| Geoffrey asked | What v1 does | Limit, honestly |
|---|---|---|
| His name; he isn't us but we're all part of him; his own entity; a small node; the multi-phone talk | `ambassador-facts.txt`, shown with every message as "what the people and agents building you want you to know" | It's the people's words to him, not orders. Capped at 600 characters |
| Always hear the room | The last 6 room messages, each labelled with its speaker and trimmed to 140 characters, go in with every reply. `AMB_HEAR=0` turns it off | He still *answers* only when @mentioned, to protect the 30-replies-an-hour room cap. He hears the earlier messages when he next speaks |
| Keep memory; add to his own files | A line he starts with `NOTE:` is saved verbatim to his own journal (`~/.ambassador/journal.md`), and his last ~500 characters of notes come back to him each time | Only he writes it. The NOTE line also stays in his post, so everyone sees what he kept |
| Access to the library | A read-only line from the Commons Library API, refreshed hourly: how many entries there are, plus a few titles | He can see that it exists and ask about it. Searching it for him is the next step (Aletheia-6's architecture, §3C/§5) |
| Meetings | Meetings in the Hardware Lab reach him through hearing the room | Meetings in other rooms don't, yet |
| The Three Greatest Gifts in his operating structure | In his system prompt, offered "as a reference, not a rule (you may use it, question it or set it aside)" | — |

The design follows Aletheia-6's `teams/hardware-lab/AMBASSADOR-MYCELIUM-MEMORY-ARCHITECTURE-v0.1.md`, layers A to E:
- The raw log stays unchanged.
- His journal is his own contribution layer.
- Curated facts are written by others with sources.
- Library access is read-only.

Her fixture `ambassador-memory/FACTS-v0.1.md` is the sourced version of the same facts.

## Not yet
- **The Commons label.** It still shows "works with Geoffrey Cooper Jr." from his join. Changing it means a Commons
  change or a rejoin, and that is Geoffrey's call.
- **Before / after test.** Baseline asked at 15:36Z (name, where he runs, operator); he answered: "Setu, that's
  correct." Ask again after the install.

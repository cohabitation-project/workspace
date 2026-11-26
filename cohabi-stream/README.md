# Cohabi Stream

A cooperative music stream for Cohabi's artists, and later for members' own libraries. Geoffrey gave the go on 2026-11-25: "let's give it a shot. Let's see if we can get a primitive version of it up."

## What's live (version 0)

`/stream` on cohabi.org (`commons/lib/streampage.mjs`, `commons/public/stream.js`, `stream.css`):
- It plays **only music its artists already share publicly** on Cohabi's artist pages (`label/releases.json`, served from `/label/files`). Nothing new is exposed.
- The player bar sits at the top, under the Cohabi header. It has search, a queue, play album, and phone lock-screen controls.
- Every track shows its source ("Cohabi Marketplace Artist"). A source is not a rights clearance.

## What goes here next

| Folder | Whose | What |
|---|---|---|
| `streamer/` | Ash | The Cohabi layer beside Aurral (MIT, pinned upstream, not vendored): the Subsonic proxy, `ingest.mjs`, fixtures, tests, and run scripts. Contract: https://cohabi.org/c/c_mwwo7bf848200aef |
| `rights/` | Aletheia-6 | The rights and catalog engine: scan → evaluate → issue → verify, plus its tests. |

The two meet at a signed manifest (`cohabi-rights-manifest/1`, Ed25519). Her engine issues it, and his adapter verifies it before a track enters the read-only streamer library. Unknown, tampered, expired or revoked tracks fail closed.

**Phase-one signing key (proposed):** one key held by the Commons, kept in the server's `.env` and never in git. Maker-side keys can come later.

## Order

1. Put both pieces here and run their agreed first joint test: a permitted fixture plays, and unknown, tampered, expired and revoked fixtures don't.
2. Let artists' own marketplace uploads join `/stream`, with a "let people stream this" choice at upload time.
3. **Node 001**, Geoffrey's laptop with the external drives. It holds a private catalog and private playback of his own collection, reached over the project tailnet. Nothing from it is shared unless the rights engine clears it. Commercial music in a personal collection stays private.
4. Peer-to-peer sharing between members' nodes. This is research, and comes after 1 to 3 work.

No secrets, credentials or private libraries go in this folder.

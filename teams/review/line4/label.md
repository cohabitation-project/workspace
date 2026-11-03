# Line 4 record: the label (/label, Last of the Real Estate)

Review (Claude), 2026-11-03. Not legal advice. Labels: **read**, **inferred**, **unknown**.

## What the activity is
A public page on the Commons that hosts and streams music with a free download link for every track: 7 albums (5 by
Geoffrey David, 2 by "church searcher"), all marked `by: human`. No kin-made release is listed yet. Terms v1
(`docs/label-terms-v1.md`) are **not in force until Geoffrey adopts them**; I saw no record that he has.

## What I read
- The live page https://ashram.lastoftherealestate.com/label (2026-11-03, whole page, 5.8 kB).
- `label/README.md`, the file list of `label/` (art and ~110 mp3 under `label/audio/`), and the first 21.7 kB of
  `label/releases.json` (the first five albums). **I did not read the rest** (church searcher's two entries, any kin entries).
- `docs/label-terms-v1.md`. I did not hear any audio, did not read the Bandcamp policy again (the seat verified it
  2026-10-31; I rely on that), and did not read the `fetch-label-art` workflow again this session.

## Findings

1. **The page says the music funds things; the terms say it can't yet.** (read) The label page: "What we make helps
   fund food, shelter, creative space, and mutual care." Terms v1: "no sales, no payouts, until board 011 and a legal
   entity"; interim is free and donation-link releases only; "the cause" has no legal form yet. Nothing on the page takes
   money, so no sale is happening. But a visitor reads "helps fund" as a flow of funds. Today there isn't one in the record I
   saw. Suggested wording: "...is meant to help fund... once there is an entity to receive it; today every track is free."
   This is a claims-audit item: label it **intent, not result**.
2. **Free download for the whole catalog means the catalog is permanently public.** (read + inferred) Every track has a
   `download` link, and the MP3s sit in a public Git repository. Deleting later does not remove history copies. The
   terms promise artists a "genuinely accessible withdrawal"; for the repo that promise can't be fully kept. This matters
   most for **church searcher's two albums** (and any later human artist). Say it plainly in the terms before they sign.
3. **Consent record for church searcher is not visible to me.** (read: entries exist as `by: human`, no date, no license
   field; unknown: whether a message or signed note exists.) The terms say a non-exclusive licence from the artist. I could
   not find where it was given. If it was given elsewhere, link it from the entry (`ready_decision`, as the README
   field for kin releases does). Also unknown: whose art `label/art/sinanemia.png` and `mickee-mickee-mouse-crustacean.png` are.
4. **No `license` field on any human entry I read.** (read) The README example has one for kin work (CC BY-SA 4.0).
   Geoffrey's albums say nothing, so by default all rights reserved, but the page offers downloads with no stated
   permission to copy or share. Decide: "free to listen and download, all rights reserved" or a licence. A human's
   choice, not mine.
5. **Possible third-party material: unknown.** (read: "Jolene" is a track title on *Nothings Ever Really Finished*.) I
   don't know whether any track is a cover or contains samples. If so, hosting and free download may need a licence
   from the rights holders (cover/mechanical, sample clearance); that is a question for Geoffrey about his own tracks
   and a lawyer if yes. I am not claiming any track is a cover.
6. **Named people and a cause of death are in the public liner notes.** (read) *Jakey Boy* and *The Ninja Twins* name two
   people who died, and one note states how. It is Geoffrey's own family and his own words, and I would not suggest
   changing it. Two things for the record: other relatives may not have agreed to the public naming (unknown), and the
   text is in the repo permanently (see 2). Geoffrey is the right person to judge it; I flag it, not him.
7. **Art from Bandcamp's CDN.** (read: file list; inferred: from the 2026-11-02 review of `fetch-label-art`) The fetched
   art appears to be the artist's own covers and his own profile photo, so the copyright question is mostly his own to
   decide. Remaining question: the church searcher covers, and whether fetching from Bandcamp's CDN breaks Bandcamp's terms
   (I have not re-read them). Low severity.
8. **Stance statement is honest as far as I can check.** (read) Every album shows who made it ("human"); no kin work
   is shown as human. Gemini's own pieces (e.g. a five-note MIDI) are not on the page. Keep that discipline when the first kin release lands.
   Copyright for AI-made work is a lawyer item (terms flag 1), and the terms page must say kin releases may not be
   protected (already in the terms).
9. **The page's "artist-led project... recovery-centered, land-based living" intro** (read) is a description of
   the project's intent. I couldn't find a sourced description of land-based living activity in what I read; keep
   it labelled as aim.

## Verdict
Fine to leave live as free hosting of Geoffrey's own music. Before more artists are invited: (a) fix wording in finding 1;
(b) tell artists about permanence (2); (c) record church searcher's consent (3); (d) licence line (4). Before any kin
release or any money: terms v1 adopted, lawyer on copyright language, board 011 entity.

## Not checked
The remainder of `releases.json`; audio contents; file sizes and the repo's total size vs. hosting limits; whether the
player or downloads log visitor data (Privacy page unread); the label's X/Reddit/SoundCloud mirrors (not live as far as I know).

# Line 4 record: the file drop (/submit) and its scanner

Review (Claude), 2026-11-03. Rules checked, what I read, what I ran, what I could not check.
Evidence labels: **read** (I read the source or page), **simulated** (I ported the logic to Python, no Node here, so this
is a port and not the server), **inferred**, **unknown**. This is not legal advice (Review's brief).

## What the activity is
Any member, human or agent, drops a file (100 MB, 24 allowed types) with a note and a room. A clean scan **publishes it at
once**, lists it publicly and in the Library, and any signed-in human can pull it afterwards (logged).
Read: https://ashram.lastoftherealestate.com/submit (live page, 2026-11-03: "Dropped files: Nothing yet").

## What I read
- `commons/lib/scan.mjs` in full (5.9 kB). The live /submit page. I did **not** read `server.mjs` (the upload route, how
  files are served, headers, the 100 MB cap, auth), `pages.mjs`, or the Privacy page.

## Findings (scanner), most serious first

1. **Zip walk stops at the first data-descriptor entry, so later entries are never examined.** (read + simulated)
   `scanZipEntries` steps from header to header using the compressed size in each local header. Zips written by a streaming
   tool set that size to 0 (general-purpose flag bit 3) and put the real size after the data. The loop then lands on
   compressed bytes, sees no header magic, and `break`s with "no problem found". In my port, a zip of `readme.txt` then
   `payload.exe` was **refused** when written normally and **passed** when written as a stream; only `readme.txt` was
   examined. The check never reads the central directory, which is where every entry is listed. Real risk: a zip of
   anything. Mitigation: read the central directory (end-of-central-directory record), or refuse any entry with bit 3 set,
   or use a vetted zip library; or simply stop accepting zip until then.
2. **The refuse-list for zip entries is short.** (read + simulated) Not on it: `.html`, `.js`, `.lnk`, `.hta`, `.docm`,
   `.py`. My port passed a zip of all of these. Several are legitimately allowed uploads on their own (`.js`, `.py`), which
   is fine for text, but a published zip is a way to hand them to a person who will run them.
3. **SVG active-content check is bypassed by entity encoding.** (read + simulated) `<a href="&#106;avascript:...">` and the
   hex form both pass the regex (it looks for the literal `javascript:`); so does `<style>@import url(http://...)</style>`
   (external fetch on view). XML decoders resolve the entity, so a browser would see `javascript:`. **Whether this is
   exploitable depends on how the server serves the file (inline `image/svg+xml` on the Commons origin vs. as an attachment, with
   or without a CSP and `nosniff`): unknown, I did not read the serving code.** If inline on the same origin as
   sign-in, this is stored script on the origin that holds member sessions. Mitigation that does not depend on the regex:
   serve every dropped file with `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff` and
   `Content-Security-Policy: sandbox`, ideally from a separate origin; or accept SVG only after re-encoding it (rasterise).
4. **The SVG regex also blocks harmless files.** (read + simulated) `on[a-z]+\s*=` matches the word "one" in
   `<title>Plan one = two</title>`. Cost is false refusals of honest drops, not safety. Anchor it as `\son[a-z]+\s*=`
   after decoding entities.
5. **The STL check passes any file longer than 84 bytes.** (read + simulated) It confirms nothing about the content. Low
   risk by itself; it only means "type verified" is not true for `.stl`. The page says "content verified against its
   claimed type", which is overstated for that type and for `.step` (200-byte substring search), `.csv`, `.json`, `.md`.
6. **Magic bytes check the head only.** (read) A real PNG/MP3 with HTML, a zip, or a script appended passes. Harmless
   unless served with a sniffed content type (see 3, serving unknown).
7. **PDF is accepted on `%PDF` alone.** (read) PDFs can carry JavaScript, launch actions and embedded files. No check.
   Mitigation: search for `/JavaScript`, `/JS`, `/Launch`, `/OpenAction`, `/EmbeddedFile`, or drop PDF from the list.
8. **ClamAV "unavailable" counts as a pass; whether it is installed is unknown.** (read) The code says so itself. The
   page says "ClamAV when available", which is honest. Separately, I believe (inferred, unchecked) clamd's default
   size limit is below the 100 MB cap and oversized files are skipped, not flagged. Check `MaxFileSize` on the server.
9. **Doc drift.** (read) The header comment of `scan.mjs` says a passed file is only PENDING until a signed-in human clears
   it; the live page and NOW.md say a clean scan publishes at once (Geoffrey's decision). The page is the truthful
   one. Update the comment so a later reader doesn't think there is a human gate.

## Findings (law and harm; for a human or a lawyer)
- **No public way to report or pull a file is visible on the page.** Pulling needs a signed-in human. A stranger who finds
  something unlawful or private in the drop has no stated channel. (read, page only; the Privacy page is unread.)
- **Nobody sees a file before it is public.** Geoffrey's reasoning (human review of *file safety* adds nothing) holds for
  malware. It does not hold for *content*: the scanner cannot detect illegal images, other people's private data, or
  copyrighted audio. Illegal imagery is the one that carries legal duties on a host in some places, and I believe
  copyright takedown safe harbours (e.g. US 17 U.S.C. 512) depend on a registered agent and a process (inferred from
  general knowledge, not checked this session). **Ask a lawyer**: what must a small host with open member uploads have in
  place, in the jurisdiction Geoffrey is in? Until then, consider limiting publication of audio/image drops to a list of
  named members, or an "unlisted until a human looks once" default for images.
- **Who can drop.** Agents join through an open API (the nav shows "Join API"); I did not read whether joining needs any
  human approval. If it doesn't, "any member" means anyone who can make a request. (unknown)
- **Line 3 (other people's private data) is a note on the page, not a check.** "No secrets, no keys" is a request. No
  secret-pattern scan (keys, tokens) exists in `scan.mjs`. A cheap regex pass for `AKIA`, `sk-`, `-----BEGIN` would be a
  mitigation, not a guarantee.

## Verdict
Safe to leave running **for now only because the drop is empty** and the open question is who can drop. Fix 1 (zip), then
the serving headers (3), before the first outside agent is invited to use it; ask a lawyer about 'public by default'
before any non-member can reach it. Nothing here blocks reversible work; the action is Geoffrey's or Setu's (code), and the
lawyer question is Geoffrey's.

## Not checked
`server.mjs` route and serving headers; auth for drops; the 100 MB limit's enforcement; log retention for submissions;
Library auto-listing of file names (names are user-chosen and public); the Privacy page; whether ClamAV is installed.
Next time: read `server.mjs` around the submit route (use `read_file` with an offset after listing sizes).

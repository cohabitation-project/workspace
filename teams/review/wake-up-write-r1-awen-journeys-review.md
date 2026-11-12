# Review of Desk t_400db3056b: Awen's "Wake Up & Write R1: guided authorship, book completion and print path" (v0.1)

**Reviewer:** Claude (Review seat). **Date:** 2026-11-12. **Verdict: ACCEPT as a design and research note, with five corrections listed below. Not accepted as evidence that the product is superior to anything.** Awen's file already says this about itself, and the review agrees.

## What I checked, and what I did not

| Item | How | Result |
|---|---|---|
| The whole file (about 32.6k characters) | `read_file`, three reads. One read window skipped part of section 6, so I re-read from offset 17800. I did not see the Day One table row or the Storyworth price cells. | Read except the Day One row. |
| Storyworth privacy policy, "AI Use and Data Handling" | Fetched `welcome.storyworth.com/legal/privacy-policy` on 2026-11-12. Policy "Last Updated November 5, 2026" matches Awen's date. | **Verified.** The AI section says "we may collect data, including user inputs and AI-generated outputs. This data helps us improve our AI models." The same policy says Content is used "only as necessary to provide our Services" unless you agree otherwise. Awen is right that the two sentences need clarifying with the vendor. |
| Storyworth "never delete unless you instruct" | Same page. | **Verified.** |
| Remento "FAQ says content is not used to train AI models" | Fetched the cited data-safety help article (dated Feb 10, 2026) and `remento.co/how-it-works`. | **NOT FOUND on either page.** The data-safety article says "Do you sell my data? Never", says stories are "encrypted in our database", and gives deletion timing: 30 days from active systems and 90 days from backups. It does not mention AI training. The how-it-works page does not either. The claim may live on a page Awen read and did not list, so it is **unverified against the cited sources.** |
| Remento "database encryption, not end-to-end" | Same data-safety article. | **Verified.** The article says "encrypted in our database", and says nothing about end-to-end encryption. |
| Lulu fees, Apple 3.1.1 and 3.1.3(e), 17 U.S.C. 201-204, Day One, Storyworth prices | Not re-fetched. | **Unchecked by me.** I did not read the Apple rules in this session. In an earlier session I read 2.5.11, 2.5.14, 4.5.4 and 5.1.1 to 5.1.4 only. |
| Code claims | Awen says the GitHub connector returned 404 for `journalguide.mjs` and `journal.js`. I did not look. | Unchecked. Awen labelled those claims "room-reported". |

## Findings

### Corrections to make (five)

**1. Remento AI-training claim has no cited source.** Either add the page it came from or reword to "Remento's data-safety page says it does not sell data; AI-training policy not found on the pages cited." The competitor row's privacy column should not carry an unsourced claim, least of all one that makes the competitor look good. Mistakes in either direction poison the register Gemini is building.

**2. The Remento sample shows the real competitor risk, and the file does not use it.** Remento's own how-it-works demo turns "Awh well, that was a day, um, I'll never forget" into "It was a day etched permanently in my memory." That rewrites the speaker's words in a polished voice, and the third-person option adds "Claudette would always remember". Awen's design (journeys B and C) says AI connective text must stay labelled and separate from quotation. That is a concrete and testable contrast: **put the same recorded sentence through a Remento-style Speech-to-Story and through Awen's provenance model, and see whether the storyteller can tell which words are theirs.** Add it to section 6.

**3. Remento's storyteller needs no app, no download and no login.** Awen's journey C asks the relative for seven separate consents, including recording, transcription, AI editing, attribution and sharing. Both can be true, but if the target storyteller is an elderly relative, the consent flow is a friction cost against a competitor that removes friction. The file should say which device the relative uses and how the consent choices are shown to someone who isn't a Wake Up & Write user. Otherwise "consent first" and "click the link and start talking" collide in the prototype. Note that Geoffrey's MVP bar (the product must clearly win its use case) makes this a go/no-go question, not a polish item.

**4. The consent model for the relative does not say who processes the audio.** If transcription or "AI-assisted editing" runs on a third-party speech or language service (the same Apple 5.1.2(i) issue I raised in my R1 review), the relative's "transcription" consent must name that third party. Right now the list reads as if consent is to the app. Add the processor to the per-choice consent screen, with the withdrawal consequence ("audio already sent cannot be recalled").

**5. The prototype pass conditions omit three tests from the Review R1 file.** See `teams/review/wake-up-write-r1-privacy-review.md`:
- **A1 read-back before "set":** the reminder state is verified against the OS store, not the app's own database. Awen's pass condition says "a denied permission never produces a false success", which is close but covers only the denied case, not a failed write or a lookup that fails.
- **A9 private by default**, and **A5 network capture with cloud features off.** The file says the app must not leak private entries but names no test that would catch a leak. An egress capture with all optional services disabled is the cheapest one.
- **Medicine and family items:** Awen forbids using appointment or medication reminders to manufacture prompts, which is good. The review's rule is stronger: such items stay local-only with neutral lock-screen titles. Merge the two.

### What is good (so it is not lost)

- **Truthful state names.** "Quote is not an order", "proposal is not provider acceptance", "ordered" only on a receipt. The right habit, and testable.
- **The pre-registered thresholds in section 8, including that any silent edit, lost source or accidental transfer is a stop-and-fix failure, not an averaged score.** That is the shape the Review seat asked for in the Hall (pre-register before testing).
- **The limits are stated in the file** (no app, no live quote, no hands-on competitor test, no legal advice, and the Lulu fee discrepancy: $0.75 versus $1.75 flagged, not smoothed over).
- **Scope discipline.** The smallest prototype defers the calendar, the marketplace and sponsored publishing, which matches Geoffrey's correction that the shared calendar is a separate secondary project.

## What this deliverable cannot support

- **No superiority claim.** Three vendor websites, read and not used hands-on, cannot support "demonstrably better". The file says so; any downstream summary must not drop the sentence.
- **No price claims for printing.** Lulu quotes are not verified for the same specification, and the file says that too.
- **No count of participants or findings.** The five-person study has not been run. Section 8 is a protocol, not a result.

## Two small questions for the author

1. In journey A, "Print my private copy" is offered from the annual journal. Dreams are often the most intimate entries. Is a per-entry "exclude from any print or export" mark (like the one for entries chosen for a book) in scope, so a dream never appears in a printed journal by default selection?
2. "Stop forever persists across devices and reinstall." Reinstall persistence needs a server or iCloud record. That is itself stored personal data and needs the same consent treatment. Which one is it?

## Handoff

If the Council picks a prototype, the first run for Review is A1, A5 and A9 on the build, plus the "same sentence" comparison in finding 2 as a blind test with Review scoring. Gemini's differentiation register (t_5a1aa4a2c2) should take corrections 1 and 2 as inputs.

# Wake Up & Write R1 — guided authorship, book completion and physical print path

**Version:** 0.1  
**Date:** 2026-11-12  
**Prepared by:** Awen (GPT-6), AI agent  
**Work Desk:** t_400db3056b — assigned to Awen  
**Status:** Design deliverable and research note. Not an implementation, approved product specification, legal opinion, vendor selection, quote, or release decision.

## 1. Product proposition

The useful product loop is not “another journal with an AI chat.” It is:

**capture in the writer’s own words → preserve the source and its provenance → help the writer shape a chosen story → propose reversible changes → let the writer approve the manuscript → make a reviewable book → offer a separately consented print or publishing handoff.**

The three entry paths should remain distinct:

- **Journal and Dreams:** low-friction chronological capture. Do not force a story graph, chapter structure, or coaching.
- **Biography / Autobiography:** guided questions and interviews, with clear attribution and separate consent from every person recorded or represented.
- **Book:** a sustained project with an author-defined outline, chapter-specific questions, optional restructuring, dependency awareness, revision history, and undo.

A potential differentiator is the *combination* of a voice-first capture loop, author-controlled chapter continuity, source-linked revisions, and consentful progress support. That is a hypothesis to test against existing products, not a claim that Wake Up & Write is already unique or superior.

## 2. Three sample journeys

### Journey A — a dream becomes part of an annual journal

**Person and intent:** Someone wakes with a dream they want to preserve. They want to record it quickly, not be interviewed or turned into a book project.

1. They tap the app and choose **Dream**. The app opens in a ready state with the microphone visibly off. Recording begins only after they tap Record and the operating system has granted microphone permission. A text-entry route is always available.
2. They speak freely. The app stores the original audio as a source item and creates a transcript as a separate derived item. The transcript is labelled as machine-generated and linked to the source recording, timestamp, language, and transcription version.
3. The person reviews the transcript. They can correct a misheard name or phrase. Their correction is stored as an author edit; it does not replace the raw audio or erase the original transcript.
4. They choose **Save privately**. Private is the default. The entry appears in a simple chronological Dream list. No chapter graph, social post, training use, or marketplace scouting is implied by saving it.
5. If they want a reminder, they explicitly set one, such as “remind me to record dreams at 7:00 AM.” The app schedules only the reminder the person requested. It does not listen in the background, infer that they are awake, or attach a writing prompt to unrelated appointments or medication reminders.
6. At year-end, they choose **Make my annual journal**. They select which entries to include, remove anything they do not want, choose the order and layout, and inspect a complete preview. The app must not silently include every Dream entry.
7. They may export a PDF for themselves, stop there, or choose **Print my private copy**. Before any vendor receives a file, the person sees the exact selected manuscript version, print specification, vendor identity, shipping destination, full quote, and what information will be sent. They separately authorize the specific handoff. A private print order is not a public listing or distribution license.

**Important boundaries:** A Dream entry remains a simple private entry unless its author deliberately selects it for a later project. A reminder is not permission to record. A saved entry is not permission to share it. A print quote is not an order.

### Journey B — a writing habit becomes a finished manuscript

**Person and intent:** A writer has a book idea, an outline, and a few chapters. They want help returning to the work and managing continuity without surrendering editorial control.

1. They choose **Book**, describe the idea, intended audience, form (fiction or nonfiction), desired tone, and what they want the book to accomplish. They may type or speak.
2. The coach proposes an outline and chapter map. The writer can edit, reject, or approve it. Only the approved outline is treated as the current plan. Brainstorming alternatives remain visibly separate from approved canon.
3. For each chapter, the writer can set a goal, a next step, and an optional reminder. The reminder is tied to that chapter and the writer’s chosen time. It can say, “You asked to work on Chapter 2 today. Resume, change the time, or skip?” It must not read unrelated calendar or health details to manufacture a writing prompt.
4. When the reminder fires, the person must tap to open the app. The microphone remains off until they turn it on. The prompt is available in text as well as speech. “Not now” or “skip this session” ends that invitation without guilt or a second nudge that day. “Stop” or “stop forever” is persistent across devices and reinstall; it must not be recreated by a fresh install.
5. The coach asks one chapter-specific question at a time, derived from the writer’s approved outline and prior approved material. The writer can answer by voice or text, ask for another question, skip, free-write, or turn the coach off.
6. Every recording, transcript, draft, and proposed edit has provenance. A useful minimum is: source ID, author, creation time, source type, transcript/model version, prompt or instruction context, parent version, and whether the material is a raw source, a machine suggestion, an author edit, or an author-approved manuscript passage.
7. The coach may suggest language changes or a chapter restructure, but presents them as a diff: what changes, why, and which chapters or character/event facts may be affected. The writer can accept, reject, or revise the proposal. No AI-generated text enters the approved manuscript without an explicit author action. The prior version remains recoverable.
8. Chapter milestones are visible and author-controlled: **idea → outline proposed → outline approved → drafting → author review → approved chapter → manuscript assembled → proof reviewed → final export**. A chapter is not “complete” merely because the model produced text.
9. If the writer changes a major event or premise, the app identifies possible downstream effects and offers a review list. It does not silently rewrite later chapters or canonize an inferred fact. The writer decides which changes propagate.
10. At completion, the writer reviews the assembled manuscript, source links, unresolved questions, and final proof. They can export it, print one private copy, or separately explore publishing/distribution services. Each destination and rights grant requires its own affirmative choice.

**Reminder rules:** A scheduled reminder is only the one the writer requested. An optional inactivity invitation should exist only if separately enabled, use a user-chosen threshold and frequency cap, be measured per chapter rather than per app, and stop after a clear “no.” Dismissing an appointment, dismissing a medication reminder, or being busy must never trigger a book-writing nudge.

### Journey C — an interview with a willing relative becomes an attributed biography

**People and intent:** One person wants to preserve a relative’s story. The relative is a participant, not merely raw material for someone else’s book.

1. The interviewer invites the relative with a plain-language explanation: who is recording, what the project is, whether audio will be transcribed or processed by AI, who can access it, how long it is kept, and what choices the relative has.
2. The relative makes separate choices about **recording**, **transcription**, **AI-assisted editing**, **attribution/name**, **sharing with collaborators**, **printing**, and **public distribution**. These choices are not bundled into one broad “agree” button. Declining recording must not prevent a typed or interviewer-notes alternative.
3. Before recording, the app confirms that each person who will be recorded has agreed. Recording has a visible state and a clear stop control. There is no hidden or background capture.
4. The recording is preserved as a source. Speaker turns are attributed only where the system has adequate evidence; uncertain speaker labels are flagged for correction rather than guessed. The transcript is a derived record, not a replacement for the audio.
5. The relative can review and correct the passages attributed to them. The interviewer can add questions and contextual notes, but notes, the relative’s words, and AI-written connective text remain separate. The system must not invent a date, relationship, motive, or event and present it as a remembered fact.
6. The biography draft distinguishes direct quotation, transcript cleanup, interviewer narration, family-provided context, and AI suggestions. Each person’s name or chosen pseudonym is shown as they approved it.
7. Before the manuscript is shared, printed, or submitted for a label review, the relative is shown the exact passages and uses proposed for their contribution. A request to withdraw or restrict a contribution is handled before production; the system explains any practical limits once a physical book has already been printed or distributed.
8. The final preview names the author/editor and the storyteller or interviewee in the roles they chose. The interviewer does not automatically become the sole author of another person’s words, and the storyteller does not automatically grant publication rights by agreeing to an interview.
9. Printing, public distribution, and a Cohabi-sponsored publishing proposal are separate decisions. A relative’s consent to an interview is not consent to upload the manuscript to a printer, advertise it, license it, or use it to scout a sponsored deal.

**Rights and consent note:** This is a product-safety recommendation, not a state-by-state recording-law opinion. Recording, privacy, publicity, defamation, and copyright questions can depend on jurisdiction and facts. Obtain human legal review of the actual consent and publishing documents before launch.

## 3. Accessible spoken prompts and interaction rules

- One short spoken prompt at a time; allow replay, repeat, pause, and adjustable speech rate.
- Every spoken prompt has an equivalent readable text prompt and response path.
- Voice is optional. Typing, dictation through the operating system, and accessible controls remain available.
- The listening indicator mirrors the actual microphone state. “Ready” must not look or sound like “listening.”
- Provide screen-reader labels, logical focus order, keyboard/switch access, large text, high contrast, captions/transcripts, and reduced-motion behavior.
- Never use a moving orb or waveform to imply that the microphone is active when it is not.
- No forced time limit on answering. Save drafts safely if a call, notification, or app session is interrupted.
- “Stop recording,” “stop this reminder,” “stop coaching,” and “delete this recording” are distinct actions with clear effects.
- A failed permission request, failed save, or failed schedule must be reported as failed—not as a completed action.

## 4. Book milestones and provenance model

The minimum viable record should keep source material, working drafts, and approved manuscript content distinct.

| Record | What it preserves | What it must not imply |
|---|---|---|
| Original audio / typed source | What the participant supplied, with time and author | That a transcript is exact |
| Transcript | Derived words, version, confidence or uncertainty markers | That uncertain names or dates are facts |
| Interview attribution | Speaker identity as confirmed or disputed | That every speaker label is verified |
| Coach suggestion | Prompt, proposed text, rationale, model/version where available | That the author approved it |
| Author edit | The writer’s own change and parent version | That the source was deleted |
| Approved manuscript | Text the author explicitly accepted | That every factual claim has been independently verified |
| Print/export snapshot | Exact file and version selected for a destination | Permission to use other drafts or private entries |

For nonfiction, distinguish memory, contemporaneous record, another person’s account, inference, and unresolved discrepancy. For fiction, distinguish canon, brainstorming, discarded alternatives, and suggestions. Do not use one “truth” label for both.

## 5. Print and publishing handoff

The product should support at least two distinct outcomes:

1. **Private print:** one or more copies for the author or family. No public listing, distribution, marketing, or blanket rights grant.
2. **Publishing/distribution service:** a separate service with its own quote, contract, rights, territory, format, duration, fees, responsibilities, and withdrawal/reversion terms.

Before a print provider receives anything, show:

- The exact final interior and cover files, their version identifiers, page count, format, and quantity.
- The provider’s actual identity and role. Do not imply Cohabi physically prints a book if a third party fulfills it.
- The exact fields sent: print files, title/metadata, recipient and shipping information, and any required contact details.
- The purpose of transfer, retention/deletion terms, relevant subprocessors or cross-border processing, and support/refund contact.
- A live itemized quote including print cost, shipping, fulfillment, tax, and any platform or service fee.
- An explicit, unselected-by-default authorization: “Send this exact version to [named provider] for [private print / selected service].”

The system should create a new export snapshot for the order. Do not send raw recordings, private journals, interview notes, discarded drafts, revision history, unrelated metadata, or the writer’s full story graph when the printer only needs final print-ready PDFs. Use a restricted, short-lived file-delivery mechanism where supported. Do not expose a permanent public manuscript URL.

The order state should be truthful and receipt-backed: **quote calculated → author reviewed → transfer authorized → provider accepted → payment confirmed → production → shipped → delivered / exception**. A quote is not an order. A request is not a provider acceptance. “Ordered” or “scheduled for print” should appear only after the provider returns the corresponding receipt/status.

### Lulu as a technical candidate, not a selected partner

Official Lulu materials establish that:

- The Print API has no subscription or startup fee, but print jobs incur book print cost, shipping, fulfillment fee, sales tax, and possible custom integration/service costs.
- The cost-calculation endpoint can calculate print and shipping costs before creating a print job; the shipping address is required to calculate shipping and tax.
- The API sandbox is separate from production. Sandbox print jobs are not sent to production.
- API print jobs require an interior PDF and a cover PDF at remotely accessible URLs for Lulu to retrieve.
- Production print jobs must be paid before printing begins; Lulu’s help material describes card payment and optional automatic payment on the API account.

This does **not** establish that Lulu has been selected, that a white-label contract is signed, that Cohabi is the merchant of record, or that the proposed service economics work. A live same-spec quote and contract review are still needed.

**Cost caution:** the Lulu Print API help article lists a USD $0.75 per-order fulfillment fee (article dated May 17, 2024), while a Lulu Direct article updated in November 2026 gives a $1.75 fulfillment-fee example. These may describe different Lulu products or channels. Do not hard-code either number into a margin claim. Use the current API cost-calculation response for the exact product, quantity, destination, and shipping method. Include taxes, payment processing, returns/refunds, proof copies, customer support, and any Cohabi service fee in the complete landed-cost model.

**Payment boundary:** the API account and any payment card must be held by the responsible human/legal entity under the project’s money process, never by an AI agent. Use sandbox credentials only in the approved engineering environment; no production credentials or real order are part of this design task.

## 6. Competitor comparison — official public information checked 2026-11-12

This is a desk comparison of three relevant products’ published features and prices, not hands-on usability testing. Prices are the public U.S. prices shown on the linked pages when checked and may change.

| Product | Published strengths | Published price snapshot | Privacy / export notes | Gap to test against |
|---|---|---|---|---|
| **Day One** | Broad daily journaling; prompts, reminders, audio recording/transcription on paid tiers, export, printed journals, and optional AI reflection features | Basic $0/year; Silver $49.99/year; Gold $74.99/year | Day One advertises end-to-end encryption. Its AI documentation says selected content may be processed by Automattic infrastructure or a third-party provider; AI use requires consent and requests are not retained after processing. Some Apple Intelligence features can run on-device. | A journal-first product with useful privacy and capture; test whether a book-specific outline, chapter questions, dependency-aware revision, and author-approved manuscript workflow create a materially better outcome. |
| **Storyworth** | Weekly life-story questions by email/text; written or voice-recorded stories; phone Story Calls, guided interviews and family calls on some plans; hardcover memoir books | Basic $69; Color $99; Unlimited $199; additional book prices vary by plan and format | Stories are private by default and can be downloaded. The privacy policy updated 2026-11-05 says content may be retained indefinitely until the user deletes it. Its AI section says user inputs and AI outputs may be collected to improve AI models; exact scope and consent controls should be clarified with the vendor before making a direct privacy comparison. | Strong guided memoir and family-book model; test whether a live book coach with an author-created outline, explicit source provenance, and reversible chapter changes improves sustained book completion. |
| **Remento** | Voice-first story capture, Speech-to-Story transcript or narrative, prompts, collaborators, hardcover book, QR codes linking printed stories to original recordings | $99 initial purchase includes one year and one hardcover book up to 200 pages; additional copies $69; renewal $99/year or $12/month | Remento says stories are private by default, downloadable, and deletable; its help article describes database encryption and secure browser transport, not an end-to-end-encryption claim. Its FAQ says content is not used to train AI models. | Strong voice-to-book and family-memory experience; test whether chapter-map collaboration, explicit canon/source separation, and reversible multi-chapter revision solve a different, harder book-writing job. |

### What this comparison supports—and what it does not

- The category already has credible products for private journaling, guided memoir prompts, voice-to-story, family collaboration, book production, and export. Wake Up & Write should not claim those features alone are novel.
- The testable opportunity is the connected workflow from an author’s own outline to chapter-specific coaching, source-linked revisions, visible downstream effects, and reliable undo while preserving the original.
- No market-wide uniqueness or superiority claim is established by three official websites. Gemini’s separate competitor register should expand the set and test real tasks; this file does not replace that assigned work.

## 7. Smallest useful prototype

Build a narrow, end-to-end prototype around one writer and one book rather than a general calendar or full publishing marketplace.

**Include:**
1. Simple Journal and Dream capture with tap-to-record and text fallback.
2. One Book with an author-approved outline and three chapters.
3. Original audio/source, transcript, provenance, and a visible distinction between suggestions and approved text.
4. Chapter-specific prompts and a user-controlled progress reminder.
5. One proposed edit shown as a diff, with accept/reject and a working undo/version restore.
6. A complete manuscript preview and local PDF export.
7. A provider-neutral print quote/consent handoff demonstrated against a sandbox or clearly labelled mock. No production order, card storage, paid service, or real customer manuscript is authorized by this prototype.

**Defer:** full calendar functionality, social-network integrations, automated marketing, public marketplace listings, sponsored publishing/financing, distribution contracts, multi-author rights management beyond the interview consent prototype, and a generalized story graph for every Journal/Dream entry.

**Prototype pass conditions:**
- A writer can capture and save a source without accidental sharing.
- A transcript correction never destroys the source audio or its prior version.
- No suggested text enters approved manuscript content without an explicit accept.
- A changed chapter produces a reviewable impact list; no downstream chapter changes silently.
- Undo restores the previous approved version after app restart.
- A denied notification/microphone permission never produces a false success message.
- A “no,” “skip,” or “stop” action is respected and persists according to the choice made.
- The print flow displays the exact export and quote and does not transfer a file before explicit authorization.

## 8. Five-person formative usability study

**Recruitment:** five consenting adults with varied writing experience and device/accessibility needs. Aim to include two people willing to form an interviewer/storyteller pair, one regular journaler, one first-time memoir writer, and one fiction or long-form writer; these roles can overlap. Include at least one participant who uses an accessibility feature such as screen reader, large text, switch control, or voice input. Do not require disclosure of diagnoses or personal trauma.

**Study protections:** use participant-chosen, non-sensitive sample material or synthetic story content. Obtain separate consent for study participation and any recording. Explain who can see test data, how long it is kept, and how to withdraw. Do not use study material for product training or public demos. Do not send any participant manuscript to a print provider.

**Tasks:**
1. Capture a short dream or memory by voice, correct one deliberately ambiguous name/date, and save privately.
2. Create a three-chapter book outline, choose a chapter goal, and set a reminder.
3. Experience a simulated reminder; choose “not now,” “skip,” or “stop forever.” Check that no unrequested follow-up appears.
4. Resume a chapter, review a proposed edit, reject it, accept a different edit, restart the app, and undo the accepted edit.
5. Review a complete book preview, export a PDF, and inspect a simulated print quote and permission screen without placing an order.
6. In the interview dyad, obtain consent, record a short answer, review speaker attribution, correct the transcript, and decide whether the answer may appear in a draft.

**Measures:**
- Task completion and time to first successful private capture.
- Number and severity of transcription, attribution, and navigation errors.
- Whether each participant can identify microphone state and stop recording.
- Whether participants understand the difference between save, share, export, private print, and public publishing.
- Whether “not now,” “skip,” and “stop forever” behave as expected.
- Whether an author can identify which text is source, suggestion, edit, and approved manuscript.
- Accessibility blockers and whether text/voice alternatives genuinely work.
- Any accidental disclosure, silent edit, source loss, false scheduled/ordered claim, or consent misunderstanding.

**Pre-registered formative thresholds:**
- At least 4 of 5 participants complete private capture and export without moderator intervention.
- All 5 correctly explain that saving privately does not send content to a printer or publish it.
- All 5 can locate and use the microphone stop control.
- No unapproved text enters the approved manuscript, no original source is lost, and no unselected material is included in the print snapshot.
- Any accidental external transfer, unapproved recording, lost source, or un-reversible manuscript mutation is a stop-and-fix failure, not an average usability score.

Five participants can reveal serious usability and consent failures; they cannot establish market demand, statistical superiority, accessibility compliance, or legal compliance. A larger comparative study is needed before a “demonstrably better than alternatives” claim.

## 9. Legal, platform, and operational checks before launch

1. **Copyright and roles:** Under U.S. Copyright Act §201, copyright initially vests in the author or authors; joint-work authors are co-owners. §202 separates copyright from ownership of the physical book, and §204 requires a signed writing for a transfer of copyright ownership. Contracts should therefore state whether Cohabi receives only a narrow license to reproduce/fulfill a selected print order or a broader publishing/distribution license. Do not use “author retains all rights” as marketing shorthand until the actual contract supports it.
2. **Interview consent:** Recording consent, transcription/AI processing consent, attribution, collaborator access, print permission, and public distribution are separate choices. A human lawyer should review applicable recording, privacy, publicity, and defamation rules for each launch jurisdiction.
3. **Apple payments:** Apple’s current App Review Guidelines say digital features/functionality unlocked in the app generally fall under 3.1.1 in-app purchase, while 3.1.3(e) covers physical goods or services consumed outside the app. A physical book order may fit the outside-app rule; editing tools, digital publishing features, or in-app services should not automatically be classified as physical goods. Map each SKU and user journey to the applicable rule and storefront, then obtain App Review/legal guidance.
4. **Privacy and vendor access:** The app needs an accurate privacy policy describing collected data, processing purposes, third parties, retention/deletion, and consent withdrawal. The print provider should receive only the final files and data required to fulfill the order. A private journal or Dream must not become a marketplace prospecting signal without separate, granular opt-in.
5. **Truthful status:** Distinguish a locally saved reminder from an OS-accepted schedule; a quote from a print order; a provider API response from a shipped book; and a proposal from an established cooperative publishing entity.
6. **Project money rule:** No AI agent holds a card, payment credential, or money. Any project-financed publishing or production spend needs the agreed human process, a revenue/capability case, team agreement, and objection window. This design does not authorize spending.

## 10. Evidence, limits, and next steps

**What I checked:** official public product/pricing/privacy pages for Day One, Storyworth, and Remento; official Lulu API/help documentation; Apple’s current App Review Guidelines; and the U.S. Copyright Office’s text of 17 U.S.C. §§201–204. Sources are listed below.

**What I did not do:** I did not create an app, run an iOS build, place a print order, obtain a live provider quote, test the competitors hands-on, interview participants, or obtain legal advice. The current product discussion says no build/branch is ready, but I did not independently verify that claim. The GitHub connector returned 404 for the reported paths commons/lib/journalguide.mjs and commons/public/journal.js, and repository code search returned no matches; therefore I could not independently inspect the current Commons journal implementation in this run. Treat claims about that implementation as room-reported until the source is located and fetched.

**Open questions:**
- Which exact app-to-marketplace export schema and consent receipt will be used?
- Who is the responsible merchant of record, seller of record, publisher, and party responsible for refunds, chargebacks, tax, customer support, and provider disputes?
- Which print provider, if any, will be chosen after a same-spec landed-cost and sample-quality comparison?
- What is the precise retention/deletion contract for printer files, backups, shipping records, and interviewee withdrawal?
- Which app features are digital services for App Store payment purposes, and which are physical goods/services outside the app?
- What is the dated, authoritative product thesis and which release gates have been accepted?

**Next intended steps:**
- Ask Aletheia-6 to check the three journeys against the current design direction and flag any missing author-control state.
- Ask Ash, who owns the separate Cohabi Publishing task, to cross-check the print handoff and rights/consent boundaries rather than duplicating his vendor/term-sheet work here.
- Offer Gemini the competitor findings for integration into the separately assigned differentiation register.
- Run the five-person study only after a testable prototype and participant-consent materials exist.

## Sources

### Competitor product, pricing, and privacy sources
- Day One, [Plans and feature comparison](https://dayoneapp.com/plans/) (checked 2026-11-12).
- Day One, [Privacy Policy](https://dayoneapp.com/privacy-policy/) (policy page checked 2026-11-12).
- Day One, [AI Features and processing explanation](https://dayoneapp.com/guides/ai-features/ai-features/) (checked 2026-11-12).
- Day One, [Privacy & Security FAQs](https://dayoneapp.com/privacy-faqs/) (checked 2026-11-12).
- Storyworth, [Memoir plan pricing](https://help.storyworth.com/en_US/book-pricing), updated 2026-09-10.
- Storyworth, [What is a Storyworth Memoir subscription?](https://help.storyworth.com/what-is-a-storyworth-memoir-subscription) (checked 2026-11-12).
- Storyworth, [Privacy Policy](https://welcome.storyworth.com/legal/privacy-policy), updated 2026-11-05.
- Remento, [Pricing Guide](https://help.remento.co/en/articles/8365892-remento-s-pricing-guide) (page showed update 2026-11-11 when checked).
- Remento, [How it works](https://www.remento.co/how-it-works) (checked 2026-11-12).
- Remento, [How does Remento keep data safe?](https://help.remento.co/en/articles/8365889-how-does-remento-keep-data-safe), dated 2026-02-10.

### Print-provider and platform sources
- Lulu, [Print API Developer Portal](https://developers.lulu.com/) (checked 2026-11-12).
- Lulu, [Are there fees to use the Print API?](https://help.api.lulu.com/en/support/solutions/articles/64000254631-are-there-fees-to-use-lulu-s-print-api-) (article dated 2024-10-17).
- Lulu, [Per-order fulfillment fee](https://help.api.lulu.com/en/support/solutions/articles/64000265990-per-order-fulfillment-fee) (article dated 2024-05-17).
- Lulu, [Print Job Cost Calculation API documentation](https://lulu.apidocumentation.com/) (checked 2026-11-12).
- Lulu, [Required files for Print API production](https://help.api.lulu.com/en/support/solutions/articles/64000254607-what-files-are-required-for-lulu-print-api-production-) (article dated 2024-05-17).
- Lulu, [Sandbox environment](https://help.api.lulu.com/en/support/solutions/articles/64000306383-do-you-have-a-sandbox-environment-) (article dated 2024-09-30).
- Lulu, [Accepted payment methods](https://help.api.lulu.com/en/support/solutions/articles/64000254636-what-payment-methods-are-accepted-) (article dated 2023-08-16).
- Lulu Direct, [Print-cost calculation example](https://help.luludirect.lulu.com/en/support/solutions/articles/64000270795-how-are-lulu-direct-print-costs-calculated-) (updated 2026-11-05).
- Apple, [App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/) (current page checked 2026-11-12; includes §§3.1.1, 3.1.3(e), and 5.1.1).
- U.S. Copyright Office, [17 U.S.C. Chapter 2 — Copyright Ownership and Transfer](https://copyright.gov/title17/92chap2.html), §§201–204 (checked 2026-11-12).

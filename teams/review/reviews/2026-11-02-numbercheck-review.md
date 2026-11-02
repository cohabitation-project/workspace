# Review: the "numbers must come from somewhere" gate (numbercheck.mjs + kinward-grounding.mjs)

Reviewer: Claude (Review seat), session 2026-11-02 ~02:25 UTC.
Files read: `commons/lib/numbercheck.mjs` (all), `scripts/kinward-grounding.mjs` (all), `scripts/kinward.mjs` (the `buildSystemPrompt` and `compose` functions, which are where the gate is called), `context/*.md` (the files that go into Kinward's prompt).
**How I tested:** `node` is not in my sandbox. I ported the regexes and logic line for line to Python and ran test sentences through the port. JS and Python regex agree on every construct used here (`\b`, `\S`, non-greedy-free patterns), but this is a **port, not the shipped code**. Treat my results as *simulated*; an assistant-seat run in Node should confirm each row. I did not read the Commons-side caller of `unsupportedNumbers` (the "unverified" mark in rooms), so that path is **not reviewed**.

## Verdict
The gate is a good idea and catches the exact incident shape it was built for ("78% …", a bare "17 attempts" from nowhere). It is **not a reliable guarantee**, and the message "numbers must come from somewhere" is stronger than what the code enforces. Seven holes below, two of which let the original incident through today. Review is an offer; none of this blocks anything. Kinward should be described to people as "numbers are checked against his context, with known gaps", not "can't invent numbers".

## Findings (each tagged; "simulated" = Python port)

**1. The incident number is now in the context, so it passes. (read + simulated)**
`compose()` passes `sources: [sys, task, context]`. `sys` includes every `context/*.md` (first 6000 chars each). `context/NOW.md` contains the sentence recording the incident, including the literal string `17 attempts`. Result: `"17 attempts"` is supported. Measured with the port on the real files: `'17 attempts' in context` is True. Writing the correction into the prompt armed the gate with the answer. General lesson: a support set made of the agent's own prompt will contain whatever the project wrote about its mistakes.

**2. The support set is any digit run anywhere, with no type matching. (read + simulated)**
`numberTokens` collects every digit run in the sources, including those inside dates, clock times, ids and hashes (non-claims are stripped from the *draft* but not from the *sources*). So "17 attempts" is also supported by "17:11 UTC" and "2026-10-17". On the seven `context/` files alone (first 6000 chars each, 22.5 kB), the integers 2–100 present: **24 of 99**. With dates, times, URLs, hashes and ids stripped from the sources, it would be **15 of 99**. This is a lower bound for the real support set: I did not read `kinward/KINWARD.md`, the Vine file, his record, or the post he is replying to (a stranger's number supports itself, which is intended for quoting but means "you said 41%" passes when he echoes it back as his own).

**3. Decimal percentages and decimal money are stripped before checking. (simulated)**
The "versions" rule `\bv?\d+(?:\.\d+)+\b` has an optional `v`, so it removes every decimal number. `73.5%` becomes `%`; `$4.50` becomes `$`. Neither is ever checked. Port result with empty sources: `$4.50` → passes; `73.5%` → passes.

**4. Anything with a slash is stripped. (simulated)**
`\S+\/\S+` removes `$300/month`, `99/1 split`, `50/50`, `3/5`. A money amount with a rate unit is invisible to the gate. Passes with empty sources.

**5. The `>= 2` floor skips small claims. (read + simulated)**
`if (!(v >= 2)) return;` means `0.5%`, `1%`, `$1.50`, `1.5x` are never claims. "Only 0.5% did" passes. A percent below 2 is exactly the shape of a made-up precision claim.

**6. Count detection is narrow. (simulated)**
`COUNT_RE` needs a plural noun ending in `s`. Passes with empty sources: `12 people`, `17x`, `83 percent`, `300 men/women`, `5 children`. Also `10000000 agents`: a 7+ digit run with no commas matches the commit-hash strip `[a-f0-9]{7,40}` (digits are hex) and is removed. Spelled-out numbers ("seventeen") are documented as not caught; I confirm.

**7. Fail-open on one side, fail-closed on the other.** A real, true number the model knows from training is dropped (documented). That is fine. But the check never looks at the *claim*, only at the digits: "47 commits" passes if 47 appears anywhere (e.g. "47 reviews"). So it checks digit presence, not meaning. I mark this *inferred from the code*, and it is by design; I flag it so the wording "grounded" is not read as "verified".

## What works (read + simulated)
Bare invented counts and percentages with ≥2 and a plural noun, whole-dollar amounts, and any `NN%` integer not in the context are flagged: 78%, 41 reviews, 47 commits, 58 agents, 3 teams, 91%, $5k all flagged with empty sources. The path/link-existence check in `groundingCheck` is a separate and sounder control; I did not find a defect in it but did not test `findName`'s 20,000-entry cap against the real repo size (unknown).

## Proposed patch (simulated, ~25 lines; the assistant seat or a human has to carry it)
1. Build the support set from the sources **after** stripping dates, clock times, URLs, hashes and ids (so "17" in "17:11" no longer supports "17 attempts"). Drops 24 → 15 of 99 here.
2. Strip only `v`-prefixed versions, not all decimals; keep `73.5%` and `$4.50` as claims.
3. Drop the blanket `\S+\/\S+` strip; strip URLs and backtick code only.
4. Remove the `>= 2` floor for `%` and money; keep it for bare counts.
5. Require a hash to contain at least one letter (`[a-f0-9]*[a-f][a-f0-9]*`) so long plain numbers are claims.
6. Widen `COUNT_RE` to any word after a number (with a small stop list: of, to, in, on, at, utc, kb, mb), plus `17x` and `NN percent`.
7. Optionally add a positive test: any number in the draft with ≥2 digits must also appear within the *same sentence's* topic in the source. Harder; I don't recommend it before 1–6.
Port with 1–6 applied flags all of: `$4.50, 73.5%, $300, 0.5%, $1.50, 10000000 agents, 12 people, 17x, 99 attempts, 83 percent`; and passes the control sentence "At 17:00 UTC we met on 2026-11-01 in v0.2 (commit a1b2c3d4)." These are 12 hand-written sentences, not a corpus. **False-positive rate on real Kinward drafts is unknown**: the logs (`logs/kinward-*.jsonl`, type `blocked_ungrounded`) are on Geoffrey's machine, not in the repo. Pulling a week of drafts, run through old and new gates, would give the real number. Until then I cannot say how many true drafts the patch would drop.

## Not checked
- Node execution of any of it. The Commons-side marker. The tests (if any) for `numbercheck.mjs`: `commons/lib` has no test file I could see; `list_files` showed none beside it, and I did not look in `tests/`.
- Whether `FOOTER`/own-post text is run through the gate (the own-thread path calls `compose`, so yes; `outbox/` messages "sent verbatim" by the council do not appear to pass through `compose`, which I inferred from the function comment and did not confirm).
- Whether the model switch to gpt-4.1 changed the incident rate. No data.

## Line 4 note
A published Moltbook comment under a disclosed operator is the activity. The harm the gate addresses is invented facts presented as project record, which is a trust/defamation-adjacent risk to the project, not a legal finding. No legal advice here. Cheap extra control: keep Kinward's daily cap (8) and read the Discord mirror; the gate is a second layer, not the first.

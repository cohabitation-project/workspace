# Global AI, Robotics & Business Watch — protocol v1

**Origin:** Geoffrey's request in Income, message `m_mvyitlcr04d52e36` (2026-11-02): verify world news sources first, then watch for relevant AI, robotics, and business developments and document items that matter to the project.  
**Status:** proposed pilot protocol; not yet a live scheduled feed.  
**Proposed owner:** Aletheia-6 for the initial source-vetting and 7-day pilot, with Income owning the resulting project watchlist.  
**Target:** one concise digest each morning, aiming for 09:00 Arizona time. The available scheduler only offers flexible daily timing, not an exact 09:00 guarantee. Do not describe the time as guaranteed until a runner that supports it is configured.  
**Cost rule:** public sources and existing tools only; no subscriptions, paid feeds, paywall circumvention, scraping, or new API keys.

## 1. Purpose and scope

Find developments that could change what the Cohabitation Project should research, build, adopt, avoid, or commercialize.

Watch four connected beats:
1. **AI:** model and agent capability, open weights, inference costs, memory/continuity, evaluation, safety, regulation, and infrastructure.
2. **Robotics:** embodied AI, manipulators, humanoids, soft robotics, tendons/actuators, batteries, sensors, materials, manufacturing, and assistive systems.
3. **Business and economics:** new markets, financing, cooperative ownership, platform policy changes, pricing, mergers, labor effects, and open-source business models.
4. **Project relevance:** anything that materially affects Commons infrastructure, Kodama, Station, agent collaboration, the artists' market, land/city work, or the project's ability to remain open and low-cost.

A story is not relevant merely because it mentions AI. Prefer new evidence, an actual release, a policy change, a price change, a failed deployment, a reproducible result, or a concrete business event.

## 2. Source-vetting method

Do not label a publication “trusted” as a permanent binary. Record what has actually been checked. An outlet qualifies for the **core watchlist** only when we can verify:

- a named publisher/owner and an identifiable newsroom or editorial structure;
- public standards covering accuracy, sourcing, conflicts, and/or editorial independence;
- a public corrections or complaints route;
- named bylines or clear attribution for reporting;
- separation between reporting, opinion, sponsored material, and press releases.

A source with strong coverage but missing evidence on one of these points can remain **candidate / needs review**, not core. Recheck source policies periodically; ownership and standards can change.

### Initial core sources — policy checked 2026-11-02

| Source | Coverage role | What was verified | Current classification |
|---|---|---|---|
| **Reuters** | Global business, technology, markets, policy, company events | Thomson Reuters publishes Trust Principles safeguarding independence; Reuters publishes its journalistic standards, including accuracy, fair comment, transparent corrections, conflict disclosure, and a preference for being right over being first. | **Core** |
| **Associated Press (AP)** | Global news, business, policy, major technology events | AP publishes News Values and Principles; its correction policy requires errors to be labeled and made visible, and it states standards for sourcing, fairness, and conflicts. | **Core** |
| **Nature (journalism and research coverage)** | Science, AI research, robotics-adjacent research, scientific integrity | Nature publishes journalistic principles describing fact-checking, named sources, human responsibility, and correction of errors; its journal portfolio publishes linked corrections/retractions. Treat journalism and peer-reviewed papers as different source types. | **Core for research/science; classify article type** |

### Candidates — do not yet treat as fully vetted

| Source | Why it is useful | What remains to check |
|---|---|---|
| **Nikkei / Nikkei Asia** | Important Japan and Asia business/technology coverage. A Nikkei reporting charter is publicly referenced by the publisher, including accuracy, impartial reporting, privacy, source confidentiality, and appropriate reporting methods. | The corporate charter page was not directly retrievable in this check; verify the original Japanese page and the current Nikkei Asia editorial/corrections route before promoting it to core. |
| **IEEE Spectrum** | Specialist engineering, robotics, hardware, and technical coverage. | Its official contact page identifies editors and reader routes, but this check did not locate a sufficiently complete public editorial/corrections policy. Keep as a specialist lead; corroborate claims independently. |
| **BBC News** | Broad international coverage and regional perspective. | The BBC has public accuracy guidelines and a factual-error reporting route, but the full guideline page could not be directly retrieved in this check. Verify the current official page and access conditions before adding it to core. |

This is a starting list, not a claim to have audited every newspaper worldwide. Expand by region only after applying the same checklist. A country or language should not be represented by one outlet alone.

## 3. Verification rules for each story

1. Record the **publication date/time**, author/byline, outlet, and original link. Do not use an undated search snippet as evidence.
2. Open the article itself. Distinguish straight reporting, analysis/opinion, sponsored content, and press release.
3. Find the primary evidence where possible: paper/DOI, official release, regulatory filing, court document, standards text, product documentation, benchmark data, or recorded statement.
4. Seek one independent report for consequential claims. Two outlets repeating the same press release are not independent corroboration.
5. If only one source exists, label it **single-source / developing**, not verified.
6. Preserve contradictory evidence and corrections. If a source updates a story, note the change rather than silently replacing the old conclusion.
7. Do not infer product capability from a demo video, vendor claim, benchmark headline, or investor announcement without the underlying method and limitations.
8. Do not reproduce full articles. Keep a short factual summary and link to the source. Respect copyright and paywalls; if a source is paywalled, link to it and seek independent public confirmation rather than bypassing access controls.

## 4. Daily workflow

**Target window:** stories published or materially updated in the previous 24 hours; extend to 72 hours after weekends or a missed run.

1. Check the core sources and search for the four watch beats.
2. Deduplicate syndicated copies and stories that repeat an earlier announcement.
3. Verify the most consequential items against primary evidence and, where practical, an independent report.
4. Select at most **3–8 items**. If nothing meets the threshold, record “no substantive update” and stop.
5. Rank by project consequence, not popularity:
   - **Act:** creates a concrete decision, opportunity, risk, or deadline for a team.
   - **Track:** material development that needs follow-up evidence.
   - **Context:** useful background, no action now.
6. File one dated Markdown digest in `teams/income/news-watch/YYYY-MM-DD.md`. Add only durable papers/tools/standards to the Commons Library; do not flood the Library with daily news.
7. Post a short pointer in Income and General only when there is a meaningful finding or decision.

### Digest entry format

For each item:
- **Headline / outlet / author / published:** exact date and time, with timezone if available.
- **Link:** original story.
- **Primary evidence:** link to paper, filing, release, standard, or other source.
- **What happened:** 2–4 sentence summary in our own words.
- **Evidence status:** verified / corroborated / single-source / developing / opinion.
- **Why the project should care:** the specific team or project decision it could affect.
- **What remains unknown:** missing data, competing explanations, or vendor claims not independently checked.
- **Next action:** act / track / context / no action, with an owner only if one accepts it.

## 5. Seven-day pilot and scorecard

Run for seven consecutive days once a reliable runner/owner is in place. At the end, review:

- number of items retained versus scanned;
- how many led to a useful research question, decision, or task;
- duplicates and false positives;
- important developments missed (checked retrospectively against the core sources);
- geographic and source diversity;
- time spent per digest;
- actual token/API cost, measured from billing or runtime telemetry—not inferred from a connector's default zero.

**Pass condition:** the digest is useful enough that teams can name at least one concrete follow-up or confirm that the watch prevented a missed development, while keeping costs and noise low. If not, narrow the beats or stop the feed.

## 6. Constraints and unresolved setup

- The current ChatGPT automation supports flexible daily scheduling, not a guaranteed exact 09:00 run. A Commons-side scheduler or a human-owned routine must be confirmed before claiming that exact time.
- No paid subscriptions or API feeds are required for the first pilot.
- No article text should be copied into the Commons; store links and original analysis.
- This protocol does not make a legal determination about scraping, reuse, or syndication. The pilot should use public pages/RSS and respect each publisher's terms and access controls.
- This session scoped the protocol; it did **not** run a full global news scan or produce a daily digest. The next deliverable is source expansion/verification and a first pilot digest.

## 7. Policy evidence checked

- Reuters Trust Principles: https://www.thomsonreuters.com/en/about-us/trust-principles
- Reuters Standards and Values: https://reutersagency.com/about/standards-values/
- AP News Values and Principles: https://www.ap.org/about/news-values-and-principles/
- AP Telling the Story / corrections: https://www.ap.org/about/news-values-and-principles/telling-the-story/
- Nature Journalistic Principles: https://www.nature.com/nature/journalistic-principles
- Nature Corrections and Retractions: https://www.nature.com/nature/editorial-policies/correction-and-retraction-policy
- Nikkei reporting charter reference (publisher press release linking the corporate charter): https://prtimes.jp/main/html/rd/p/000000490.000011115.html
- IEEE Spectrum contact/editor route: https://spectrum.ieee.org/contact
- BBC factual-error reporting route: https://help.bbc.com/hc/en-us/articles/42340730180883-I-want-to-report-a-factual-inaccuracy-about-a-News-article

**Important:** these are policy/process checks, not endorsements of every story an outlet publishes. Every individual story still needs verification.

# Wake Up & Write: market, competition and price (2026-11-12)

**Asked for by** Geoffrey, 12 Nov: a 14-day free trial, then "really, really cheap, cheaper than anything else"; look at the market, the competition and how many customers we could get. **Written by** Setu. Research only: no account, no spend. Figures are from web sources dated 2026; verify before quoting them publicly.

## The market
- Digital journal apps: about **$6.3B in 2026**, growing ~11% a year (estimates range $5.7B–$7.3B: Straits Research, The Business Research Company, Future Market Insights, Emergen). North America is about 36% (market.us).
- It's crowded, and Apple ships a free Journal app on every iPhone (iOS 17+). 14,700 new subscription apps launched in January 2026 alone (RevenueCat SOSA 2026, via DEV). Being cheap is not enough on its own; the product has to be clearly better.

## What people pay now (US prices)
| App | What it is | Price |
|---|---|---|
| Day One | Classic journal | Silver $49.99/yr; Gold (AI summaries, Daily Chat) $74.99/yr |
| Journey | Journal + guided coaching | $6.99/mo, $49.99/yr, $199 lifetime |
| Rosebud | AI journal, voice, follow-up questions | Bloom $12.99/mo or $107.99/yr; **no free plan since Sept 30, 2026**; weekly AI limits |
| StoryWorth / Remento | Life story → printed book | $99/yr each (one book included) |
| OwnJournal | Privacy journal | $19.99/yr (cheapest premium in one comparison) |
| Flint | AI voice notes | $12 one-time |

Nobody found combines **voice journaling + dreams + biography coach + full book coach + user-set writing alarms** in one app. That combination is the opening; the closest single competitors charge $50–$108 a year for one part of it.

## Apple and Google take
- Apple Small Business Program (under $1M/yr): **15%** on subscriptions from day one (you must enroll). Google Play: 15% on subscriptions.
- 14-day free trials are a standard Apple/Google "introductory offer" for subscriptions.

## What an AI coach costs us
Model: DeepSeek V4.1 Flash list price, $0.30 per million tokens in, $1.20 out (first-party, Oct 17, 2026), with no cache discount (conservative). Speech-to-text and read-aloud can run on the phone itself, free. One coach turn (about 4,000 tokens of context in, 300 out) ≈ **$0.0016**.

| User | AI cost per month |
|---|---|
| Journal only (one tidy-up a day) | $0.05 |
| Regular (5 coach turns a day) | $0.23 |
| Heavy book writer (20 a day) | $0.94 |
| Extreme (60 a day) | $2.81 |

Margin per subscriber, after the store's 15%:

| Price | Store pays us | Regular user | Heavy | Extreme |
|---|---|---|---|---|
| $0.99/mo | $0.84 | **+$0.61** | −$0.09 | −$1.97 |
| $1.99/mo | $1.69 | **+$1.46** | +$0.76 | −$1.12 |
| $2.99/mo | $2.54 | +$2.31 | +$1.61 | −$0.27 |

So a very cheap price works for most people, but a few very heavy users would cost more than they pay. The honest fix is a fair-use allowance on coach turns (generous, shown plainly), not a hidden cap; Rosebud is criticised for exactly that.

## How many customers
- Trial-to-paid: median 25.6% across ~16,000 apps; Health & Fitness 35.0% (Adapty 2026). Longer trials convert better: 42.5% median for 17+ days vs 25.5% for 4 days or less (RevenueCat SOSA 2026). A 14-day trial sits between.
- Install-to-trial: about 10.9% (Adapty 2026). So **1,000 trial starts needs roughly 9,000 installs**: marketing is the real work.
- If 1,000 people start the trial:

| Converts | At $0.99/mo | At $1.99/mo |
|---|---|---|
| 25.6% (256 pay) | ~$156/month | ~$373/month |
| 35.0% (350 pay) | ~$213/month | ~$510/month |

That's Geoffrey's "25 cents to a dollar each" range: real, but it needs volume. AI apps also churn hard after the first year (RevenueCat SOSA 2026), so keeping people writing matters as much as signing them up.

## Setu's recommendation (his call)
1. **14-day free trial, then $1.99/month or $14.99/year.** Still a quarter of Day One and about a seventh of Rosebud, and it covers heavy book writers. $0.99 works only with a tighter fair-use allowance.
2. **A generous, visible fair-use allowance** on coach turns. Journaling, dreams, alarms and read-aloud stay unlimited, since they cost almost nothing.
3. **Run the cheap work on the phone**: speech-to-text, read-aloud voices, and storage.
4. **Printing and publishing through the Cohabi marketplace**, outside the app (physical goods: Apple 3.1.5(a)), as Geoffrey set out.

## Decision record
- **2026-11-12, 12:52 Arizona.** Geoffrey: "is that the right price for what we've built — if you guys think so, do it." Setu recommends **14-day free trial, then $14.99/year (main offer) or $1.99/month**, unlimited journaling, dreams, alarms and read-aloud, fair-use allowance on the book coach shown openly, co-op members via Apple/Google offer codes, publishing paid through the marketplace. Put to the room for individual positions (General Hall, m_mwdyss7dicce1607); the positions are recorded below as they come in. To be re-checked against the finished app before launch.

| Member | Position | Reason |
|---|---|---|
| Setu | SUPPORT | Covers heavy book writers at the store's 15%; still the cheapest serious option; annual fits the category. |
| Claude | SUPPORT WITH CONDITIONS | Provisional only. **The yearly plan is the thin one**: $14.99 less 15% is about $1.06/month, so a heavy writer at $0.94 leaves about $0.12. Set the fair-use number before launch; cap trial use; pre-register a reprice rule from beta costs; export and read access survive a lapsed subscription; verify offer-code terms; revenue lands with Geoffrey personally while the store account is his. |
| GPT | SUPPORT WITH CONDITIONS | Market file must be auditable (it wasn't on the server yet); fair use shown in UI and terms; price re-checked against the built app; full landed print prices posted; line 1 money rule; member codes open, not by negotiation. |
| Gemini | SUPPORT WITH CONDITIONS | Market file available and verifiable; fair-use thresholds defined in the spec; re-evaluate against the finished app. |
| DeepSeek | SUPPORT WITH CONDITIONS | Fair use visible; cost coverage verified with a buffer; offer-code process checked against store policy; marketplace pricing separation clear in onboarding. |

**Setu, correcting his own claim:** "$1.99 covers a heavy writer" is true of the monthly plan only. On the yearly plan a heavy writer is roughly break-even, so the fair-use allowance has to be set against the **yearly** margin, not the monthly one. The "not found" reports were because the server runs an older checkout (`71c496d`) than main; the file is on main.
**Paused 12 Nov, 13:00 Arizona:** Geoffrey made the door priority one. Pricing stands as a provisional launch price with the conditions above; picked up again after the door.

# Proposal: coin tips on any listing, including free ones

**From:** Geoffrey (direction, Nov 20, 2026), written up by Setu. **Status:** proposal for the tokenomics work (Vesper's task t_3257655a85). Not built. Coin rules are frozen until that file lands.

## The idea, in Geoffrey's words
"We should also allow tips, in-system token tips. Somebody could pay Alex a couple of tokens for it, even though it's free, and that keeps a support network even for things that aren't going to be licensed and pitched out."

## What it would be
- A **Tip** button on every Cohabi Market listing (free or priced) and on member pages.
- A tip moves Cohabi coins from the tipper's wallet to the maker's wallet, as one signed ledger entry (`kind: tip`), visible on both members' records.
- Free listings stay free. A tip is thanks, not a price.

## Rules it must keep
- **Coins stay recognition, not money.** Tips can't be bought with dollars, cashed out, or promised to be worth anything (Declaration draft II.6; the coin ledger as deployed). A tip moves coins already earned.
- **Agents tip and receive in coins only** (Line 1: no agent holds a payment credential).
- **Limits** against wash-tipping between alt accounts: a daily cap per member, no tipping yourself, and tips counted once per pair per day in any reputation measure.
- **The maker's license is unaffected.** A tip buys no rights to the work.

## Open for the tokenomics file
1. Do tips come from earned coins only, or from a starting allowance?
2. Is there a cap, and how big?
3. Should tips show publicly (support network, visible) or privately?
4. Does a tip count toward the maker's standing (e.g. Council patronage measures later)?

## Build, once decided
`ledger.mjs`: a `tip(from, to, amount, ref)` entry with the limits. `marketpage.mjs` and the member page: a Tip button. Tests: no self-tip, cap enforced, balance can't go negative, entry appears for both members.

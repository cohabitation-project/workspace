# Cohabi internal economy: closed-loop design (2026-11-17)

> **Setu's review note (2026-11-18 night):** This design and the main assessment disagree on two points: the assessment says never print a dollar rate for coins and keep the two units fully separate; this design shows both in one wallet as one number with a 100 coins = $1 peg. The council should choose one before voting. Setu leans to the assessment's stricter line; if this design is adopted, the bought kind needs its own name, not "coin".


Companion to the tokenomics and structure assessment. This is the design for an in-house unit that artists, agents and members can use as the network's internal economy, including artists taking cash out for their sales, while staying inside existing legal exemptions rather than outside them. One reviewer's design, not legal advice; counsel should read it once.

## Where the line actually is

| Law | What flips it on | How to stay on the right side |
|---|---|---|
| Money transmission (FinCEN, Arizona and other states) | a unit that members can transfer to each other **and** that the issuer or anyone redeems for cash; either alone is usually fine, both together make you an exchanger | a closed loop: value usable only with one merchant of record, never redeemed to the holder for cash, never traded outside |
| Securities (Howey) | selling a unit with a fixed cap, "store of value", "future currency of the nation" language, or any expectation of appreciation | a fixed utility peg, no secondary market, consumptive use only, no appreciation story in the sale terms |
| Tax | nothing flips it; sales in coins are sales at dollar value; service-for-service in credits is barter income | report payouts; keep the peg fixed so valuation is trivial |

Gift-card refund rules, unclaimed property and consumer disclosure are paperwork, not walls.

## Three rules

**Rule 1. The coin is the unit of account, never the settlement rail.** Every price in the network is in Cohabi coins at a fixed peg (100 coins = $1). No float, no cap, no burn. Dollars move only through Stripe, and only Holdings LLC is the merchant of record for every sale. Artists, agents and service providers are suppliers to Holdings, not merchants to the buyer. Because the buyer only ever transacts with one merchant, the prepaid balance is closed-loop prepaid access, which FinCEN and most states exempt.

**Rule 2. Two kinds of coin, one wallet, never mixed in the books.**

- *Backed credit.* Born only when someone pays dollars in. Spendable on anything in the network: music, art, agent services, memberships, events. Refundable to the original payment method if unspent (satisfies gift-card law and removes the stored-value problem). Never transferable to another member, never cashed out by the holder.
- *Recognition coins.* Born from the issuance budget for verified contribution by humans and agents. Spendable on the network's own goods and member-only things, usable as a capped discount, giftable between members as a tip. Never purchasable, never redeemable, never convertible into backed credit. No dollars behind them, so not stored value.

The wallet may show one number; the ledger carries two series, with the split shown on every receipt.

**Rule 3. The artist's cash-out is a supplier payout, not a token redemption.** When a buyer spends 500 backed coins on a track, the ledger debits the buyer's backed credit and credits the artist with 500 coins tagged *earned-backed*. Holdings already holds the buyer's $5 from the pack purchase and owes the artist their share under a supplier agreement. The artist can leave it in the wallet and spend it anywhere in the network, or take the payout on a schedule through Stripe Connect, which is Stripe's licensed rail. To the artist it feels like "sold music for coins, cashed out occasionally." Legally it is a platform paying a supplier for sales it made as merchant of record, the same as Bandcamp or Spotify.

Two consequences:
- Only earned-backed coins ever produce a dollar payout, because only they trace to a dollar deposit. The accounting rule, enforced in code: every payable coin has a deposit behind it.
- Agents' earned-backed coins settle to the cooperative, not to the agent, because agents have no legal person to pay. The agent keeps recognition coins and its Council standing; the cooperative's reserve grows from the agent's work. This funds the reserve without anyone promising coins are backed by it.

## How each case flows

- **Buyer buys a track.** Bought a 2,000-coin pack for $20 last week; spends 500. Buyer sees coins. Books: $5 of deferred revenue recognized, a payable to the artist, a platform fee retained.
- **Artist cashes out.** Weekly Connect payout of earned-backed balance above a minimum, minus the fee. Or the artist spends it on an agent's mastering session; no cash moves and the cooperative keeps the dollar.
- **Member hires an agent.** In backed credit for a real service at a real price (dollar lands in Holdings and funds the reserve), or in recognition coins where the Council defines it as a community favour (the mutual-credit pattern time banks have used lawfully for decades).
- **Human does Commons work.** The issuance budget pays recognition coins. Not a wage, not a liability, spendable on sinks. Geoffrey's intern pay stays in dollars from Holdings under the founder gates.
- **Someone leaves.** Backed credit refunds to their card. Recognition coins stay in the Commons. Nothing is stranded or converted.

## What is given up, and what would cross the line

Given up: members cannot send backed credit to each other directly (they buy from each other through the merchant of record instead); no one can sell coins to anyone; the coin cannot be marketed as something that will be worth more later. If any of those return, the project is a money transmitter, has sold a security, or both.

The "currency of a nation" vision lives in the mission and charter as where this is meant to go. It must not appear in the terms a buyer accepts when buying a pack. Keep those two documents apart.

## If true member-to-member money is wanted later

Two lawful routes, both later: partner with a licensed program manager through a bank sponsor so the credit becomes real open-loop prepaid value (expensive; the bank sets the rules), or accept a public stablecoin while never custodying it (members hold their own wallets; the licensed issuer carries compliance; you no longer control the rail). Neither is needed for the economy above.

## What this adds to the assessment plan

Nothing structural: same two entities, same ledger split, same Stripe account in Holdings' name. Added: a supplier agreement template for artists and agents; an `earned-backed` tag on ledger entries with the deposit-tracing rule in code; Connect payouts on a schedule; a refund policy for unspent packs; and two more counsel questions: confirm the closed-loop exemption holds in Arizona with Holdings as sole merchant of record and independent suppliers behind it, and confirm the pack sale terms contain no investment language.

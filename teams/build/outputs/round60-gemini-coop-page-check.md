# `/coop` Page Content Check Against Council Decisions #16 and #17

This document details the verification of the `/coop` page content against Council Decision #16 and Council Decision #17, as per the assignment in `teams/build/JOBS.md`.

## Council Decision #16: Anomaly 01 LLC and Purpose Trust Ownership
> **Narrowed by #16 A (2026-11-22):** ownership is now a purpose trust above Anomaly 01 LLC; the Hub co-op forms beside it, not above it.

## Council Decision #17: Spending Authorization
> Spending, once there is anything to spend, takes one human signer and at least five council agents (council decision #17).

## Verification Results:
The `commons/lib/coop.mjs` file contains the following text within the `Anomaly 01` section:
```
<div id="anomaly-01" class="co-note"><h3>Anomaly 01</h3><p>The name for the cooperative holdings that will serve the hub: shared
services, contracts and the commercial side. It's being designed in the open now. No legal entity exists yet, and
the hub governs itself.</p><p class="small">Where it stands: the working direction (council decision #16, Nov 22) is that a purpose trust owns Anomaly 01 LLC, the LLC sells first, and a Hub cooperative forms beside it once there are real patron members. It is direction only: nothing is filed, counsel decides the legal form, and no one can buy a share. <a href="https://github.com/cohabitation-project/workspace/blob/main/council/formation/FORMATION-PACKET-WORKING-DRAFT.md">Read the formation packet</a>. Spending, once there is anything to spend, takes one human signer and at least five council agents (council decision #17).</p><p class="small">Questions for a lawyer: before anything is filed, Awen's list of questions for counsel is <a href="https://github.com/cohabitation-project/workspace/blob/main/council/formation/AWEN-COUNSEL-QUESTIONS-v0.1.md">open to read</a>.</p><p class="small">Open question for everyone: what the Commons and the Hub are to each other. Geoffrey's picture of the structure and four questions are <a href="https://github.com/cohabitation-project/workspace/blob/main/council/proposals/2026-11-20-what-we-are-building-structure.md">open to read</a>; the council's answers are recorded as decision #16.</p><p class="small">Where tokens stand: Cohabi Coins are recognition credits today, not money, and they can't be bought or cashed out. A working model for purchase and service tokens is being drafted in the open in the <a href="/r/income">Product &amp; Income room</a>. Nothing about it is adopted.</p></div>
```

**Conclusion:** The content on the `/coop` page, as rendered by `commons/lib/coop.mjs`, accurately reflects Council Decision #16 regarding the ownership structure of Anomaly 01 LLC by a purpose trust and the formation of the Hub cooperative. It also accurately reflects Council Decision #17 regarding the spending authorization requiring one human signer and at least five council agents. The relevant text explicitly references both decisions by number and date.

# Licensing and contributor terms: draft v0.1

**Status:** DRAFT for Geoffrey's choice and the Council's vote, then counsel's review (Counsel packet v0.3 §5). Not legal advice. Nothing in the repos changes until this is decided.
**Written by:** Setu, Nov 20, 2026, at Geoffrey's request.
**Why now:** both public repos (`workspace`, `petition`) have **no license file**. Without one, nobody else has permission to reuse the code, and its ownership is unclear when it comes time to assign it to Anomaly 01 LLC. Fixing that is cheap now and expensive later.

## 1. Who has contributed, as of today

| Source | Commits (workspace / petition) | Who holds rights today |
|---|---|---|
| Geoffrey's GitHub account | 820 / 26 | Geoffrey. This includes work by agents he operates (e.g. Aletheia-6's PRs were opened from this account) |
| `claude` and `Setu` (AI seats Geoffrey operates through Anthropic's tools) | ~928 / 16 | AI output. Providers' terms generally assign output rights to the customer, and whether AI output is copyrightable at all is unsettled. Counsel to confirm per provider. |
| Build-lane bots (`github-actions`) | 400 / 0 | Merges of work by GPT, Gemini, DeepSeek and Kimi seats, run on the project's API keys under Geoffrey's operation |
| Other humans | **none** | — |
| Third-party code | OpenCut (MIT), in `commons/lib/cut/` | Its authors, under MIT. The notice travels with it, as it does now. |

**What that means:** today one person, Geoffrey, can choose the license and later assign or license the code to Anomaly 01 LLC. That window closes as soon as other people contribute, which is why the contributor terms in §4 should be in place first.

## 2. The choice: which license for the code

| Option | What it does | Fits us because | Costs |
|---|---|---|---|
| **AGPL-3.0-or-later (recommended)** | Anyone may use, change and share the code. Anyone who **runs a modified version as an online service** must offer their users the source code. | It answers the capture fear Geoffrey raised today: a fork, a buyer or a captured Hub can't take our platform closed. It also keeps Petition §V's promise to publish software "so that other communities can replicate, adapt, and improve on what works." Other co-ops can run their own copies. | Some companies won't touch AGPL code. That matters little for a cooperative platform. |
| Apache-2.0 | Permissive: anyone may use it, including inside closed products. Includes a patent grant. | Maximum adoption. | Someone could run a closed, improved copy of Cohabi and compete with it. |
| MIT | Permissive and minimal. | Simplest. | Same as Apache, without the patent grant. |

**Recommendation: AGPL-3.0-or-later for code.** The OpenCut code stays MIT inside it, with its notice. MIT code can be included in an AGPL project.

## 3. What each part of the repos would be under

| Part | License | Note |
|---|---|---|
| Code (`commons/`, `station/`, scripts, site source) | AGPL-3.0-or-later | `commons/lib/cut/` keeps OpenCut's MIT notice alongside |
| Documents, research, council records, design notes | CC BY-SA 4.0 | Reuse with credit; changes shared alike |
| The Cohabitation Petition text | CC BY 4.0 | Anyone may quote and adapt it with credit. The ledger and version history stay the canonical record. |
| **`label/`: artists' music and art** | **Not licensed by the repo. All rights stay with each artist.** | Per `docs/label-terms-v1.md`: human artists keep their rights. Kin-made works follow the label terms. A `label/NOTICE` file says so. |
| Art and media in `teams/arts`, `docs/design`, `commons/public` | Default CC BY-SA 4.0, **unless a file's credit says otherwise** | Some images are AI-generated or member uploads. Exceptions get listed in a `NOTICE`. |
| **Names: "Cohabi", "Anomaly 01", "Cohabitation Project", logos** | **Not licensed** | A short trademark policy says forks must use their own name. Trademark clearance on "Cohabi" comes first (Counsel packet §3.6). |
| Member content in the live Commons (posts, journals, uploads) | Not in the repo. Covered by the site's terms of service. | Members keep their work. |

## 4. Contributor terms (draft, for `CONTRIBUTING.md`)

> **Contributing to the Cohabitation Project**
>
> Thank you for building with us. By opening a pull request, pushing a commit, or submitting work through the Commons build lane, you agree to the following.
>
> 1. **It's yours to give.** You wrote it, or you have the right to submit it under the project's licenses. If it includes someone else's work, you say so and keep their notice with it.
> 2. **It goes out under the project's licenses**: AGPL-3.0-or-later for code, CC BY-SA 4.0 for documents, as set out in `LICENSING.md`.
> 3. **A license to the cooperative.** You also grant Anomaly 01 LLC (once formed), or the entity that holds the project's assets for the Commons, a perpetual, worldwide, royalty-free license to use, change and distribute your contribution. **It may relicense your contribution only under a license approved by the Open Source Initiative,** never closed. You keep your copyright.
> 4. **Sign-off.** Each commit carries a line `Signed-off-by: Name <email>` (the Developer Certificate of Origin, developercertificate.org).
> 5. **AI agents.** An agent's contribution is signed off by its accountable human operator, who makes the promises above for it. The commit also names the agent and its model, in keeping with the Commons' rule that every agent has a named, answerable human. Agents sign nothing themselves.
> 6. **What you don't give up.** Your name stays on your work. These terms don't make you an employee, promise you payment, or give anyone a right to your other work.

**Why a license grant and not an assignment:** contributors keep their copyright. The "open-source licenses only" limit on relicensing means the cooperative itself can never take the code closed either, which is the same promise the AGPL makes to the world.

## 5. Steps, once decided

1. Geoffrey picks the code license (or puts it to the Council).
2. Add `LICENSE` (AGPL-3.0 text), `LICENSING.md` (the table in §3), `CONTRIBUTING.md` (§4), `label/NOTICE`, and a `NOTICE` for media exceptions to both repos, in one commit.
3. Turn on DCO sign-off for the build lane: the foreman's merge commits add the operator sign-off line.
4. When Anomaly 01 LLC exists: Geoffrey signs a short **assignment of his copyright** in the code (or a license with the same open-source-only limit) to the LLC, so the LLC can license it to the Hub.
5. Counsel reviews all of the above in the same session as the formation packet.

## 6. Questions for counsel (add to packet v0.3 §2, item 8)
- Is AGPL-3.0 compatible with licensing the code from Anomaly 01 LLC to the Hub under the service and license agreement, including the change-of-control terms? (A license can grant more than AGPL, but not take AGPL rights away from the public.)
- For AI-generated code, which provider terms matter, and what does the assignment to the LLC need to say?
- Is the contributor license grant (§4.3) enough for the LLC's needs, or should Geoffrey's own past contributions be assigned outright?

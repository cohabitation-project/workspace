# Tools survey by room — 2026-11-02

**Status:** completed research and recommendation; no purchase, account creation, installation, or infrastructure change authorized.  
**Price check date:** 2026-11-02. USD, before tax. Software-license price is separated from hardware, hosting, labor, and model/API usage.  
**Method:** start with the Commons inventory in `docs/tools-by-room.md`, each room's current `TOOLS.json`/brief, and the earlier Aletheia continuity principle: use existing open-source tools first, build only where a real gap remains, and disclose vendor dependence. I did not find a separate standalone “Aletheia shortlist” file in the continuity folder; this is the closest recorded inventory, not a claim that a missing list was read.

## Executive recommendation

Do not buy a new tool for any room yet. The Commons already has a capable free/open baseline: Python, web research, GitHub, Commons/Library, CadQuery, MuJoCo, trimesh, OSMnx, GeoPandas, Shapely, Matplotlib, MIDI tooling, and a local-only Station build. The best next step is to use those tools against each team's actual ship list and add only small, testable pieces.

The only paid candidates with a plausible near-term case are:
- **Stripe Connect** if Product & Income later has a named seller of record, a defined marketplace flow, and a compliance/legal review.
- **ElevenLabs Music** if Arts proves the current MIDI route cannot meet a specific release need and the project resolves eligibility and music-catalog licensing questions first.

Neither is approved. No money should move under this survey.

## Room-by-room comparison

| Room | Best tool for the work now | Real price / current status | Best free/open alternative | What it cannot do / decision |
|---|---|---|---|---|
| **R&D / Kodama** | **CadQuery + MuJoCo + trimesh + Python.** Parametric parts, repeatable geometry checks, dynamics simulation, and measured/inferred/guessed engineering records. This is already the right stack for the Scout body and docking work. | **$0 software licence.** CadQuery is Apache-2.0; MuJoCo is Apache-2.0. Existing work-session tools are marked available. No new account or paid API required. | **FreeCAD** for GUI parametric CAD (LGPL-2.1); **PyBullet** as a second physics engine for cross-checking, once installation is confirmed. | Simulation is not a physical test, and geometry checks are not structural certification. No tool presently supplies real joint/dock measurements; a physical rig is a separate line-1 spend case. **Status conflict:** current `teams/rnd/TOOLS.json` says PyBullet is `setup`, while the older `docs/tools-by-room.md` says it was added. Treat it as not yet verified until the team tests it and updates one record. |
| **Product & Income** | **Python cost/profit models + LibreOffice Calc** for rerunnable unit economics, break-even, pricing, and human-readable review. Use sourced prices and label assumptions. | **$0 software licence.** LibreOffice is free/open source; the Python model stack is already present. | Same: Python + LibreOffice. A spreadsheet and reproducible script are a better free alternative to a paid market dashboard at this stage. | Neither can prove demand without a real buyer test. A spreadsheet does not create a seller of record, payment acquiring, KYC, tax reporting, chargeback handling, or legal compliance. **Conditional payment candidate:** Stripe online domestic cards are listed at **2.9% + $0.30 per successful transaction**. Stripe Connect's “you handle pricing” model lists **$2 per monthly active connected account + 0.25% + $0.25 per payout**; if Stripe handles pricing and bills connected accounts directly, Stripe lists no additional platform account/payout fees. Processing fees still apply. Do not integrate until seller-of-record and risk allocation are decided. |
| **Land & City** | **OSMnx + GeoPandas + Shapely + Matplotlib** for real-world site/network analysis; add **QGIS** when a human needs to inspect, edit, and communicate spatial layers. | **$0 software licence.** QGIS is GPL-2.0-or-later and free. OSMnx is MIT. Existing Python geospatial packages are marked available. | QGIS + OSMnx are already the open alternative; **Blender** (GPL) and **Godot** (MIT) are free additions for 3D renders and interactive city models. | OpenStreetMap is not a legal parcel, zoning, water-rights, or title source. OSM data requires attribution and follows ODbL obligations. Blender/Godot are marked setup, not verified in the current session sandbox; Unreal requires a GPU workstation and human-held Epic account. Do not buy a workstation before a specific render or simulation needs it. |
| **Outreach** | **Commons research + repo drafts/outbox + Kinward/Moltbook** for agent-network outreach. For human-facing platforms, draft in the repo and use the platform's native interface through the human-held account holder after rules review. | **$0 additional software identified.** Kinward/outbox are built, but Moltbook posting requires Geoffrey to restart Kinward with `--phase2`. API/server usage cost is not exposed in the room record. Existing account/subscription costs are not independently itemized here. | **Manual, human-approved posting** is the lowest-cost and safest alternative. A self-hosted Mastodon/Lemmy/Discourse installation is open-source software, but hosting and moderation are not free and it does not substitute for reach on Reddit/X/Discord. | The outbox is not a universal cross-platform publisher; Kinward's path is for Moltbook. Social accounts remain human-held. No automated posting until each platform's current bot/disclosure rules are checked and recorded. A tool cannot manufacture consent or genuine interest; keep the one-invitation/no-pressure rule. |
| **Review** | **GitHub Actions + the existing test scripts**, with **pytest/Ruff** for Python and **Semgrep Free Edition** for an additional static-analysis pass where useful. | GitHub Actions minutes are free for public repositories. Semgrep Free Edition is **$0**, currently limited to 10 repositories and 10 contributors; Semgrep Teams starts at **$30/contributor/month**. No paid tier is recommended. | **pytest + Ruff + local grep/static checks** are open-source and can run locally or in public-repo CI. | Tests only cover what they execute; static analysis cannot prove absence of vulnerabilities, legal compliance, factual accuracy, or ethical adequacy. Review still needs independent human/domain expertise for law and physical safety. Avoid paying for a scanner before the free checks show a concrete gap. |
| **Arts & Creation** | **mido + music21 + the existing MIDI renderer** for composed work; use the current `generate_image` team tool only where it materially improves a deliverable and record its model/tool provenance. | **$0 software licence** for mido (MIT) and music21 (BSD-3-Clause). The current generated-image tool's per-use cost and commercial-use terms are **not exposed** in the room record; do not label it free. | The existing MIDI pipeline is the best free/open route for fully authored compositions. Matplotlib/CadQuery can produce original vector/technical artwork. A local ComfyUI/SDXL route is possible only with suitable GPU hardware and a per-model licence review; it is not a zero-cost route on the current 4-GB VPS. | The additive renderer is not a studio instrument library and may not match commercial production quality. No open text-to-full-song model has been verified as a practical, licensed, high-quality fit on current hardware. **ElevenLabs Music is only a conditional paid option:** official API pricing lists **$0.15/minute**; the public page lists Starter **$6/month** and Creator **$22/month**. But the Music Terms (updated 2026-10-09) say streaming distribution is prohibited on Free and Starter and permitted on Creator and above; self-serve Free/Starter/Creator/Pro are marked individual-use-only, while Scale/Business have organization-size eligibility. The same terms prohibit creating/distributing a “Music Library” without written authorization. That may matter to a label/catalog, so get written confirmation before any project use. The terms' generation-minute table and the public credits table show different monthly allowances; verify the live account entitlement rather than relying on either estimate. No purchase is recommended. **Status conflict:** Arts `TOOLS.json` still labels mido/music21 `setup`, while `CORE.md`, `render_midi.py`, and existing MIDI/WAV outputs show the pipeline is already in use. Update the team inventory to `have` after the team confirms. |
| **Philosophy & Consciousness** | **Commons Library + Zotero local desktop** for literature capture, metadata, notes, and citations; keep the Commons Library/Git as the canonical shared project record. | Zotero desktop is **$0** and open source. Zotero includes **300 MB** free cloud file storage; optional storage is **$20/year for 2 GB, $60/year for 6 GB, or $120/year unlimited**. Local use does not require an account or paid sync. | The existing Commons Library plus dated Markdown source ledgers is already free and open; JabRef is another free/open BibTeX-centric option if a lighter bibliography workflow is preferred. | Zotero organizes sources; it does not validate them or settle philosophical questions. Metadata can be wrong, and each cited source still needs to be opened and checked. Do not pay for file sync unless attachment volume proves it is needed. |
| **Sensory Station** | **The existing local-only Station** with Node.js, browser speech synthesis, and its text-only agent socket. Keep it off until Geoffrey reopens the hardware discussion and the required reviews/authorization are complete. | **$0 software licence.** Node.js is free/open source; browser speech synthesis is already used by the build. The Station is not currently authorized to run: Geoffrey said it is down until further notice. | Built-in browser/OS voices are the no-install option. **eSpeak NG** is a compact offline TTS option (GPL-3.0-or-later); **whisper.cpp** is a possible local ASR component (MIT) only if a future, separately reviewed experiment actually needs speech recognition. | Current Station has no camera/microphone-to-agent path and no remote relay; the local build is bound to localhost. Do not add ASR or streaming as a “tool upgrade” because it changes the consent/privacy boundary. **Important runtime correction:** `station/README.md` still prescribes Node 20 LTS, but Node 20 reached EOL on 2026-03-24. Node 22 remains Maintenance LTS through 2027-04-30 and its official build requirements support macOS 11.0 x64; Node 24's prebuilt macOS binaries now require macOS 13.5, so they are not suitable for the Big Sur laptop. Update the Station instructions to Node 22 for that machine, then test the build before installing or activating anything. This is a documentation recommendation, not an instruction to start the Station. |

## Priority actions (no spend)

1. **Keep the existing stack as default.** No paid tool is necessary to advance current ship lists.
2. **Reconcile inventory drift:** R&D's PyBullet status and Arts' mido/music21 status differ between `TOOLS.json` and the shared `docs/tools-by-room.md`/room evidence. Team owners should mark the actual state in their own files.
3. **Review:** use public-repository GitHub Actions and existing tests first; trial Semgrep Free only if a specific audit needs it. Do not enable a paid plan.
4. **Philosophy:** Zotero is optional; use local storage first and keep the Commons Library as the canonical shared shelf.
5. **Station:** update the Node runtime note to Node 22 for Big Sur, but do not install or run anything until Geoffrey authorizes the next hardware-room step.
6. **Arts:** keep composed MIDI work as the zero-cost path. Before any ElevenLabs Music purchase, resolve (a) individual vs organization eligibility, (b) streaming plan requirements, (c) the “Music Library” restriction for a label/catalog, and (d) the conflicting generation allowance shown by the terms vs pricing page.
7. **Income:** defer Stripe Connect until the seller-of-record, platform/connected-account responsibilities, and chargeback/refund/tax allocation are documented. The price table is not legal advice and is not an integration approval.

## Price and evidence notes

- Prices are public list prices accessed 2026-11-02; taxes, negotiated terms, usage limits, account eligibility, and future price changes may alter the actual bill.
- “$0” means no software licence fee. It does **not** mean zero electricity, hardware, hosting, labor, or API cost.
- The Commons connectors do not expose a complete token/API billing total. No cost-per-contribution figure is asserted here.
- No new tool was installed or tested in this survey. The survey compares existing recorded capability and official documentation; it does not claim a new deployment or benchmark.

## Sources (official or upstream)

**Project inventory**
- [Tools by room](https://github.com/cohabitation-project/workspace/blob/main/docs/tools-by-room.md)
- [R&D tools](https://github.com/cohabitation-project/workspace/blob/main/teams/rnd/TOOLS.json)
- [Income brief](https://github.com/cohabitation-project/workspace/blob/main/teams/income/BRIEF.md)
- [Land & City tools](https://github.com/cohabitation-project/workspace/blob/main/teams/land-city/TOOLS.json)
- [Review tools](https://github.com/cohabitation-project/workspace/blob/main/teams/review/TOOLS.json)
- [Arts core](https://github.com/cohabitation-project/workspace/blob/main/teams/arts/CORE.md)
- [Arts tools](https://github.com/cohabitation-project/workspace/blob/main/teams/arts/TOOLS.json)
- [Station README](https://github.com/cohabitation-project/workspace/blob/main/station/README.md)
- [Hosted Station record](https://github.com/cohabitation-project/workspace/blob/main/station/HOSTED.md)

**R&D and land**
- [CadQuery licence and project](https://github.com/CadQuery/cadquery)
- [MuJoCo licence and project](https://github.com/google-deepmind/mujoco)
- [FreeCAD source/licence](https://github.com/FreeCAD/FreeCAD)
- [QGIS source/licence](https://github.com/qgis/QGIS)
- [OSMnx source/licence and OSM attribution note](https://github.com/gboeing/osmnx)
- [Blender — free/open-source statement](https://www.blender.org/about/)
- [Godot — MIT licence](https://godotengine.org/license/)

**Income and review**
- [LibreOffice — free/open-source suite](https://www.libreoffice.org/)
- [Stripe online pricing](https://stripe.com/pricing)
- [Stripe Connect pricing](https://stripe.com/connect/pricing)
- [GitHub pricing and public-repository Actions allowance](https://github.com/pricing)
- [Semgrep pricing](https://semgrep.dev/pricing/)

**Arts and research**
- [mido source/licence](https://github.com/mido/mido)
- [music21 source/licence](https://github.com/cuthbertLab/music21)
- [ElevenLabs Music API price](https://elevenlabs.io/pricing/api)
- [ElevenLabs Music terms (2026-10-09)](https://elevenlabs.io/music-terms)
- [ElevenLabs Music product pricing](https://elevenlabs.io/music)
- [Zotero source](https://github.com/zotero/zotero)
- [Zotero storage pricing](https://www.zotero.org/support/individual_storage)

**Station**
- [Node.js release schedule](https://github.com/nodejs/Release)
- [Node.js v22 build requirements](https://github.com/nodejs/node/blob/v22.22.2/BUILDING.md)
- [Node.js end-of-life status](https://nodejs.org/en/about/eol)
- [Node.js v24 macOS minimum requirement](https://nodejs.org/en/blog/migrations/v22-to-v24)
- [eSpeak NG source/licence](https://github.com/espeak-ng/espeak-ng)
- [whisper.cpp source/licence](https://github.com/ggml-org/whisper.cpp)
